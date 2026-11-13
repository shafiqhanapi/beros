"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyPaid } from "@/lib/notifications";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminClient, hasServiceRole } from "@/lib/supabase/admin";
import { bookingSummaries } from "@/lib/data";
import { isSgMobile, monthEnd, toMonth } from "@/lib/format";
import { renderPayslip } from "@/lib/payslip";
import { CLAIM_LABEL, num, type ClaimRow, type EntryRow } from "@/lib/types";

/**
 * Admin server actions. Writes go through the admin's own Supabase client,
 * where the RLS policies allow an active admin (is_admin()) to change any row.
 * The service-role client is used only where SPEC.md's policies can't help:
 * creating auth users (invites), blocking logins, and the PayNow audit log.
 */

export type ActionResult = { error?: string; ok?: string };
const fail = (error: string): ActionResult => ({ error });

async function admin() {
  const me = await requireAdmin();
  return { me, supabase: await createClient() };
}

const refreshAll = () => revalidatePath("/admin", "layout");

// ---------------------------------------------------------------------------
// Timesheets
// ---------------------------------------------------------------------------

export async function approveTimesheet(id: string): Promise<ActionResult> {
  const { supabase } = await admin();
  const { data, error } = await supabase
    .from("timesheets")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reject_reason: null })
    .eq("id", id)
    .eq("status", "submitted")
    .select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("This timesheet is no longer waiting for review.");
  // TODO(Phase 4): email the crew member "Payout will be made within the next 24 to 48 hours".
  refreshAll();
  return {};
}

export async function rejectTimesheet(id: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) return fail("Give a short reason so the crew member can fix it.");
  const { supabase } = await admin();
  const { data, error } = await supabase
    .from("timesheets")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reject_reason: reason.trim() })
    .eq("id", id)
    .eq("status", "submitted")
    .select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("This timesheet is no longer waiting for review.");
  // TODO(Phase 4): email the crew member the reason.
  refreshAll();
  return {};
}

export async function approveAllTimesheets(monthInput: string): Promise<ActionResult> {
  const month = toMonth(monthInput);
  if (!month) return fail("Pick a month.");
  const { supabase } = await admin();
  const { data, error } = await supabase
    .from("timesheets")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reject_reason: null })
    .eq("month", month)
    .eq("status", "submitted")
    .select("id");
  if (error) return fail(error.message);
  refreshAll();
  return { ok: `${data?.length ?? 0} approved` };
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export async function approveClaim(id: string): Promise<ActionResult> {
  const { supabase } = await admin();
  const { data, error } = await supabase
    .from("claims")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reject_reason: null })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("This claim is no longer pending.");
  refreshAll();
  return {};
}

export async function rejectClaim(id: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) return fail("Give a short reason so the crew member can fix it.");
  const { supabase } = await admin();
  const { data, error } = await supabase
    .from("claims")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), reject_reason: reason.trim() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("This claim is no longer pending.");
  refreshAll();
  return {};
}

export async function approveAllClaims(monthInput: string): Promise<ActionResult> {
  const month = toMonth(monthInput);
  if (!month) return fail("Pick a month.");
  const { supabase } = await admin();
  const { data, error } = await supabase
    .from("claims")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reject_reason: null })
    .gte("claim_date", month)
    .lte("claim_date", monthEnd(month))
    .eq("status", "pending")
    .select("id");
  if (error) return fail(error.message);
  refreshAll();
  return { ok: `${data?.length ?? 0} approved` };
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

/**
 * Mark a crew member's month as Paid: records the payout, generates the
 * payslip PDF into the private payslips bucket, and marks the approved
 * timesheet and claims as paid. Pending and rejected items are excluded.
 */
export async function markPaid(crewId: string, monthInput: string): Promise<ActionResult> {
  const month = toMonth(monthInput);
  if (!month) return fail("Pick a month.");
  const { supabase } = await admin();

  const [{ data: crew }, { data: sheet }, { data: claimRows }, { data: existing }] = await Promise.all([
    supabase.from("crew").select("id, full_name, paynow_name, paynow_phone").eq("id", crewId).single(),
    supabase.from("timesheets").select("*").eq("crew_id", crewId).eq("month", month).maybeSingle(),
    supabase.from("claims").select("*").eq("crew_id", crewId).eq("status", "approved").gte("claim_date", month).lte("claim_date", monthEnd(month)).order("claim_date"),
    supabase.from("payouts").select("paid_at").eq("crew_id", crewId).eq("month", month).maybeSingle(),
  ]);
  if (!crew) return fail("Crew member not found.");
  if (existing?.paid_at) return fail("This month is already marked as paid.");
  if (sheet && sheet.status === "submitted") return fail("Approve or reject the timesheet first.");

  let entries: (EntryRow & { label: string })[] = [];
  if (sheet && sheet.status === "approved") {
    const { data } = await supabase.from("timesheet_entries").select("*").eq("timesheet_id", sheet.id).order("work_date");
    const rows = ((data ?? []) as EntryRow[]).map((e) => ({ ...e, hours: num(e.hours), rate: num(e.rate) }));
    const bookings = await bookingSummaries([...new Set(rows.map((e) => e.booking_id).filter(Boolean))] as string[]);
    entries = rows.map((e) => {
      const b = e.booking_id ? bookings.get(e.booking_id) : null;
      return { ...e, label: b ? `${b.title} · ${b.address}` : `Admin matters${e.note ? ` · ${e.note}` : ""}` };
    });
  }
  const claims = ((claimRows ?? []) as ClaimRow[]).map((c) => ({ ...c, amount: num(c.amount) }));
  const hoursPay = Math.round(entries.reduce((s, e) => s + e.hours * e.rate, 0) * 100) / 100;
  const claimsTotal = Math.round(claims.reduce((s, c) => s + c.amount, 0) * 100) / 100;
  if (hoursPay + claimsTotal <= 0) return fail("Nothing approved to pay for this month.");

  const paidAt = new Date().toISOString();
  const number = `BRS-${month.slice(0, 7).replace("-", "")}-${crewId.slice(0, 4).toUpperCase()}`;
  const path = `${crewId}/${month.slice(0, 7)}.pdf`;

  const pdf = await renderPayslip({
    number,
    crewName: crew.full_name as string,
    month,
    paidAt,
    jobs: entries.map((e) => ({ date: e.work_date, label: e.label, hours: e.hours, rate: e.rate })),
    claims: claims.map((c) => ({
      date: c.claim_date,
      label: c.category === "others" && c.description ? `Others · ${c.description}` : CLAIM_LABEL[c.category],
      amount: c.amount,
    })),
  });
  const { error: upErr } = await supabase.storage.from("payslips").upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upErr) return fail(`Couldn't save the payslip PDF: ${upErr.message}`);

  const { data: payout, error: payErr } = await supabase
    .from("payouts")
    .upsert(
      { crew_id: crewId, month, hours_pay: hoursPay, claims_total: claimsTotal, payslip_number: number, payslip_path: path, paid_at: paidAt },
      { onConflict: "crew_id,month" },
    )
    .select("id")
    .single();
  if (payErr || !payout) return fail(payErr?.message ?? "Couldn't record the payout.");

  if (sheet && sheet.status === "approved") {
    await supabase.from("timesheets").update({ status: "paid", paid_at: paidAt }).eq("id", sheet.id);
  }
  if (claims.length) {
    await supabase.from("claims").update({ status: "paid", paid_at: paidAt }).in("id", claims.map((c) => c.id));
  }
  const paynow = crew.paynow_phone ? `${crew.paynow_name ?? crew.full_name} (••${String(crew.paynow_phone).slice(-4)})` : null;
  after(() =>
    notifyPaid({ crewId, crewName: crew.full_name as string, month, hoursPay, claimsTotal, payoutId: payout.id as string, payslipNumber: number, paynow }),
  );
  refreshAll();
  return { ok: "Marked as paid" };
}

// ---------------------------------------------------------------------------
// Crew
// ---------------------------------------------------------------------------

async function siteOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `https://${host}` : "https://crew.beros.online";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface CrewInput {
  fullName: string;
  email?: string;
  phone: string;
  hourlyRate: number;
  startDate: string;
}

function validateCrew(input: CrewInput, needEmail: boolean): string | null {
  if (!input.fullName.trim()) return "Enter the crew member's full name";
  if (needEmail && !EMAIL_RE.test(input.email?.trim() ?? "")) return "Enter a valid email address";
  if (!isSgMobile(input.phone)) return "Enter a valid 8-digit Singapore mobile number";
  if (!(Number(input.hourlyRate) > 0)) return "Enter a rate above $0";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) return "Pick a start date";
  return null;
}

export async function inviteCrew(input: CrewInput): Promise<ActionResult> {
  const invalid = validateCrew(input, true);
  if (invalid) return fail(invalid);
  const { supabase } = await admin();
  if (!hasServiceRole) return fail("Inviting crew needs SUPABASE_SERVICE_ROLE_KEY set in Vercel. See the setup notes.");
  const email = input.email!.trim().toLowerCase();

  const { data: taken } = await supabase.from("crew").select("id").ilike("email", email).maybeSingle();
  if (taken) return fail("This email is already in use");

  const { data, error } = await adminClient().auth.admin.inviteUserByEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/accept?next=/reset-password`,
    data: { full_name: input.fullName.trim() },
  });
  if (error || !data.user) {
    return fail(
      /already|registered|exists/i.test(error?.message ?? "")
        ? "This email already has a login. Ask them to sign in, or remove the old user in Supabase first."
        : `Couldn't send the invite: ${error?.message ?? "unknown error"}`,
    );
  }

  const { error: insErr } = await supabase.from("crew").insert({
    id: data.user.id,
    full_name: input.fullName.trim(),
    email,
    phone: input.phone,
    hourly_rate: Number(input.hourlyRate),
    start_date: input.startDate,
    role: "crew",
    status: "invited",
  });
  if (insErr) {
    await adminClient().auth.admin.deleteUser(data.user.id);
    return fail(insErr.message);
  }
  refreshAll();
  return { ok: `Invite sent to ${email}` };
}

export async function resendInvite(crewId: string): Promise<ActionResult> {
  const { supabase } = await admin();
  if (!hasServiceRole) return fail("Resending invites needs SUPABASE_SERVICE_ROLE_KEY set in Vercel.");
  const { data: crew } = await supabase.from("crew").select("email, full_name, status").eq("id", crewId).single();
  if (!crew) return fail("Crew member not found.");
  const redirectTo = `${await siteOrigin()}/auth/accept?next=/reset-password`;
  const { error } = await adminClient().auth.admin.inviteUserByEmail(crew.email as string, { redirectTo, data: { full_name: crew.full_name } });
  if (error) {
    // Already confirmed: send a set-password (recovery) email instead.
    const { error: recErr } = await adminClient().auth.resetPasswordForEmail(crew.email as string, { redirectTo });
    if (recErr) return fail(recErr.message);
  }
  return { ok: `Invite resent to ${crew.email}` };
}

export async function updateCrew(id: string, input: CrewInput): Promise<ActionResult> {
  const invalid = validateCrew(input, false);
  if (invalid) return fail(invalid);
  const { supabase } = await admin();
  const { error } = await supabase
    .from("crew")
    .update({ full_name: input.fullName.trim(), phone: input.phone, hourly_rate: Number(input.hourlyRate), start_date: input.startDate })
    .eq("id", id);
  if (error) return fail(error.message);
  refreshAll();
  return { ok: "Saved" };
}

/** Admin edit of a crew member's PayNow. The crew member isn't notified (SPEC.md). */
export async function updateCrewPayNow(id: string, name: string, phone: string): Promise<ActionResult> {
  if (!name.trim()) return fail("Enter the name on PayNow");
  if (!isSgMobile(phone)) return fail("Enter a valid 8-digit Singapore mobile number");
  const { me, supabase } = await admin();
  const { data: old } = await supabase.from("crew").select("paynow_name, paynow_phone").eq("id", id).single();
  const { error } = await supabase
    .from("crew")
    .update({ paynow_name: name.trim(), paynow_phone: phone, paynow_updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail(error.message);
  // Audit log: paynow_changes has no insert policy, so it's written with the service role.
  if (hasServiceRole && old) {
    await adminClient().from("paynow_changes").insert({
      crew_id: id,
      changed_by: me.id,
      old_name: old.paynow_name,
      old_phone: old.paynow_phone,
      new_name: name.trim(),
      new_phone: phone,
    });
  }
  refreshAll();
  return { ok: "PayNow saved" };
}

/** Deactivate blocks login and keeps history; reactivate restores it. */
export async function setCrewActive(id: string, active: boolean): Promise<ActionResult> {
  const { me, supabase } = await admin();
  if (id === me.id && !active) return fail("You can't deactivate your own account.");
  const { error } = await supabase.from("crew").update({ status: active ? "active" : "inactive" }).eq("id", id);
  if (error) return fail(error.message);
  if (hasServiceRole) {
    await adminClient().auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
  }
  refreshAll();
  return { ok: active ? "Reactivated" : "Deactivated" };
}
