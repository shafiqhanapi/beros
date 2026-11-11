import Image from "next/image";
import { Page, PageHeader } from "@/components/Page";
import { PillSelect } from "@/components/PillSelect";
import { ListCard, SectionHeader, Stat, StatRow, cardClass } from "@/components/ui";
import { getMe, getPaidMonths } from "@/lib/data";
import { fmtHours, fmtMoney, fmtMonth, fmtShortTs, sgDate } from "@/lib/format";

/** Every paid month for the selected year; tapping a row downloads the PDF. */
export default async function PayslipsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const me = await getMe();
  const thisYear = Number(sgDate().slice(0, 4));
  const firstYear = Math.min(thisYear, Number(me.start_date.slice(0, 4)) || thisYear);
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => String(thisYear - i));
  const raw = (await searchParams).year;
  const year = raw && years.includes(raw) ? raw : String(thisYear);

  const months = await getPaidMonths({ from: `${year}-01-01`, to: `${year}-12-01` });
  const total = months.reduce((s, m) => s + m.payout.total, 0);
  const hours = months.reduce((s, m) => s + (m.timesheet?.hours ?? 0), 0);
  const claims = months.reduce((s, m) => s + m.payout.claims_total, 0);

  return (
    <Page bottom="tabs">
      <PageHeader title="Payslips" large>
        <PillSelect param="year" value={year} label="Year" options={years.map((y) => ({ value: y, label: y }))} />
      </PageHeader>

      <div className={`${cardClass} flex flex-col gap-4 p-5`}>
        <span className="text-[13px] font-medium text-muted">Total paid in {year}</span>
        <p className="text-[28px] font-bold">{fmtMoney(total)}</p>
        <StatRow>
          <Stat label="Payslips" value={String(months.length)} />
          <Stat label="Hours" value={fmtHours(hours)} />
          <Stat label="Claims" value={fmtMoney(claims)} />
        </StatRow>
      </div>

      <SectionHeader title="All payslips" />
      {months.length === 0 ? (
        <p className={`${cardClass} -mt-5 px-4 py-6 text-center text-[13px] text-muted`}>No payslips for {year} yet.</p>
      ) : (
        <ListCard className="-mt-5">
          {months.map(({ payout }) => {
            const ready = Boolean(payout.payslip_path);
            const body = (
              <>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="text-[15px] font-semibold">{fmtMonth(payout.month)}</p>
                  <p className="text-xs text-muted">
                    Paid {payout.paid_at ? fmtShortTs(payout.paid_at) : ""} · {fmtMoney(payout.total)}
                  </p>
                </div>
                <span className={`flex shrink-0 items-center gap-1.5 rounded-[10px] bg-subtle px-3 py-2 ${ready ? "" : "opacity-50"}`}>
                  <Image src="/icon-download.svg" alt="" width={11.6} height={13.6} className="h-3 w-2.5" />
                  <span className="text-xs font-semibold">{ready ? "PDF" : "Preparing"}</span>
                </span>
              </>
            );
            return ready ? (
              <a key={payout.id} href={`/payslips/${payout.id}/pdf`} className="flex items-center gap-3 py-3.5" aria-label={`Download ${fmtMonth(payout.month)} payslip`}>
                {body}
              </a>
            ) : (
              <div key={payout.id} className="flex items-center gap-3 py-3.5">
                {body}
              </div>
            );
          })}
        </ListCard>
      )}
    </Page>
  );
}
