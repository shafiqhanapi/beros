import Link from "next/link";
import { AdminHeader, AdminPage, Avatar, EmptyRow, TabLinks, TableCard, tdClass, thClass } from "@/components/admin/ui";
import { ApproveAll, ReviewActions } from "@/components/admin/ReviewActions";
import { PillSelect } from "@/components/PillSelect";
import { StatusPill } from "@/components/ui";
import { getTimesheetDetail, getTimesheetsForMonth } from "@/lib/admin-data";
import { fmtDayDate, fmtHours, fmtMoney, fmtMonth, fmtShortDate, fmtShortTs } from "@/lib/format";
import { monthParam } from "@/lib/months";
import type { TimesheetStatus } from "@/lib/types";
import { approveAllTimesheets, approveTimesheet, rejectTimesheet } from "../actions";

const TABS: { value: TimesheetStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
];

export default async function AdminTimesheets({ searchParams }: { searchParams: Promise<{ month?: string; tab?: string; id?: string }> }) {
  const sp = await searchParams;
  const { month, options, value } = monthParam(sp.month);
  const tab = (TABS.find((t) => t.value === sp.tab)?.value ?? "submitted") as TimesheetStatus;
  const all = await getTimesheetsForMonth(month);
  const rows = all.filter((t) => t.status === tab);
  const base = `/admin/timesheets?month=${value}&tab=${tab}`;

  const detailId = sp.id ?? rows[0]?.id;
  const detail = detailId ? await getTimesheetDetail(detailId) : null;
  const showDetailOnMobile = Boolean(sp.id && detail);

  return (
    <AdminPage>
      <div className={showDetailOnMobile ? "hidden md:block" : ""}>
        <AdminHeader eyebrow={fmtMonth(month)} title="Timesheets">
          <PillSelect param="month" value={value} options={options} label="Month" />
        </AdminHeader>
      </div>

      <div className={`flex items-center gap-3 ${showDetailOnMobile ? "hidden md:flex" : ""}`}>
        <div className="min-w-0 flex-1">
          <TabLinks
            active={tab}
            tabs={TABS.map((t) => {
              const n = all.filter((x) => x.status === t.value).length;
              return { value: t.value, label: t.value === "submitted" ? `${t.label} (${n})` : t.label, href: `/admin/timesheets?month=${value}&tab=${t.value}` };
            })}
          />
        </div>
        {tab === "submitted" && rows.length > 1 && (
          <span className="hidden md:block">
            <ApproveAll label={`Approve all ${rows.length}`} onApprove={approveAllTimesheets.bind(null, value)} />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className={`min-w-0 flex-1 ${showDetailOnMobile ? "hidden md:block" : ""}`}>
          {rows.length === 0 ? (
            <EmptyRow>No {tab} timesheets for {fmtMonth(month)}.</EmptyRow>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <TableCard>
                  <table className="w-full">
                    <thead className="bg-[#fafafa]">
                      <tr>
                        <th className={thClass}>Crew</th>
                        <th className={thClass}>Hours</th>
                        <th className={thClass}>Jobs</th>
                        <th className={thClass}>Hours pay</th>
                        <th className={thClass}>Submitted</th>
                        <th className={thClass}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((t) => (
                        <tr key={t.id} className={`border-t border-line ${t.id === detailId ? "bg-[#fafafa]" : ""}`}>
                          <td className={tdClass}>
                            <Link href={`${base}&id=${t.id}`} scroll={false} className="flex items-center gap-2.5 font-semibold">
                              <Avatar name={t.crew.full_name} size={24} />
                              {t.crew.full_name}
                            </Link>
                          </td>
                          <td className={tdClass}>{fmtHours(t.totals.hours)}</td>
                          <td className={tdClass}>{t.totals.jobs}</td>
                          <td className={tdClass}>{fmtMoney(t.totals.pay)}</td>
                          <td className={tdClass}>{t.submitted_at ? fmtShortTs(t.submitted_at) : "—"}</td>
                          <td className={tdClass}>
                            <StatusPill status={t.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableCard>
              </div>
              {/* Mobile list */}
              <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card md:hidden">
                {rows.map((t) => (
                  <Link key={t.id} href={`${base}&id=${t.id}`} className="flex items-center gap-3 border-line px-4 py-3.5 [&+&]:border-t">
                    <Avatar name={t.crew.full_name} size={40} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-[15px] font-semibold">{t.crew.full_name}</p>
                      <p className="text-xs text-muted">
                        {fmtHours(t.totals.hours)} · {t.totals.jobs} jobs{t.submitted_at ? ` · ${fmtShortTs(t.submitted_at)}` : ""}
                      </p>
                    </div>
                    <p className="text-[15px] font-semibold">{fmtMoney(t.totals.pay)}</p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {detail && (
          <section className={`w-full flex-col gap-5 md:flex md:w-[400px] md:shrink-0 md:rounded-2xl md:border md:border-line md:bg-card md:p-5 ${showDetailOnMobile ? "flex" : "hidden"}`}>
            <div className="flex items-center gap-3">
              <Link href={base} aria-label="Back" className="flex size-10 items-center justify-center rounded-xl border border-line bg-card font-semibold md:hidden">
                ←
              </Link>
              <span className="hidden md:block">
                <Avatar name={detail.crew.full_name} size={40} />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate text-[22px] font-bold md:text-[17px]">{detail.crew.full_name}</p>
                <p className="hidden text-xs text-muted md:block">
                  {fmtMonth(detail.month)}
                  {detail.submitted_at ? ` · submitted ${fmtShortTs(detail.submitted_at)}` : ""}
                </p>
              </div>
            </div>
            <p className="-mt-2 text-[13px] text-muted md:hidden">
              {fmtMonth(detail.month)}
              {detail.submitted_at ? ` · submitted ${fmtShortTs(detail.submitted_at)}` : ""}
            </p>

            <div className="flex rounded-2xl border border-line bg-card p-4 md:rounded-xl md:border-0 md:bg-subtle">
              {[
                ["Hours", fmtHours(detail.totals.hours)],
                ["Jobs", String(detail.totals.jobs)],
                ["Hours pay", fmtMoney(detail.totals.pay)],
              ].map(([l, v]) => (
                <div key={l} className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-muted">{l}</span>
                  <span className="text-[17px] font-bold">{v}</span>
                </div>
              ))}
            </div>

            {detail.status === "rejected" && detail.reject_reason && (
              <div className="rounded-xl bg-bad/[0.06] px-3 py-2.5 text-[13px]">
                <span className="font-semibold text-bad">Rejected: </span>
                {detail.reject_reason}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <h3 className="pb-1 text-base font-bold">Entries</h3>
              {detail.entries.length === 0 && <p className="text-[13px] text-muted">No entries.</p>}
              <div className="flex flex-col rounded-2xl border border-line bg-card px-4 md:border-0 md:px-0">
                {detail.entries.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 border-line py-3 [&+&]:border-t">
                    <span className="hidden w-12 shrink-0 text-xs text-muted md:block">{fmtShortDate(e.work_date)}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-sm font-semibold md:font-medium">
                        {e.booking ? `${e.booking.title} · ${e.booking.address}` : `Admin matters${e.note ? ` · ${e.note}` : ""}`}
                      </p>
                      <p className="text-xs text-muted md:hidden">{fmtDayDate(e.work_date)}</p>
                      {e.booking && e.note && <p className="truncate text-xs text-muted">Note: {e.note}</p>}
                    </div>
                    <span className="text-sm font-bold">{fmtHours(e.hours)}</span>
                  </div>
                ))}
              </div>
            </div>

            {detail.status === "submitted" ? (
              <ReviewActions
                approveLabel="Approve timesheet"
                onApprove={approveTimesheet.bind(null, detail.id)}
                onReject={rejectTimesheet.bind(null, detail.id)}
                afterHref={base}
              />
            ) : (
              <p className="flex items-center gap-2 text-[13px] text-muted">
                <StatusPill status={detail.status} />
                {detail.status === "approved" && (
                  <Link href={`/admin/payouts?month=${value}`} className="font-semibold text-ink underline">
                    Go to payouts
                  </Link>
                )}
                {detail.status === "draft" && "The crew member hasn't submitted this month yet."}
              </p>
            )}
          </section>
        )}
      </div>
    </AdminPage>
  );
}
