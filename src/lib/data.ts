import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireCrew } from "@/lib/auth";
import { monthEnd, monthTsRange } from "@/lib/format";
import {
  num,
  type BookingSummary,
  type ClaimRow,
  type CrewRow,
  type EntryRow,
  type PayoutRow,
  type TimesheetRow,
} from "@/lib/types";

/**
 * All reads use the signed-in user's Supabase client, so row-level security
 * (SPEC.md) limits every query to the crew member's own rows.
 */

const db = cache(createClient);

/** The signed-in crew member's row; loaded once per request by the auth guard. */
export const getMe = (): Promise<CrewRow> => requireCrew();

const normEntry = (e: EntryRow): EntryRow => ({ ...e, hours: num(e.hours), rate: num(e.rate) });
const normClaim = (c: ClaimRow): ClaimRow => ({ ...c, amount: num(c.amount) });
const normPayout = (p: PayoutRow): PayoutRow => ({
  ...p,
  hours_pay: num(p.hours_pay),
  claims_total: num(p.claims_total),
  total: num(p.total),
});

/** Booking id → "Post-reno clean" etc. from booking_items.item_label ("Service · Variant"). */
async function bookingTitles(ids: string[]): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  if (ids.length === 0) return titles;
  const supabase = await db();
  const { data } = await supabase.from("booking_items").select("booking_id, item_label").in("booking_id", ids);
  for (const row of (data ?? []) as { booking_id: string; item_label: string }[]) {
    const service = row.item_label.split(" · ")[0]!.trim();
    const prev = titles.get(row.booking_id);
    if (!prev) titles.set(row.booking_id, service);
    else if (!prev.split(", ").includes(service)) titles.set(row.booking_id, `${prev}, ${service}`);
  }
  return titles;
}

export async function bookingSummaries(ids: string[]): Promise<Map<string, BookingSummary>> {
  const out = new Map<string, BookingSummary>();
  if (ids.length === 0) return out;
  const supabase = await db();
  const [{ data }, titles] = await Promise.all([
    supabase.from("bookings").select("id, scheduled_at, address").in("id", ids),
    bookingTitles(ids),
  ]);
  for (const b of (data ?? []) as { id: string; scheduled_at: string; address: string }[]) {
    out.set(b.id, { ...b, title: titles.get(b.id) ?? "Booking" });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Timesheet
// ---------------------------------------------------------------------------

export interface TimesheetView {
  month: string;
  timesheet: TimesheetRow | null;
  entries: (EntryRow & { booking: BookingSummary | null })[];
  toLog: BookingSummary[];
}

export async function getTimesheet(month: string): Promise<TimesheetView> {
  const me = await getMe();
  const supabase = await db();
  const { start, end } = monthTsRange(month);

  const [{ data: ts }, { data: toLogRows }] = await Promise.all([
    supabase.from("timesheets").select("*").eq("crew_id", me.id).eq("month", month).maybeSingle<TimesheetRow>(),
    supabase
      .from("my_bookings_to_log")
      .select("id, scheduled_at, address, status")
      .gte("scheduled_at", start)
      .lt("scheduled_at", end)
      .neq("status", "cancelled")
      .order("scheduled_at"),
  ]);

  let entries: EntryRow[] = [];
  if (ts) {
    const { data } = await supabase
      .from("timesheet_entries")
      .select("*")
      .eq("timesheet_id", ts.id)
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false });
    entries = ((data ?? []) as EntryRow[]).map(normEntry);
  }

  const toLogBase = (toLogRows ?? []) as { id: string; scheduled_at: string; address: string }[];
  const [titles, entryBookings] = await Promise.all([
    bookingTitles(toLogBase.map((b) => b.id)),
    bookingSummaries([...new Set(entries.map((e) => e.booking_id).filter(Boolean))] as string[]),
  ]);

  return {
    month,
    timesheet: ts ?? null,
    entries: entries.map((e) => ({ ...e, booking: e.booking_id ? entryBookings.get(e.booking_id) ?? null : null })),
    toLog: toLogBase.map((b) => ({ id: b.id, scheduled_at: b.scheduled_at, address: b.address, title: titles.get(b.id) ?? "Booking" })),
  };
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export async function getClaims(month: string): Promise<ClaimRow[]> {
  const me = await getMe();
  const supabase = await db();
  const { data } = await supabase
    .from("claims")
    .select("*")
    .eq("crew_id", me.id)
    .gte("claim_date", month)
    .lte("claim_date", monthEnd(month))
    .order("claim_date", { ascending: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as ClaimRow[]).map(normClaim);
}

// ---------------------------------------------------------------------------
// History & payslips (paid months only)
// ---------------------------------------------------------------------------

export interface PaidMonth {
  payout: PayoutRow;
  timesheet: { hours: number; jobs: number; pay: number } | null;
  claims: ClaimRow[];
}

export async function getPaidMonths(opts: { from?: string | null; to?: string | null } = {}): Promise<PaidMonth[]> {
  const me = await getMe();
  const supabase = await db();
  let q = supabase.from("payouts").select("*").eq("crew_id", me.id).not("paid_at", "is", null).order("month", { ascending: false });
  if (opts.from) q = q.gte("month", opts.from);
  if (opts.to) q = q.lte("month", opts.to);
  const { data } = await q;
  const payouts = ((data ?? []) as PayoutRow[]).map(normPayout);
  if (payouts.length === 0) return [];

  const months = payouts.map((p) => p.month);
  const oldest = months[months.length - 1]!;
  const newest = months[0]!;
  const [{ data: sheets }, { data: claims }] = await Promise.all([
    supabase.from("timesheets").select("id, month").eq("crew_id", me.id).eq("status", "paid").in("month", months),
    supabase
      .from("claims")
      .select("*")
      .eq("crew_id", me.id)
      .eq("status", "paid")
      .gte("claim_date", oldest)
      .lte("claim_date", monthEnd(newest))
      .order("claim_date", { ascending: false }),
  ]);

  const sheetByMonth = new Map((sheets ?? []).map((s) => [s.month as string, s.id as string]));
  const totals = new Map<string, { hours: number; jobs: number; pay: number }>();
  if (sheetByMonth.size) {
    const { data: entries } = await supabase
      .from("timesheet_entries")
      .select("timesheet_id, hours, rate, booking_id")
      .in("timesheet_id", [...sheetByMonth.values()]);
    for (const e of entries ?? []) {
      const t = totals.get(e.timesheet_id) ?? { hours: 0, jobs: 0, pay: 0 };
      t.hours += num(e.hours);
      t.pay += num(e.hours) * num(e.rate);
      t.jobs += 1;
      totals.set(e.timesheet_id, t);
    }
  }

  const paidClaims = ((claims ?? []) as ClaimRow[]).map(normClaim);
  return payouts.map((payout) => {
    const sheetId = sheetByMonth.get(payout.month);
    return {
      payout,
      timesheet: sheetId ? totals.get(sheetId) ?? { hours: 0, jobs: 0, pay: 0 } : null,
      claims: paidClaims.filter((c) => c.claim_date.slice(0, 7) === payout.month.slice(0, 7)),
    };
  });
}

// ---------------------------------------------------------------------------
// Assigned jobs (History tab)
// ---------------------------------------------------------------------------

export interface AssignedJob extends BookingSummary {
  status: "scheduled" | "completed" | "cancelled";
  hours: number | null; // null = not logged yet
  pay: number;
}

/** Every booking assigned to the signed-in crew member since `from` (YYYY-MM-01), newest first. */
export async function getAssignedJobs(from: string | null): Promise<AssignedJob[]> {
  const me = await getMe();
  const supabase = await db();
  const { data: links } = await supabase.from("booking_crew").select("booking_id").eq("crew_id", me.id);
  const ids = (links ?? []).map((l) => l.booking_id as string);
  if (!ids.length) return [];

  let q = supabase.from("bookings").select("id, scheduled_at, address, status").in("id", ids).neq("status", "cancelled").order("scheduled_at", { ascending: false });
  if (from) q = q.gte("scheduled_at", `${from}T00:00:00+08:00`);
  const { data: rows } = await q;
  const bookings = (rows ?? []) as { id: string; scheduled_at: string; address: string; status: AssignedJob["status"] }[];
  if (!bookings.length) return [];

  const [titles, { data: entries }] = await Promise.all([
    bookingTitles(bookings.map((b) => b.id)),
    supabase
      .from("timesheet_entries")
      .select("booking_id, hours, rate, timesheets!inner(crew_id)")
      .in("booking_id", bookings.map((b) => b.id))
      .eq("timesheets.crew_id", me.id),
  ]);
  const logged = new Map<string, { hours: number; pay: number }>();
  for (const e of entries ?? []) {
    const t = logged.get(e.booking_id as string) ?? { hours: 0, pay: 0 };
    t.hours += num(e.hours);
    t.pay += num(e.hours) * num(e.rate);
    logged.set(e.booking_id as string, t);
  }
  return bookings.map((b) => ({
    ...b,
    title: titles.get(b.id) ?? "Booking",
    hours: logged.get(b.id)?.hours ?? null,
    pay: logged.get(b.id)?.pay ?? 0,
  }));
}
