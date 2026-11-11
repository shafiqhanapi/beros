import Link from "next/link";
import type { ClaimStatus, TimesheetStatus } from "@/lib/types";

/* Shared building blocks matching the Figma components. */

export const cardClass = "rounded-2xl border border-line bg-card";
export const btnPrimary =
  "flex items-center justify-center rounded-[14px] bg-ink py-4 text-[15px] font-semibold text-white transition active:opacity-80 disabled:bg-strong-line disabled:text-draft";
export const btnSecondary =
  "flex items-center justify-center rounded-[14px] border border-strong-line bg-card py-4 text-[15px] font-semibold text-ink transition active:bg-subtle disabled:opacity-50";
export const inputClass =
  "w-full rounded-xl border border-field bg-card p-3.5 text-[15px] text-ink outline-none placeholder:text-faint focus:border-ink";
export const labelCaps = "text-[11px] font-semibold uppercase tracking-[0.66px] text-muted";

type Status = TimesheetStatus | ClaimStatus;

const STATUS_STYLE: Record<Status, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-draft", bg: "bg-draft/10" },
  submitted: { label: "Submitted", color: "text-wait", bg: "bg-wait/10" },
  pending: { label: "Pending", color: "text-wait", bg: "bg-wait/10" },
  approved: { label: "Approved", color: "text-ok", bg: "bg-ok/10" },
  paid: { label: "Paid", color: "text-ok", bg: "bg-ok/10" },
  rejected: { label: "Rejected", color: "text-bad", bg: "bg-bad/10" },
};

/** Status pill with a coloured dot. `size="sm"` is the compact version on Recent cards. */
export function StatusPill({ status, size = "md" }: { status: Status; size?: "sm" | "md" }) {
  const s = STATUS_STYLE[status];
  const sm = size === "sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[20px] font-semibold ${s.bg} ${s.color} ${
        sm ? "gap-1 py-[3px] pr-2 pl-1.5 text-[10px]" : "gap-[5px] py-[3px] pr-[9px] pl-2 text-[11px]"
      }`}
    >
      <span className={`rounded-full bg-current ${sm ? "size-[5px]" : "size-1.5"}`} aria-hidden />
      {s.label}
    </span>
  );
}

/** Square back button (←). Hidden on desktop, where the sidebar handles navigation. */
export function BackButton({ href = "/home" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Back"
      className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-base font-semibold md:hidden"
    >
      ←
    </Link>
  );
}

export function Stat({ label, value, size = "md" }: { label: string; value: string; size?: "md" | "lg" }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className={`font-bold text-ink ${size === "lg" ? "text-[17px]" : "text-base"}`}>{value}</span>
    </div>
  );
}

/** Row of 3 stats under a divider, as in the summary cards. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full items-start border-t border-line pt-4">{children}</div>;
}

export function SectionHeader({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex w-full items-center pb-1">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="flex-1" />
      {aside != null && <span className="text-[13px] font-medium text-muted">{aside}</span>}
    </div>
  );
}

/** White card holding divided rows. */
export function ListCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${cardClass} flex flex-col px-4 [&>*+*]:border-t [&>*+*]:border-line ${className}`}>{children}</div>;
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-bad/[0.06] px-3 py-2.5 text-[13px] font-medium text-bad">
      {children}
    </p>
  );
}

/** Amber notice box used for "Submitted on…" and the PayNow notice. */
export function Notice({ title, children, icon }: { title: string; children: React.ReactNode; icon?: string }) {
  return (
    <div className="flex w-full items-start gap-3 rounded-[14px] border border-wait/30 bg-wait/[0.08] px-4 py-3.5">
      {icon && <span className="text-sm font-bold text-wait">{icon}</span>}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs leading-[18px] text-muted">{children}</p>
      </div>
    </div>
  );
}
