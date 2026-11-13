import Link from "next/link";
import { AdminPage, Avatar, SmallTag, StatCard } from "@/components/admin/ui";
import { getOverview, type AttentionItem } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { firstName, fmtHours, fmtMoney, fmtMonthName, fmtMonthShort, fmtShortDate, greeting, TZ } from "@/lib/format";

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

const reviewHref = (a: AttentionItem) =>
  a.kind === "timesheet"
    ? `/admin/timesheets?month=${a.month.slice(0, 7)}&tab=submitted&id=${a.id}`
    : `/admin/claims?month=${a.month.slice(0, 7)}&tab=pending&id=${a.id}`;

export default async function AdminOverview() {
  const [admin, o] = await Promise.all([requireAdmin(), getOverview()]);
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date());

  return (
    <AdminPage>
      <div className="flex flex-col gap-1">
        <p className="hidden text-[13px] font-medium text-muted md:block">{today}</p>
        <h1 className="text-[22px] font-bold tracking-[-0.52px] md:text-[26px]">
          {greeting()}, {firstName(admin.full_name)}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label="Timesheets to review" value={String(o.timesheetsToReview)} sub={fmtMonthShort(o.month)} />
        <StatCard label="Claims to review" value={String(o.claimsToReview)} sub={fmtMoney(o.claimsPendingTotal)} />
        <StatCard label="Due to pay this month" value={fmtMoney(o.dueToPay)} sub={`${o.dueCrew} crew`} />
        <StatCard label="Paid this year" value={fmtMoney(o.paidThisYear)} sub={o.year} />
      </div>

      {/* Bookings, Services and Crew view aren't in the 5-slot mobile tab bar */}
      <nav className="grid grid-cols-3 gap-3 md:hidden" aria-label="More">
        {[
          ["/admin/bookings", "▦", "Bookings"],
          ["/admin/services", "◇", "Services"],
          ["/timesheet", "⌂", "Crew view"],
        ].map(([href, icon, text]) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-card py-3 text-[13px] font-semibold">
            <span className="text-base">{icon}</span>
            {text}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <section className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-line bg-card">
          <div className="flex items-center px-5 pt-4 pb-3">
            <h2 className="flex-1 text-base font-bold">Needs your attention</h2>
            <Link href="/admin/timesheets" className="text-[13px] font-semibold text-muted">
              View all
            </Link>
          </div>
          {o.attention.length === 0 && <p className="border-t border-line px-5 py-6 text-[13px] text-muted">All caught up. Nothing to review.</p>}
          {o.attention.map((a) => (
            <Link key={`${a.kind}-${a.id}`} href={reviewHref(a)} className="flex items-center gap-3 border-t border-line px-5 py-3 hover:bg-page">
              <Avatar name={a.crew} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-sm font-semibold">{a.crew}</p>
                <p className="truncate text-xs text-muted">
                  {a.kind === "timesheet"
                    ? `${fmtMonthName(a.month)} timesheet · ${fmtHours(a.hours)}`
                    : `${a.label} · ${fmtShortDate(a.date)}`}
                </p>
              </div>
              <span className="hidden md:inline">
                <SmallTag>{a.kind === "timesheet" ? "Timesheet" : "Claim"}</SmallTag>
              </span>
              <p className="text-sm font-semibold">{fmtMoney(a.amount)}</p>
              <span className="hidden rounded-lg border border-strong-line px-3 py-[7px] text-xs font-semibold md:inline">Review</span>
            </Link>
          ))}
        </section>

        <div className="flex w-full flex-col gap-4 md:w-[340px] md:shrink-0">
          <section className="flex flex-col gap-3.5 rounded-2xl border border-line bg-card p-5">
            <h2 className="text-base font-bold">{fmtMonthName(o.month)} payout</h2>
            {[
              ["Approved", o.payoutCard.approved],
              ["Waiting review", o.payoutCard.waiting],
              ["Claims pending", o.payoutCard.claimsPending],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center text-[13px]">
                <span className="flex-1 text-muted">{label}</span>
                <span className="font-semibold">{fmtMoney(value as number)}</span>
              </div>
            ))}
            <Link href="/admin/payouts" className="flex justify-center rounded-[10px] bg-ink px-4 py-[11px] text-sm font-semibold text-white">
              Go to payouts
            </Link>
          </section>
          {o.recent.length > 0 && (
            <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-5">
              <h2 className="text-base font-bold">Recent changes</h2>
              {o.recent.map((r, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <p className="text-[13px] font-medium">{r.text}</p>
                  <p className="text-xs text-muted">{ago(r.at)}</p>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
