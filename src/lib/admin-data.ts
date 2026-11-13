import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { bookingSummaries } from "@/lib/data";
import { currentMonth, monthEnd, sgDate } from "@/lib/format";
import {
  num,
  type BookingSummary,
  type ClaimRow,
  type CrewRow,
  type EntryRow,
  type PayoutRow,
  type TimesheetRow,
  type TimesheetStatus,
} from "@/lib/types";

/**
 * Reads for the admin screens. They use the admin's own Supabase client:
 * the RLS policies give an active admin (is_admin()) access to every row.
 */

const db = cache(async () => {
  await requireAdmin();
  return createClient();
});

export interface AdminCrew extends CrewRow {
  paynow_updated_at: string | null;
  created_at: string;
}

type Totals = { hours: number; pay: number; jobs: number };
const ZERO: Totals = { hours: 0, pay: 0, jobs: 0 };

/** Hours, pay and job count per timesheet id. */
async function entryTotals(ids: string[]): Promise<Map<string, Totals>> {
  const out = new Map<string, Totals>();
  if (!ids.length) return out;
  const supabase = await db();
  const { data } = await supabase.from("timesheet_entries").select("timesheet_id, hours, rate").in("timesheet_id", ids);
  for (const e of data ?? []) {
    const t = out.get(e.timesheet_id) ?? { ...ZERO };
    t.hours += num(e.hours);
    t.pay += num(e.hours) * num(e.rate);
    t.jobs += 1;
    out.set(e.timesheet_id, t);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Crew
// ---------------------------------------------------------------------------

export const getCrewList = cache(async (): Promise<AdminCrew[]> => {
  const supabase = await db();
  const { data, error } = await supabase.from("crew").select("*").order("full_name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as AdminCrew[]).map((c) => ({ ...c, hourly_rate: num(c.hourly_rate) }));
});

/** Sidebar badges: submitted timesheets and pending claims, all months. */
export const getBadges = cache(async () => {
  const supabase = await db();
  const [{ count: timesheets }, { count: claims }] = await Promise.all([
    supabase.from("timesheets").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return { timesheets: timesheets ?? 0, claims: claims ?? 0 };
});

// ---------------------------------------------------------------------------
// Timesheets
// ---------------------------------------------------------------------------

export interface AdminTimesheet extends TimesheetRow {
  crew: Pick<CrewRow, "id" | "full_name">;
  totals: Totals;
}

export async function getTimesheetsForMonth(month: string): Promise<AdminTimesheet[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("timesheets")
    .select("*, crew(id, full_name)")
    .eq("month", month)
    .order("submitted_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as AdminTimesheet[];
  const totals = await entryTotals(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, totals: totals.get(r.id) ?? { ...ZERO } }));
}

export interface TimesheetDetail extends AdminTimesheet {
  entries: (EntryRow & { booking: BookingSummary | null })[];
}

export async function getTimesheetDetail(id: string): Promise<TimesheetDetail | null> {
  const supabase = await db();
  const { data: ts } = await supabase.from("timesheets").select("*, crew(id, full_name)").eq("id", id).maybeSingle();
  if (!ts) return null;
  const { data } = await supabase.from("timesheet_entries").select("*").eq("timesheet_id", id).order("work_date", { ascending: false });
  const entries = ((data ?? []) as EntryRow[]).map((e) => ({ ...e, hours: num(e.hours), rate: num(e.rate) }));
  const bookings = await bookingSummaries([...new Set(entries.map((e) => e.booking_id).filter(Boolean))] as string[]);
  const totals = entries.reduce((t, e) => ({ hours: t.hours + e.hours, pay: t.pay + e.hours * e.rate, jobs: t.jobs + 1 }), { ...ZERO });
  return {
    ...(ts as AdminTimesheet),
    totals,
    entries: entries.map((e) => ({ ...e, booking: e.booking_id ? bookings.get(e.booking_id) ?? null : null })),
  };
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export interface AdminClaim extends ClaimRow {
  crew: Pick<CrewRow, "id" | "full_name">;
}

export async function getClaimsForMonth(month: string): Promise<AdminClaim[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("claims")
    .select("*, crew(id, full_name)")
    .gte("claim_date", month)
    .lte("claim_date", monthEnd(month))
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as AdminClaim[]).map((c) => ({ ...c, amount: num(c.amount) }));
}

export async function getClaimDetail(id: string): Promise<(AdminClaim & { receiptUrl: string | null }) | null> {
  const supabase = await db();
  const { data } = await supabase.from("claims").select("*, crew(id, full_name)").eq("id", id).maybeSingle();
  if (!data) return null;
  const claim = { ...(data as AdminClaim), amount: num(data.amount) };
  let receiptUrl: string | null = null;
  if (claim.receipt_path) {
    const { data: signed } = await supabase.storage.from("receipts").createSignedUrl(claim.receipt_path, 600);
    receiptUrl = signed?.signedUrl ?? null;
  }
  return { ...claim, receiptUrl };
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

export type PayoutState = "paid" | "ready" | "waiting" | "nothing";

export interface PayoutLine {
  crew: AdminCrew;
  timesheet: (TimesheetRow & { totals: Totals }) | null;
  hoursPay: number; // approved (or paid) hours pay
  claimsApproved: number; // approved (or paid) claims
  claimsPending: number;
  payout: PayoutRow | null;
  state: PayoutState;
  /** Status shown in the table */
  status: TimesheetStatus | "pending";
}

/** One line per crew member with anything in the month, using SPEC.md "Payout logic". */
export async function getPayoutLines(month: string): Promise<PayoutLine[]> {
  const supabase = await db();
  const [crew, { data: sheets }, { data: claims }, { data: payouts }] = await Promise.all([
    getCrewList(),
    supabase.from("timesheets").select("*").eq("month", month),
    supabase.from("claims").select("crew_id, amount, status").gte("claim_date", month).lte("claim_date", monthEnd(month)),
    supabase.from("payouts").select("*").eq("month", month),
  ]);
  const ts = (sheets ?? []) as TimesheetRow[];
  const totals = await entryTotals(ts.map((t) => t.id));

  const lines: PayoutLine[] = [];
  for (const c of crew) {
    const sheet = ts.find((t) => t.crew_id === c.id);
    const mine = (claims ?? []).filter((x) => x.crew_id === c.id);
    const payout = ((payouts ?? []) as PayoutRow[]).find((p) => p.crew_id === c.id) ?? null;
    const sheetTotals = sheet ? totals.get(sheet.id) ?? { ...ZERO } : null;
    if (!payout && (!sheet || (sheet.status === "draft" && !sheetTotals?.jobs)) && mine.length === 0) continue;

    const approvedSheet = sheet && (sheet.status === "approved" || sheet.status === "paid");
    const hoursPay = approvedSheet ? sheetTotals!.pay : 0;
    const claimsApproved = mine.filter((x) => x.status === "approved" || x.status === "paid").reduce((s, x) => s + num(x.amount), 0);
    const claimsPending = mine.filter((x) => x.status === "pending").reduce((s, x) => s + num(x.amount), 0);

    let state: PayoutState;
    if (payout?.paid_at) state = "paid";
    else if (sheet && (sheet.status === "submitted" || sheet.status === "draft" || sheet.status === "rejected") && sheetTotals?.jobs) state = "waiting";
    else if (claimsPending > 0 && !approvedSheet && claimsApproved === 0) state = "waiting";
    else if (hoursPay + claimsApproved > 0) state = "ready";
    else state = "nothing";

    lines.push({
      crew: c,
      timesheet: sheet ? { ...sheet, totals: sheetTotals! } : null,
      hoursPay: payout?.paid_at ? num(payout.hours_pay) : hoursPay,
      claimsApproved: payout?.paid_at ? num(payout.claims_total) : claimsApproved,
      claimsPending,
      payout: payout ? { ...payout, hours_pay: num(payout.hours_pay), claims_total: num(payout.claims_total), total: num(payout.total) } : null,
      state,
      status: payout?.paid_at ? "paid" : sheet?.status ?? (claimsPending ? "pending" : "approved"),
    });
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export type AttentionItem =
  | { kind: "timesheet"; id: string; month: string; crew: string; hours: number; amount: number }
  | { kind: "claim"; id: string; month: string; crew: string; label: string; amount: number; date: string };

export async function getOverview() {
  const supabase = await db();
  const month = currentMonth();
  const year = sgDate().slice(0, 4);

  const [{ data: subSheets }, { data: pendingClaims }, { data: paidYear }, lines, { data: changes }, { data: recentSubs }] = await Promise.all([
    supabase.from("timesheets").select("id, month, submitted_at, crew(full_name)").eq("status", "submitted").order("submitted_at"),
    supabase.from("claims").select("id, category, description, amount, claim_date, created_at, crew(full_name)").eq("status", "pending").order("created_at"),
    supabase.from("payouts").select("total").not("paid_at", "is", null).gte("month", `${year}-01-01`).lte("month", `${year}-12-01`),
    getPayoutLines(month),
    supabase.from("paynow_changes").select("changed_at, crew:crew!paynow_changes_crew_id_fkey(full_name)").order("changed_at", { ascending: false }).limit(5),
    supabase.from("timesheets").select("month, submitted_at, crew(full_name)").not("submitted_at", "is", null).order("submitted_at", { ascending: false }).limit(5),
  ]);

  const sheetTotals = await entryTotals((subSheets ?? []).map((s) => s.id as string));
  const name = (c: unknown) => (Array.isArray(c) ? c[0]?.full_name : (c as { full_name?: string } | null)?.full_name) ?? "Crew";

  const attention: AttentionItem[] = [
    ...(subSheets ?? []).map((s) => ({
      kind: "timesheet" as const,
      id: s.id as string,
      month: s.month as string,
      crew: name(s.crew),
      hours: sheetTotals.get(s.id as string)?.hours ?? 0,
      amount: sheetTotals.get(s.id as string)?.pay ?? 0,
    })),
    ...(pendingClaims ?? []).map((c) => ({
      kind: "claim" as const,
      id: c.id as string,
      month: `${(c.claim_date as string).slice(0, 7)}-01`,
      crew: name(c.crew),
      label: c.category === "others" && c.description ? `Others · ${c.description}` : c.category === "food" ? "Food" : "Transport",
      amount: num(c.amount),
      date: c.claim_date as string,
    })),
  ];

  const ready = lines.filter((l) => l.state === "ready");
  const recent = [
    ...(changes ?? []).map((c) => ({ text: `${name(c.crew)} updated PayNow details`, at: c.changed_at as string })),
    ...(recentSubs ?? []).map((s) => ({ text: `${name(s.crew)} submitted ${new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(`${s.month}T00:00:00Z`))} timesheet`, at: s.submitted_at as string })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  return {
    month,
    year,
    timesheetsToReview: subSheets?.length ?? 0,
    claimsToReview: pendingClaims?.length ?? 0,
    claimsPendingTotal: (pendingClaims ?? []).reduce((s, c) => s + num(c.amount), 0),
    dueToPay: ready.reduce((s, l) => s + l.hoursPay + l.claimsApproved, 0),
    dueCrew: ready.length,
    paidThisYear: (paidYear ?? []).reduce((s, p) => s + num(p.total), 0),
    attention,
    payoutCard: {
      approved: ready.reduce((s, l) => s + l.hoursPay + l.claimsApproved, 0),
      waiting: lines.filter((l) => l.timesheet && l.timesheet.status === "submitted").reduce((s, l) => s + (l.timesheet?.totals.pay ?? 0), 0),
      claimsPending: lines.reduce((s, l) => s + l.claimsPending, 0),
    },
    recent,
  };
}
