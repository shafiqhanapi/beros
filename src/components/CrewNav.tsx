"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

/** Mobile tab bar: at most four slots; anything else lives under "More". */
const TABS = [
  { href: "/timesheet", label: "Timesheet", icon: "▤" },
  { href: "/claims", label: "Claims", icon: "⎙" },
  { href: "/history", label: "History", icon: "☰" },
];

/** Pages in the mobile "More" menu. Add future pages here. */
const MORE = [
  { href: "/payslips", label: "Payslips", icon: "$", hint: "Download your monthly payslips" },
  { href: "/profile", label: "Profile", icon: "○", hint: "Phone, PayNow and settings" },
];

const SIDEBAR = [...TABS, ...MORE];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/** Mobile tab bar (Timesheet, Claims, History, More). Profile edit screens use a back button instead. */
export function TabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the menu after navigating.
  useEffect(() => setMoreOpen(false), [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  if (![...TABS, ...MORE].some((t) => pathname === t.href)) return null;
  const moreActive = MORE.some((m) => isActive(pathname, m.href));
  const tabClass = (active: boolean) => `flex w-full flex-col items-center gap-1 ${active ? "font-semibold text-ink" : "font-medium text-muted"}`;

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal aria-label="More">
          <button aria-label="Close menu" className="absolute inset-0 bg-ink/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-card px-4 pt-3 pb-[calc(var(--tabbar)+12px)]">
            <div className="flex justify-center pb-3">
              <span className="h-1 w-9 rounded-sm bg-[#d1d1d1]" />
            </div>
            <ul className="flex flex-col">
              {MORE.map((m) => {
                const active = isActive(pathname, m.href);
                return (
                  <li key={m.href}>
                    <Link
                      href={m.href}
                      prefetch
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 ${active ? "bg-subtle" : "active:bg-page"}`}
                    >
                      <span className="flex size-9 items-center justify-center rounded-[10px] bg-subtle text-base font-semibold">{m.icon}</span>
                      <span className="flex flex-1 flex-col">
                        <span className="text-[15px] font-semibold">{m.label}</span>
                        <span className="text-xs text-muted">{m.hint}</span>
                      </span>
                      <span className="text-muted" aria-hidden>
                        ›
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] md:hidden">
        <ul className="mx-auto flex max-w-[440px]">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <li key={t.href} className="flex-1">
                <Link href={t.href} prefetch aria-current={active ? "page" : undefined} className={tabClass(active && !moreOpen)}>
                  <span className="text-lg leading-none font-semibold">{t.icon}</span>
                  <span className="text-[11px]">{t.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((o) => !o)}
              className={tabClass(moreActive || moreOpen)}
            >
              <span className="text-lg leading-none font-semibold">⋯</span>
              <span className="text-[11px]">More</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
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
              prefetch
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
