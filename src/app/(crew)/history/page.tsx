import Link from "next/link";
import { Page, PageHeader } from "@/components/Page";
import { PillSelect } from "@/components/PillSelect";
import { ListCard, cardClass } from "@/components/ui";
import { getPaidMonths } from "@/lib/data";
import { PERIODS, fmtHours, fmtMoney, fmtMonth, fmtShortDate, fmtShortTs, periodStart, toPeriod } from "@/lib/format";
import { CLAIM_LABEL } from "@/lib/types";

const TYPES = [
  { value: "all", label: "All" },
  { value: "timesheets", label: "Timesheets" },
  { value: "claims", label: "Claims" },
] as const;
type HistoryType = (typeof TYPES)[number]["value"];

/** Completed (paid) months only; in-progress items live on Home, Timesheet and Claims. */
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ period?: string; type?: string }> }) {
  const sp = await searchParams;
  const period = toPeriod(sp.period, "3m");
  const type: HistoryType = TYPES.some((t) => t.value === sp.type) ? (sp.type as HistoryType) : "all";
  const months = await getPaidMonths({ from: periodStart(period) });

  const hrefFor = (t: HistoryType) => `/history?period=${period}&type=${t}`;

  return (
    <Page bottom="tabs">
      <PageHeader title="History" large>
        <PillSelect param="period" value={period} label="Period" options={PERIODS.map((p) => ({ ...p }))} />
      </PageHeader>

      <nav aria-label="Filter" className="-mt-1 flex gap-1 rounded-xl bg-segment p-1">
        {TYPES.map((t) => (
          <Link
            key={t.value}
            href={hrefFor(t.value)}
            replace
            scroll={false}
            aria-current={type === t.value ? "page" : undefined}
            className={`flex flex-1 items-center justify-center rounded-[9px] py-[9px] text-[13px] font-semibold ${
              type === t.value ? "bg-card text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-muted"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {months.length === 0 && (
        <p className={`${cardClass} px-4 py-6 text-center text-[13px] text-muted`}>
          Paid months will show here. Anything in progress is on Home, Timesheet and Claims.
        </p>
      )}

      {months.map(({ payout, timesheet, claims }) => {
        const showSheet = type !== "claims" && timesheet;
        const showClaims = type !== "timesheets" ? claims : [];
        if (!showSheet && showClaims.length === 0) return null;
        return (
          <section key={payout.id} className="-mt-1 flex flex-col gap-2">
            <div className="flex items-center justify-between text-muted">
              <h2 className="text-[11px] font-semibold tracking-[0.66px] uppercase">{fmtMonth(payout.month)}</h2>
              <p className="text-xs font-medium">
                Paid {payout.paid_at ? fmtShortTs(payout.paid_at) : ""} · {fmtMoney(payout.total)}
              </p>
            </div>
            <ListCard>
              {showSheet && (
                <Row title="Timesheet" detail={`${fmtHours(timesheet.hours)} · ${timesheet.jobs} ${timesheet.jobs === 1 ? "job" : "jobs"}`} amount={timesheet.pay} />
              )}
              {showClaims.map((c) => (
                <Row
                  key={c.id}
                  title={c.category === "others" && c.description ? c.description : CLAIM_LABEL[c.category]}
                  claim
                  detail={fmtShortDate(c.claim_date)}
                  amount={c.amount}
                />
              ))}
            </ListCard>
          </section>
        );
      })}
    </Page>
  );
}

function Row({ title, detail, amount, claim = false }: { title: string; detail: string; amount: number; claim?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold">{title}</p>
          {claim && <span className="rounded-md bg-segment px-1.5 py-0.5 text-[10px] font-semibold text-muted">Claim</span>}
        </div>
        <p className="text-xs text-muted">{detail}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold">{fmtMoney(amount)}</p>
    </div>
  );
}
