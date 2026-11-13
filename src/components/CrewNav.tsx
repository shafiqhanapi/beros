"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const TABS = [
  { href: "/timesheet", label: "Timesheet", icon: "▤" },
  { href: "/claims", label: "Claims", icon: "⎙" },
  { href: "/history", label: "History", icon: "☰" },
  { href: "/payslips", label: "Payslips", icon: "$" },
  { href: "/profile", label: "Profile", icon: "○" },
];

const SIDEBAR = [
  { href: "/timesheet", label: "Timesheet", icon: "▤" },
  { href: "/claims", label: "Claims", icon: "⎙" },
  { href: "/history", label: "History", icon: "☰" },
  { href: "/payslips", label: "Payslips", icon: "$" },
  { href: "/profile", label: "Profile", icon: "○" },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Mobile tab bar. Shown on the five tab screens; Profile edit screens use a back button. */
export function TabBar() {
  const pathname = usePathname();
  if (!TABS.some((t) => pathname === t.href)) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] md:hidden">
      <ul className="mx-auto flex max-w-[440px]">
        {TABS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 ${active ? "font-semibold text-ink" : "font-medium text-muted"}`}
              >
                <span className="text-lg leading-none font-semibold">{t.icon}</span>
                <span className="text-[11px]">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop sidebar (Figma CD1–CD6). */
export function Sidebar({ name, initials, isAdmin }: { name: string; initials: string; isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-card px-4 py-7 md:flex">
      <div className="px-3 pb-7">
        <Logo />
      </div>
      <nav className="flex flex-col gap-1">
        {SIDEBAR.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm ${
                active ? "bg-subtle font-semibold text-ink" : "font-medium text-muted hover:bg-page"
              }`}
            >
              <span className="w-4 text-center text-[13px]">{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      {isAdmin && (
        <Link
          href="/admin"
          className="mb-2 flex items-center gap-3 rounded-[10px] border border-line px-3 py-2.5 text-sm font-semibold text-ink hover:bg-page"
        >
          <span className="w-4 text-center text-[13px]">⚙</span>
          Admin view
        </Link>
      )}
      <Link href="/profile" className="flex items-center gap-3 rounded-xl bg-page p-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">{initials}</span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-semibold">{name}</span>
          <span className="text-[11px] text-muted">{isAdmin ? "Admin" : "Hygiene Crew"}</span>
        </span>
      </Link>
    </aside>
  );
}
