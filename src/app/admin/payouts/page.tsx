import Link from "next/link";
import { AdminHeader, AdminPage, Avatar, EmptyRow, StatCard, TableCard, tdClass, thClass } from "@/components/admin/ui";
import { MarkPaidButton } from "@/components/admin/MarkPaidButton";
import { PillSelect } from "@/components/PillSelect";
import { StatusPill } from "@/components/ui";
import { getPayoutLines, type PayoutLine } from "@/lib/admin-data";
import { fmtMoney, fmtMonth } from "@/lib/format";
import { monthParam } from "@/lib/months";
import { markPaid } from "../actions";

const total = (l: PayoutLine) => l.hoursPay + l.claimsApproved;
const paynow = (l: PayoutLine) => (l.crew.paynow_phone ? `${l.crew.paynow_name ?? l.crew.full_name} · ••${l.crew.paynow_phone.slice(-4)}` : "Not set");

function Action({ line, month }: { line: PayoutLine; month: string }) {
  if (line.state === "paid")
    return (
      <a href={`/payslips/${line.payout!.id}/pdf`} className="rounded-lg border border-strong-line px-3 py-[7px] text-xs font-semibold whitespace-nowrap">
        Payslip PDF
      </a>
    );
  if (line.state === "ready")
    return <MarkPaidButton name={line.crew.full_name} total={fmtMoney(total(line))} onMarkPaid={markPaid.bind(null, line.crew.id, month)} />;
  if (line.state === "waiting") {
    const href =
      line.timesheet && line.timesheet.status === "submitted"
        ? `/admin/timesheets?month=${month}&tab=submitted&id=${line.timesheet.id}`
        : `/admin/claims?month=${month}&tab=pending`;
    return (
      <Link href={href} className="rounded-lg border border-strong-line px-3 py-[7px] text-xs font-semibold">
        Review
      </Link>
    );
  }
  return <span className="text-xs text-muted">—</span>;
}

export default async function AdminPayouts({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month, options, value } = monthParam((await searchParams).month);
  const lines = await getPayoutLines(month);
  const ready = lines.filter((l) => l.state === "ready");
  const waiting = lines.filter((l) => l.state === "waiting");
  const paid = lines.filter((l) => l.state === "paid");
  const waitingTotal = waiting.reduce((s, l) => s + (l.timesheet?.totals.pay ?? 0) + l.claimsPending, 0);

  return (
    <AdminPage>
      <AdminHeader eyebrow={fmtMonth(month)} title="Payouts">
        <PillSelect param="month" value={value} options={options} label="Month" />
        <a
          href={`/admin/payouts/export?month=${value}`}
          className="hidden rounded-[10px] border border-strong-line bg-card px-4 py-2.5 text-sm font-semibold md:block"
        >
          Export CSV
        </a>
      </AdminHeader>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <StatCard label="Ready to pay" value={fmtMoney(ready.reduce((s, l) => s + total(l), 0))} sub={`${ready.length} crew`} />
        <StatCard label="Waiting approval" value={fmtMoney(waitingTotal)} sub={`${waiting.length} crew`} />
        <StatCard label="Paid" value={fmtMoney(paid.reduce((s, l) => s + total(l), 0))} sub={`${paid.length} crew`} />
      </div>

      {lines.length === 0 ? (
        <EmptyRow>No timesheets or claims for {fmtMonth(month)} yet.</EmptyRow>
      ) : (
        <>
          <div className="hidden md:block">
            <TableCard>
              <table className="w-full">
                <thead className="bg-[#fafafa]">
                  <tr>
                    <th className={thClass}>Crew</th>
                    <th className={thClass}>Hours pay</th>
                    <th className={thClass}>Claims</th>
                    <th className={thClass}>Total</th>
                    <th className={thClass}>PayNow</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.crew.id} className="border-t border-line">
                      <td className={tdClass}>
                        <span className="flex items-center gap-2.5 font-semibold">
                          <Avatar name={l.crew.full_name} size={24} />
                          {l.crew.full_name}
                        </span>
                      </td>
                      <td className={tdClass}>{fmtMoney(l.state === "waiting" ? l.timesheet?.totals.pay ?? 0 : l.hoursPay)}</td>
                      <td className={tdClass}>
                        {fmtMoney(l.claimsApproved)}
                        {l.claimsPending > 0 && <span className="block text-xs text-wait">+{fmtMoney(l.claimsPending)} pending</span>}
                      </td>
                      <td className={`${tdClass} font-semibold`}>{fmtMoney(total(l))}</td>
                      <td className={`${tdClass} text-[13px] text-muted`}>{paynow(l)}</td>
                      <td className={tdClass}>
                        <StatusPill status={l.status} />
                      </td>
                      <td className={tdClass}>
                        <Action line={l} month={value} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          </div>

          <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card md:hidden">
            {lines.map((l) => (
              <div key={l.crew.id} className="flex flex-col gap-2 border-line px-4 py-3.5 [&+&]:border-t">
                <div className="flex items-center gap-3">
                  <Avatar name={l.crew.full_name} size={36} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-[15px] font-semibold">{l.crew.full_name}</p>
                    <p className="truncate text-xs text-muted">{paynow(l)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-[15px] font-semibold">{fmtMoney(total(l))}</p>
                    <StatusPill status={l.status} />
                  </div>
                </div>
                <div className="flex items-center justify-between pl-12 text-xs text-muted">
                  <span>
                    Hours {fmtMoney(l.hoursPay)} · Claims {fmtMoney(l.claimsApproved)}
                  </span>
                  <Action line={l} month={value} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-[13px] text-muted">
        Marking as paid creates the payslip PDF, which the crew member can download from Payslips. Pending and rejected items are left out.
      </p>
    </AdminPage>
  );
}
