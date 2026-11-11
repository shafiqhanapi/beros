import Link from "next/link";
import { FixedActions, Page } from "@/components/Page";
import { Logo } from "@/components/Logo";
import { PillSelect } from "@/components/PillSelect";
import { StatRow, Stat, StatusPill, cardClass } from "@/components/ui";
import { getHomeSummary, getMe, getRecent, type RecentItem } from "@/lib/data";
import {
  PERIODS,
  firstName,
  fmtHours,
  fmtMoney,
  fmtMoneyShort,
  fmtMonth,
  fmtShortDate,
  greeting,
  initials,
  toPeriod,
} from "@/lib/format";
import { claimTitle } from "@/lib/types";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const period = toPeriod((await searchParams).period);
  const [me, summary, recent] = await Promise.all([getMe(), getHomeSummary(period), getRecent()]);
  const isNew = recent.length === 0;

  return (
    <Page bottom="tabs+actions">
      <div className="flex items-center md:hidden">
        <Logo />
        <div className="flex-1" />
        <Link
          href="/profile"
          aria-label="Profile"
          className="flex size-9 items-center justify-center rounded-full bg-ink text-[13.7px] font-semibold text-white"
        >
          {initials(me.full_name)}
        </Link>
      </div>

      <section className="flex flex-col gap-4">
        <h1 className="text-[22px] font-bold md:text-[26px]">
          {isNew ? "Welcome" : greeting()}, {firstName(me.full_name)}
        </h1>
        <div className={`${cardClass} flex flex-col gap-4 border-[#e6e6e6] p-5`}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-muted">Total earned</span>
            <PillSelect param="period" value={period} label="Period" options={PERIODS.map((p) => ({ ...p }))} />
          </div>
          <p className="text-[32px] font-bold tracking-[-0.96px]">{fmtMoney(summary.total)}</p>
          <StatRow>
            <Stat size="lg" label="Hours" value={fmtHours(summary.hours)} />
            <Stat size="lg" label="Jobs" value={String(summary.jobs)} />
            <Stat size="lg" label="Claims" value={fmtMoneyShort(summary.claims)} />
          </StatRow>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Recent</h2>
          {!isNew && (
            <Link href="/history" className="text-[13px] font-semibold text-muted">
              See all
            </Link>
          )}
        </div>
        {isNew ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#e6e6e6] bg-card px-6 py-7 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#f0f0f0] text-xl font-semibold">+</span>
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold">No activity yet</p>
              <p className="text-[13px] text-muted">Log hours after your first job, or submit a claim for any expenses.</p>
            </div>
          </div>
        ) : (
          <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {recent.map((item) => (
              <RecentCard key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </section>

      <FixedActions aboveTabs stack>
        <Link href="/timesheet" className="flex items-center gap-3 rounded-[14px] bg-ink px-5 py-4 text-white active:opacity-80">
          <span className="text-xl font-bold">+</span>
          <span className="text-base font-semibold">Log timesheet hours</span>
          <span className="flex-1" />
          <span className="text-lg font-semibold">→</span>
        </Link>
        <Link href="/claims?new=1" className="flex items-center gap-3 rounded-[14px] border border-strong-line bg-card px-5 py-4 active:bg-subtle">
          <span className="text-lg font-bold">$</span>
          <span className="text-base font-semibold">Submit a claim</span>
          <span className="flex-1" />
          <span className="text-lg font-semibold">→</span>
        </Link>
      </FixedActions>
    </Page>
  );
}

function RecentCard({ item }: { item: RecentItem }) {
  const href =
    item.kind === "timesheet" ? `/timesheet?month=${item.month.slice(0, 7)}` : `/claims?month=${item.claim.claim_date.slice(0, 7)}`;
  return (
    <Link
      href={href}
      className={`${cardClass} flex w-[calc((100%-12px)/2)] shrink-0 snap-start flex-col gap-3 border-[#e6e6e6] p-4 md:w-auto`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold tracking-[0.8px] text-muted">{item.kind === "timesheet" ? "TIMESHEET" : "CLAIM"}</span>
        <StatusPill size="sm" status={item.kind === "timesheet" ? item.status : item.claim.status} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-[15px] font-semibold">{item.kind === "timesheet" ? fmtMonth(item.month) : claimTitle(item.claim)}</p>
        <p className="truncate text-xs text-muted">
          {item.kind === "timesheet"
            ? `${fmtMoney(item.pay)} · ${fmtHours(item.hours)}`
            : `${fmtMoney(item.claim.amount)} · ${fmtShortDate(item.claim.claim_date)}`}
        </p>
      </div>
    </Link>
  );
}
