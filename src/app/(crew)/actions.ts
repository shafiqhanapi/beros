"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/data";
import { isSgMobile, sgDate, toMonth, monthEnd } from "@/lib/format";
import type { ClaimCategory, TimesheetRow } from "@/lib/types";

/**
 * Server actions for the crew app. They run as the signed-in user, so the
 * row-level security policies in SPEC.md are the final check on every write
 * (e.g. entries can only change while the timesheet is draft or rejected).
 */

export type ActionResult = { error?: string };

const fail = (error: string): ActionResult => ({ error });

async function timesheetFor(month: string, create: boolean): Promise<TimesheetRow | null> {
  const me = await getMe();
  const supabase = await createClient();
  const { data } = await supabase.from("timesheets").select("*").eq("crew_id", me.id).eq("month", month).maybeSingle<TimesheetRow>();
  if (data || !create) return data ?? null;
  const { data: created, error } = await supabase
    .from("timesheets")
    .insert({ crew_id: me.id, month })
    .select("*")
    .single<TimesheetRow>();
  if (error) throw new Error(error.message);
  return created;
}

const editable = (ts: TimesheetRow | null) => !ts || ts.status === "draft" || ts.status === "rejected";

const refreshTimesheet = () => {
  revalidatePath("/timesheet");
  revalidatePath("/home");
};

// ---------------------------------------------------------------------------
// Timesheet entries
// ---------------------------------------------------------------------------

export async function saveEntry(input: {
  month: string;
  entryId?: string;
  bookingId?: string | null;
  workDate?: string;
  hours: number;
  note?: string;
}): Promise<ActionResult> {
  const month = toMonth(input.month);
  if (!month) return fail("Pick a month.");
  const hours = Math.round(Number(input.hours) * 2) / 2;
  if (!(hours >= 0.5 && hours <= 24)) return fail("Hours must be between 0.5 and 24.");
  const note = input.note?.trim() || null;

  const supabase = await createClient();
  const me = await getMe();

  try {
    const ts = await timesheetFor(month, true);
    if (!editable(ts)) return fail("This timesheet is locked. Withdraw it to make changes.");

    if (input.entryId) {
      const { error } = await supabase.from("timesheet_entries").update({ hours, note }).eq("id", input.entryId).eq("timesheet_id", ts!.id);
      if (error) return fail(error.message);
    } else {
      let workDate = input.workDate;
      if (input.bookingId) {
        const { data: booking } = await supabase.from("bookings").select("scheduled_at").eq("id", input.bookingId).maybeSingle();
        if (!booking) return fail("That booking isn’t assigned to you.");
        workDate = sgDate(booking.scheduled_at as string);
      } else if (!note) {
        return fail("Add a short note for admin matters.");
      }
      if (!workDate || workDate < month || workDate > monthEnd(month)) return fail("Pick a date in this month.");
      const { error } = await supabase.from("timesheet_entries").insert({
        timesheet_id: ts!.id,
        booking_id: input.bookingId ?? null,
        is_admin_matter: !input.bookingId,
        work_date: workDate,
        hours,
        rate: me.hourly_rate,
        note,
      });
      if (error) return fail(error.message);
    }
  } catch (e) {
    return fail((e as Error).message);
  }
  refreshTimesheet();
  return {};
}

export async function deleteEntry(entryId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("timesheet_entries").delete().eq("id", entryId);
  if (error) return fail(error.message);
  refreshTimesheet();
  return {};
}

export async function submitTimesheet(monthInput: string): Promise<ActionResult> {
  const month = toMonth(monthInput);
  if (!month) return fail("Pick a month.");
  const ts = await timesheetFor(month, false);
  if (!ts) return fail("Log some hours before submitting.");
  if (!editable(ts)) return fail("This timesheet has already been submitted.");
  const supabase = await createClient();
  const { count } = await supabase.from("timesheet_entries").select("id", { count: "exact", head: true }).eq("timesheet_id", ts.id);
  if (!count) return fail("Log some hours before submitting.");
  const { error } = await supabase
    .from("timesheets")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", ts.id)
    .in("status", ["draft", "rejected"]);
  if (error) return fail(error.message);
  // TODO(Phase 4): email the admin that a timesheet was submitted.
  refreshTimesheet();
  return {};
}

export async function withdrawTimesheet(monthInput: string): Promise<ActionResult> {
  const month = toMonth(monthInput);
  if (!month) return fail("Pick a month.");
  const ts = await timesheetFor(month, false);
  if (!ts || ts.status !== "submitted") return fail("Only a submitted timesheet can be withdrawn.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .update({ status: "draft", submitted_at: null })
    .eq("id", ts.id)
    .eq("status", "submitted")
    .select("id");
  if (error) return fail(error.message);
  if (!data?.length) return fail("This timesheet has already been reviewed.");
  refreshTimesheet();
  return {};
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

const CATEGORIES: ClaimCategory[] = ["transport", "food", "others"];

export async function saveClaim(input: {
  id?: string;
  category: ClaimCategory;
  description?: string;
  amount: number;
  claimDate: string;
  receiptPath?: string | null;
}): Promise<ActionResult> {
  if (!CATEGORIES.includes(input.category)) return fail("Choose a claim type.");
  const description = input.category === "others" ? input.description?.trim() || "" : null;
  if (input.category === "others" && !description) return fail("Tell us what you bought.");
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!(amount > 0)) return fail("Enter an amount above $0.");
  if (amount > 99999) return fail("That amount is too large.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.claimDate)) return fail("Pick a date.");
  if (input.claimDate > sgDate()) return fail("The date can’t be in the future.");

  const me = await getMe();
  const supabase = await createClient();
  const row = {
    category: input.category,
    description,
    amount,
    claim_date: input.claimDate,
    receipt_path: input.receiptPath ?? null,
    status: "pending" as const,
  };

  const { error } = input.id
    ? await supabase.from("claims").update({ ...row, reject_reason: null, reviewed_at: null }).eq("id", input.id).in("status", ["pending", "rejected"])
    : await supabase.from("claims").insert({ ...row, crew_id: me.id });
  if (error) return fail(error.message);
  // TODO(Phase 4): email the admin about the new or resubmitted claim.
  revalidatePath("/claims");
  revalidatePath("/home");
  return {};
}

export async function deleteClaim(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: claim } = await supabase.from("claims").select("receipt_path, status").eq("id", id).maybeSingle();
  if (!claim || claim.status !== "pending") return fail("Only pending claims can be deleted.");
  const { error } = await supabase.from("claims").delete().eq("id", id);
  if (error) return fail(error.message);
  if (claim.receipt_path) await supabase.storage.from("receipts").remove([claim.receipt_path as string]);
  revalidatePath("/claims");
  revalidatePath("/home");
  return {};
}

/** Short-lived link to view a receipt in the private bucket. */
export async function receiptUrl(path: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
  return error ? { error: error.message } : { url: data.signedUrl };
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/** Phone and PayNow go through update_my_contact() so crew can't change other columns. */
export async function updateContact(input: { phone?: string; paynowName?: string; paynowPhone?: string }): Promise<ActionResult> {
  const me = await getMe();
  const phone = input.phone ?? me.phone;
  const paynowName = (input.paynowName ?? me.paynow_name)?.trim() || null;
  const paynowPhone = input.paynowPhone ?? me.paynow_phone;

  if (input.phone !== undefined && !isSgMobile(input.phone)) return fail("Enter a valid 8-digit Singapore mobile number");
  if (input.paynowPhone !== undefined) {
    if (!isSgMobile(input.paynowPhone)) return fail("Enter a valid 8-digit Singapore mobile number");
    if (!paynowName) return fail("Enter the name on your PayNow account.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_contact", {
    p_phone: phone,
    p_paynow_name: paynowName,
    p_paynow_phone: paynowPhone,
  });
  if (error) return fail(error.message);
  // TODO(Phase 4): email the admin when PayNow details change.
  revalidatePath("/profile");
  return {};
}

/** Stored on the auth user (user_metadata) since the crew table has no column for it. */
export async function setEmailNotifications(enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { email_notifications: enabled } });
  if (error) return fail(error.message);
  revalidatePath("/profile");
  return {};
}
