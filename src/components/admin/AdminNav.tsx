"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

type Badges = { timesheets: number; claims: number };

const NAV = [
  { href: "/admin", label: "Overview", icon: "◧", exact: true },
  { href: "/admin/timesheets", label: "Timesheets", icon: "▤", badge: "timesheets" as const },
  { href: "/admin/claims", label: "Claims", icon: "⎙", badge: "claims" as const },
  { href: "/admin/payouts", label: "Payouts", icon: "$" },
  { href: "/admin/bookings", label: "Bookings", icon: "▦" },
  { href: "/admin/services", label: "Services", icon: "◇" },
  { href: "/admin/crew", label: "Crew", icon: "☺" },
];

/** Mobile tab bar has five slots (Figma AM1–AM7). */
const TABS = ["/admin", "/admin/timesheets", "/admin/claims", "/admin/payouts", "/admin/crew"];

const isActive = (pathname: string, href: string, exact?: boolean) =>
  exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return <span className="rounded-[10px] bg-ink px-[7px] py-0.5 text-[11px] font-semibold text-white">{n}</span>;
}

export function AdminSidebar({ name, initials, badges }: { name: string; initials: string; badges: Badges }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col gap-1 border-r border-line bg-card px-4 pt-7 pb-5 md:flex">
      <div className="pb-7 pl-2.5">
        <Logo />
      </div>
      {NAV.map((n) => {
        const active = isActive(pathname, n.href, n.exact);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm ${
              active ? "bg-subtle font-semibold text-ink" : "font-medium text-muted hover:bg-page"
            }`}
          >
            <span className="w-4 text-center font-semibold">{n.icon}</span>
            <span className="flex-1">{n.label}</span>
            {n.badge && <Badge n={badges[n.badge]} />}
          </Link>
        );
      })}
      <div className="flex-1" />
      <Link
        href="/timesheet"
        className="mb-2 flex items-center gap-3 rounded-[10px] border border-line px-3 py-2.5 text-sm font-semibold hover:bg-page"
      >
        <span className="w-4 text-center">⌂</span>
        Crew view
      </Link>
      <div className="flex items-center gap-2.5 rounded-xl bg-page p-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-ink text-[11.5px] font-semibold text-white">{initials}</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-semibold">{name}</span>
          <span className="text-xs text-muted">Admin</span>
        </div>
        <form action="/auth/signout" method="post">
          <button className="text-xs font-semibold text-muted hover:text-ink" title="Log out">
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}

export function AdminTabBar({ badges }: { badges: Badges }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card px-2 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] md:hidden">
      <ul className="flex">
        {NAV.filter((n) => TABS.includes(n.href)).map((n) => {
          const active = isActive(pathname, n.href, n.exact);
          const count = n.badge ? badges[n.badge] : 0;
          return (
            <li key={n.href} className="flex-1">
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 ${active ? "font-semibold text-ink" : "font-medium text-muted"}`}
              >
                <span className="text-lg leading-none font-semibold">{n.icon}</span>
                <span className="text-[11px]">{n.label}</span>
                {count > 0 && (
                  <span className="absolute -top-1 left-1/2 ml-2 rounded-full bg-ink px-1.5 text-[10px] font-semibold text-white">{count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
