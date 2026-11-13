import { NextResponse, type NextRequest } from "next/server";
import { getPayoutLines } from "@/lib/admin-data";
import { monthParam } from "@/lib/months";

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV of the month's payout summary (one row per crew member). */
export async function GET(request: NextRequest) {
  const { month, value } = monthParam(request.nextUrl.searchParams.get("month") ?? undefined);
  const lines = await getPayoutLines(month);
  const rows = [
    ["Crew", "Email", "Hours", "Hours pay", "Approved claims", "Pending claims", "Total", "PayNow name", "PayNow number", "Status", "Payslip"],
    ...lines.map((l) => [
      l.crew.full_name,
      l.crew.email,
      l.timesheet?.totals.hours ?? 0,
      l.hoursPay.toFixed(2),
      l.claimsApproved.toFixed(2),
      l.claimsPending.toFixed(2),
      (l.hoursPay + l.claimsApproved).toFixed(2),
      l.crew.paynow_name ?? "",
      l.crew.paynow_phone ? `+65 ${l.crew.paynow_phone}` : "",
      l.state === "paid" ? "Paid" : l.status,
      l.payout?.payslip_number ?? "",
    ]),
  ];
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  return new NextResponse(`﻿${csv}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="beros-payouts-${value}.csv"`,
    },
  });
}
