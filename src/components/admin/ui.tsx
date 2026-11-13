import Link from "next/link";
import { initials } from "@/lib/format";

/* Building blocks for the admin screens (Figma A1–A7, AM1–AM7). */

/** Page column: phone width on mobile with room for the tab bar, full width on desktop. */
export function AdminPage({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-6 pt-[calc(24px+env(safe-area-inset-top))] pb-[calc(var(--tabbar)+24px)] md:max-w-none md:px-10 md:pt-8 md:pb-10">
      {children}
    </main>
  );
}

export function AdminHeader({ eyebrow, title, children, back }: { eyebrow?: string; title: string; children?: React.ReactNode; back?: string }) {
  return (
    <div className="flex items-center gap-3">
      {back && (
        <Link href={back} aria-label="Back" className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-card font-semibold md:hidden">
          ←
        </Link>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {eyebrow && <p className="text-[13px] font-medium text-muted">{eyebrow}</p>}
        <h1 className="truncate text-[22px] font-bold tracking-[-0.52px] md:text-[26px]">{title}</h1>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

/** Status tabs ("Submitted (3)", "Approved", …) as links. */
export function TabLinks({ tabs, active }: { tabs: { value: string; label: string; href: string }[]; active: string }) {
  return (
    <nav className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 md:mx-0 md:px-0" aria-label="Filter">
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={t.href}
          scroll={false}
          aria-current={active === t.value ? "page" : undefined}
          className={`shrink-0 rounded-full px-3 py-[7px] text-[13px] font-semibold ${
            active === t.value ? "bg-ink text-white" : "border border-line bg-card text-ink"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export const thClass = "px-4 py-3 text-left text-[11px] font-semibold tracking-[0.66px] text-muted uppercase first:pl-4";
export const tdClass = "px-4 py-3 text-sm";

export function TableCard({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-line bg-card">{children}</div>;
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-line bg-card px-4 py-8 text-center text-[13px] text-muted">{children}</p>;
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl border border-line bg-card p-4 md:p-5">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="truncate text-xl font-bold tracking-[-0.52px] md:text-[26px]">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function SmallTag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-subtle px-2 py-[3px] text-[11px] font-semibold text-muted">{children}</span>;
}
