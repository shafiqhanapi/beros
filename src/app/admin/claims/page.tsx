import Link from "next/link";
import { AdminHeader, AdminPage, Avatar, EmptyRow, TabLinks, TableCard, tdClass, thClass } from "@/components/admin/ui";
import { ApproveAll, ReviewActions } from "@/components/admin/ReviewActions";
import { PillSelect } from "@/components/PillSelect";
import { StatusPill } from "@/components/ui";
import { getClaimDetail, getClaimsForMonth } from "@/lib/admin-data";
import { fmtMoney, fmtMonth, fmtShortDate, fmtShortTs, parseDate } from "@/lib/format";
import { monthParam } from "@/lib/months";
import { CLAIM_LABEL, type ClaimStatus } from "@/lib/types";
import { approveAllClaims, approveClaim, rejectClaim } from "../actions";

const TABS: { value: ClaimStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
];

const CATEGORY = { transport: "Transport", food: "Food", others: "Others" } as const;
const claimText = (c: { category: keyof typeof CATEGORY; description: string | null }) =>
  c.category === "others" && c.description ? `Others · ${c.description}` : CATEGORY[c.category];
const longDate = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(parseDate(d));

export default async function AdminClaims({ searchParams }: { searchParams: Promise<{ month?: string; tab?: string; id?: string }> }) {
  const sp = await searchParams;
  const { month, options, value } = monthParam(sp.month);
  const tab = (TABS.find((t) => t.value === sp.tab)?.value ?? "pending") as ClaimStatus;
  const all = await getClaimsForMonth(month);
  const rows = all.filter((c) => c.status === tab);
  const base = `/admin/claims?month=${value}&tab=${tab}`;

  const detailId = sp.id ?? rows[0]?.id;
  const detail = detailId ? await getClaimDetail(detailId) : null;
  const showDetailOnMobile = Boolean(sp.id && detail);
  const isPdf = detail?.receipt_path?.toLowerCase().endsWith(".pdf");

  return (
    <AdminPage>
      <div className={showDetailOnMobile ? "hidden md:block" : ""}>
        <AdminHeader eyebrow={fmtMonth(month)} title="Claims">
          <PillSelect param="month" value={value} options={options} label="Month" />
        </AdminHeader>
      </div>

      <div className={`flex items-center gap-3 ${showDetailOnMobile ? "hidden md:flex" : ""}`}>
        <div className="min-w-0 flex-1">
          <TabLinks
            active={tab}
            tabs={TABS.map((t) => {
              const n = all.filter((x) => x.status === t.value).length;
              return { value: t.value, label: t.value === "pending" ? `${t.label} (${n})` : t.label, href: `/admin/claims?month=${value}&tab=${t.value}` };
            })}
          />
        </div>
        {tab === "pending" && rows.length > 1 && (
          <span className="hidden md:block">
            <ApproveAll label={`Approve all ${rows.length}`} onApprove={approveAllClaims.bind(null, value)} />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className={`min-w-0 flex-1 ${showDetailOnMobile ? "hidden md:block" : ""}`}>
          {rows.length === 0 ? (
            <EmptyRow>No {tab} claims for {fmtMonth(month)}.</EmptyRow>
          ) : (
            <>
              <div className="hidden md:block">
                <TableCard>
                  <table className="w-full">
                    <thead className="bg-[#fafafa]">
                      <tr>
                        <th className={thClass}>Crew</th>
                        <th className={thClass}>Claim</th>
                        <th className={thClass}>Date</th>
                        <th className={thClass}>Amount</th>
                        <th className={thClass}>Receipt</th>
                        <th className={thClass}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c) => (
                        <tr key={c.id} className={`border-t border-line ${c.id === detailId ? "bg-[#fafafa]" : ""}`}>
                          <td className={tdClass}>
                            <Link href={`${base}&id=${c.id}`} scroll={false} className="flex items-center gap-2.5 font-semibold">
                              <Avatar name={c.crew.full_name} size={24} />
                              {c.crew.full_name}
                            </Link>
                          </td>
                          <td className={tdClass}>{claimText(c)}</td>
                          <td className={tdClass}>{fmtShortDate(c.claim_date)}</td>
                          <td className={tdClass}>{fmtMoney(c.amount)}</td>
                          <td className={`${tdClass} text-[13px] text-muted`}>{c.receipt_path ? "Attached" : "None"}</td>
                          <td className={tdClass}>
                            <StatusPill status={c.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableCard>
              </div>
              <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card md:hidden">
                {rows.map((c) => (
                  <Link key={c.id} href={`${base}&id=${c.id}`} className="flex items-center gap-3 border-line px-4 py-3.5 [&+&]:border-t">
                    <Avatar name={c.crew.full_name} size={40} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-[15px] font-semibold">{c.crew.full_name}</p>
                      <p className="truncate text-xs text-muted">
                        {claimText(c)} · {fmtShortDate(c.claim_date)}
                      </p>
                    </div>
                    <p className="text-[15px] font-semibold">{fmtMoney(c.amount)}</p>
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
                <p className="text-xs text-muted">Submitted {fmtShortTs(detail.created_at)}</p>
              </div>
            </div>

            <dl className="flex flex-col gap-2.5 rounded-xl bg-subtle p-4 text-[13px]">
              {[
                ["Category", CATEGORY[detail.category]],
                ...(detail.category === "others" && detail.description ? [["Item", detail.description]] : []),
                ["Date", longDate(detail.claim_date)],
                ["Amount", fmtMoney(detail.amount)],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="flex-1 text-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-2">
              <h3 className="text-base font-bold">Receipt</h3>
              {detail.receiptUrl ? (
                isPdf ? (
                  <a href={detail.receiptUrl} target="_blank" rel="noopener" className="flex h-24 items-center justify-center rounded-xl bg-segment text-sm font-semibold underline">
                    Open PDF receipt
                  </a>
                ) : (
                  <a href={detail.receiptUrl} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl bg-segment">
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
                    <img src={detail.receiptUrl} alt={`Receipt for ${CLAIM_LABEL[detail.category]} claim`} className="max-h-80 w-full object-contain" />
                  </a>
                )
              ) : (
                <div className="flex h-24 items-center justify-center rounded-xl bg-segment text-[13px] text-muted">No receipt attached</div>
              )}
            </div>

            {detail.status === "rejected" && detail.reject_reason && (
              <div className="rounded-xl bg-bad/[0.06] px-3 py-2.5 text-[13px]">
                <span className="font-semibold text-bad">Rejected: </span>
                {detail.reject_reason}
              </div>
            )}

            {detail.status === "pending" ? (
              <ReviewActions
                approveLabel="Approve claim"
                onApprove={approveClaim.bind(null, detail.id)}
                onReject={rejectClaim.bind(null, detail.id)}
                afterHref={base}
              />
            ) : (
              <StatusPill status={detail.status} />
            )}
          </section>
        )}
      </div>
    </AdminPage>
  );
}
