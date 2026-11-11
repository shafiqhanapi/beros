/** Row types for the tables in SPEC.md (only the columns the app reads). */

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected" | "paid";
export type ClaimStatus = "pending" | "approved" | "rejected" | "paid";
export type ClaimCategory = "transport" | "food" | "others";

export interface CrewRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "crew" | "admin";
  status: "invited" | "active" | "inactive";
  hourly_rate: number;
  start_date: string;
  paynow_name: string | null;
  paynow_phone: string | null;
}

export interface TimesheetRow {
  id: string;
  crew_id: string;
  month: string;
  status: TimesheetStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  paid_at: string | null;
}

export interface EntryRow {
  id: string;
  timesheet_id: string;
  booking_id: string | null;
  is_admin_matter: boolean;
  work_date: string;
  hours: number;
  rate: number;
  note: string | null;
}

export interface ClaimRow {
  id: string;
  crew_id: string;
  category: ClaimCategory;
  description: string | null;
  amount: number;
  claim_date: string;
  receipt_path: string | null;
  status: ClaimStatus;
  reject_reason: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface PayoutRow {
  id: string;
  crew_id: string;
  month: string;
  hours_pay: number;
  claims_total: number;
  total: number;
  payslip_number: string | null;
  payslip_path: string | null;
  paid_at: string | null;
}

/** A booking as crew see it: the service name comes from its items. */
export interface BookingSummary {
  id: string;
  scheduled_at: string;
  address: string;
  title: string;
}

export const CLAIM_LABEL: Record<ClaimCategory, string> = {
  transport: "Transport",
  food: "Food",
  others: "Other",
};

/** "Other · Cleaning gloves", "Transport" */
export const claimTitle = (c: Pick<ClaimRow, "category" | "description">) =>
  c.category === "others" && c.description ? `${CLAIM_LABEL.others} · ${c.description}` : CLAIM_LABEL[c.category];

/** Money columns come back from PostgREST as strings; normalise to numbers. */
export const num = (v: number | string | null | undefined) => Number(v ?? 0);
