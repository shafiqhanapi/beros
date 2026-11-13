"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Avatar, EmptyRow, TabLinks, TableCard, tdClass, thClass } from "@/components/admin/ui";
import { SidePanel } from "@/components/admin/SidePanel";
import { PillSelect } from "@/components/PillSelect";
import { ErrorNote } from "@/components/ui";
import type { AdminBooking, Catalogue } from "@/lib/catalogue-data";
import { fmtDayTs, fmtMoney, fmtMonth, fmtPhone, TZ } from "@/lib/format";
import { saveAssignment, setBookingStatus } from "../catalogue-actions";
import { NewBookingPanel } from "./NewBookingPanel";

export type CrewOption = { id: string; name: string; status: "invited" | "active" | "inactive" };

const TABS = [
  { value: "unassigned", label: "Unassigned" },
  { value: "assigned", label: "Assigned" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
] as const;
type Tab = (typeof TABS)[number]["value"];

const SOURCE_LABEL = { app: "BEROS app", whatsapp: "WhatsApp", phone: "Phone", walk_in: "Walk-in", other: "Other" } as const;

const inTab = (b: AdminBooking, t: Tab) =>
  t === "all" ||
  (t === "completed" && b.status === "completed") ||
  (t === "unassigned" && b.status === "scheduled" && b.crewIds.length === 0) ||
  (t === "assigned" && b.status === "scheduled" && b.crewIds.length > 0);

const time = (iso: string) => new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ }).format(new Date(iso)).toLowerCase();

function BookingPill({ b }: { b: AdminBooking }) {
  const [label, cls] =
    b.status === "cancelled"
      ? ["Cancelled", "bg-bad/10 text-bad"]
      : b.status === "completed"
        ? ["Completed", "bg-ok/10 text-ok"]
        : b.crewIds.length
          ? ["Assigned", "bg-ok/10 text-ok"]
          : ["Unassigned", "bg-wait/10 text-wait"];
  return (
    <span className={`inline-flex shrink-0 items-center gap-[5px] rounded-[20px] py-[3px] pr-[9px] pl-2 text-[11px] font-semibold ${cls}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function BookingsClient({
  bookings,
  crew,
  catalogue,
  month,
  monthValue,
  monthOptions,
  tab: tabParam,
  today,
}: {
  bookings: AdminBooking[];
  crew: CrewOption[];
  catalogue: Catalogue;
  month: string;
  monthValue: string;
  monthOptions: { value: string; label: string }[];
  tab?: string;
  today: string;
}) {
  const tab: Tab = (TABS.find((t) => t.value === tabParam)?.value ?? "unassigned") as Tab;
  const rows = useMemo(() => bookings.filter((b) => inTab(b, tab)), [bookings, tab]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const selected = rows.find((b) => b.id === selectedId) ?? rows[0] ?? null;
  const names = new Map(crew.map((c) => [c.id, c.name]));
  const router = useRouter();

  const open = (id: string) => {
    setSelectedId(id);
    setMobileOpen(true);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="hidden text-[13px] font-medium text-muted md:block">Synced from the BEROS app</p>
          <h1 className="text-[22px] font-bold tracking-[-0.52px] md:text-[26px]">Bookings</h1>
        </div>
        <PillSelect param="month" value={monthValue} options={monthOptions} label="Month" />
        <button type="button" onClick={() => setCreating(true)} className="rounded-[10px] bg-ink px-3.5 py-2.5 text-sm font-semibold whitespace-pre text-white">
          <span className="md:hidden">+ New</span>
          <span className="hidden md:inline">{"+  New booking"}</span>
        </button>
      </div>

      <TabLinks
        active={tab}
        tabs={TABS.map((t) => {
          const n = bookings.filter((b) => inTab(b, t.value)).length;
          return { value: t.value, label: t.value === "unassigned" ? `${t.label} (${n})` : t.label, href: `/admin/bookings?month=${monthValue}&tab=${t.value}` };
        })}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          {rows.length === 0 ? (
            <EmptyRow>No {tab === "all" ? "" : `${tab} `}bookings for {fmtMonth(month)}.</EmptyRow>
          ) : (
            <>
              <div className="hidden md:block">
                <TableCard>
                  <table className="w-full">
                    <thead className="bg-[#fafafa]">
                      <tr>
                        <th className={thClass}>Date</th>
                        <th className={thClass}>Booking</th>
                        <th className={thClass}>Customer</th>
                        <th className={thClass}>Crew</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((b) => (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedId(b.id)}
                          className={`cursor-pointer border-t border-line ${selected?.id === b.id ? "bg-[#fafafa]" : "hover:bg-[#fcfcfc]"}`}
                        >
                          <td className={`${tdClass} whitespace-nowrap`}>{fmtDayTs(b.scheduled_at)}</td>
                          <td className={tdClass}>
                            <p className="font-semibold">{b.title}</p>
                            <p className="text-xs text-muted">{b.address}</p>
                          </td>
                          <td className={`${tdClass} text-[13px] text-muted`}>{b.customer_name}</td>
                          <td className={tdClass}>
                            {b.crewIds.length ? (
                              <span className="flex -space-x-1">
                                {b.crewIds.map((id) => (
                                  <span key={id} title={names.get(id)} className="rounded-full ring-2 ring-card">
                                    <Avatar name={names.get(id) ?? "?"} size={24} />
                                  </span>
                                ))}
                              </span>
                            ) : b.status === "scheduled" ? (
                              <button type="button" className="rounded-lg border border-strong-line px-3 py-[7px] text-xs font-semibold">
                                + Assign
                              </button>
                            ) : (
                              <span className="text-xs text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableCard>
              </div>
              <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card md:hidden">
                {rows.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 border-line px-4 py-3.5 [&+&]:border-t">
                    <button type="button" onClick={() => open(b.id)} className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                      <p className="truncate text-[15px] font-semibold">{b.title}</p>
                      <p className="truncate text-xs text-muted">
                        {fmtDayTs(b.scheduled_at)} · {b.address}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => open(b.id)}
                      className={`shrink-0 rounded-[10px] px-3.5 py-2 text-sm font-semibold ${b.crewIds.length ? "border border-strong-line" : "bg-ink text-white"}`}
                    >
                      {b.crewIds.length ? "View" : "Assign"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {selected && (
          <section className="hidden w-[380px] shrink-0 rounded-2xl border border-line bg-card p-5 md:block">
            <BookingDetail key={selected.id} booking={selected} crew={crew} onSaved={() => router.refresh()} />
          </section>
        )}
      </div>

      {mobileOpen && selected && (
        <div className="md:hidden">
          <SidePanel title={selected.title} subtitle={`${fmtDayTs(selected.scheduled_at)} · ${time(selected.scheduled_at)}`} onClose={() => setMobileOpen(false)} footer={null}>
            <BookingDetail
              key={selected.id}
              booking={selected}
              crew={crew}
              hideHeader
              onSaved={() => {
                setMobileOpen(false);
                router.refresh();
              }}
            />
          </SidePanel>
        </div>
      )}

      {creating && (
        <NewBookingPanel
          catalogue={catalogue}
          crew={crew.filter((c) => c.status !== "inactive")}
          today={today}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function BookingDetail({ booking: b, crew, hideHeader = false, onSaved }: { booking: AdminBooking; crew: CrewOption[]; hideHeader?: boolean; onSaved: () => void }) {
  const [picked, setPicked] = useState<string[]>(b.crewIds);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const options = crew.filter((c) => c.status !== "inactive" || b.crewIds.includes(c.id));
  const dirty = picked.length !== b.crewIds.length || picked.some((id) => !b.crewIds.includes(id));

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveAssignment(b.id, picked);
      if (res.error) return setError(res.error);
      setSaved(true);
      onSaved();
    });

  const status = (s: "scheduled" | "completed" | "cancelled") =>
    start(async () => {
      if (s === "cancelled" && !confirm("Cancel this booking? It will drop out of crew's To log lists.")) return;
      const res = await setBookingStatus(b.id, s);
      if (res.error) setError(res.error);
      else onSaved();
    });

  const details: [string, string][] = [
    ["Customer", b.customer_name],
    ...(b.customer_phone ? ([["Mobile", `+65 ${fmtPhone(b.customer_phone)}`]] as [string, string][]) : []),
    ["Address", `${b.address}${b.postal_code ? ` S${b.postal_code}` : ""}`],
    ["Booking ref", b.ref ? `#${b.ref}` : "—"],
    ["Source", SOURCE_LABEL[b.source]],
  ];

  return (
    <div className="flex flex-col gap-5">
      {!hideHeader && (
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-[17px] font-bold">{b.title}</p>
            <p className="text-xs text-muted">
              {fmtDayTs(b.scheduled_at)} · {time(b.scheduled_at)}
            </p>
          </div>
          <BookingPill b={b} />
        </div>
      )}

      <dl className="flex flex-col gap-2.5 rounded-xl bg-subtle p-4 text-[13px]">
        {details.map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="text-muted">{k}</dt>
            <dd className="flex-1 text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-1.5 text-[13px]">
        {b.items.map((i, n) => (
          <div key={n} className="flex gap-3">
            <span className="flex-1">
              {i.label}
              {i.quantity > 1 ? ` × ${i.quantity}` : ""}
            </span>
            <span className="text-muted">{fmtMoney(i.line_total)}</span>
          </div>
        ))}
        {b.addOns.map((a, n) => (
          <div key={`a${n}`} className="flex gap-3">
            <span className="flex-1">
              {a.name}
              {a.quantity > 1 ? ` × ${a.quantity}` : ""}
            </span>
            <span className="text-muted">{fmtMoney(a.quantity * a.unit_price)}</span>
          </div>
        ))}
        <div className="flex gap-3 border-t border-line pt-1.5 font-semibold">
          <span className="flex-1">Total</span>
          <span>{fmtMoney(b.total)}</span>
        </div>
        {b.notes && <p className="text-muted">Notes: {b.notes}</p>}
      </div>

      {b.status !== "cancelled" && (
        <div className="flex flex-col gap-1">
          <h3 className="pb-1 text-sm font-bold">Assign crew</h3>
          {options.length === 0 && <p className="text-[13px] text-muted">No active crew yet. Add crew first.</p>}
          {options.map((c) => {
            const on = picked.includes(c.id);
            return (
              <label key={c.id} className="flex cursor-pointer items-center gap-3 border-line py-2.5 [&+&]:border-t">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => {
                    setSaved(false);
                    setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]));
                  }}
                  className="size-[18px] accent-ink"
                />
                <Avatar name={c.name} size={24} />
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                {c.status === "invited" && <span className="text-[11px] text-muted">Invited</span>}
              </label>
            );
          })}
          <ErrorNote>{error}</ErrorNote>
          <button type="button" onClick={save} disabled={pending || !dirty} className="mt-2 rounded-[10px] bg-ink py-3 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Saving…" : saved && !dirty ? "Saved ✓" : "Save assignment"}
          </button>
          <p className="text-xs text-muted">Assigned crew will see this booking under “To log” in their timesheet.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-[13px] font-semibold">
        {b.status === "scheduled" && (
          <button type="button" disabled={pending} onClick={() => status("completed")}>
            Mark completed
          </button>
        )}
        {b.status !== "scheduled" && (
          <button type="button" disabled={pending} onClick={() => status("scheduled")}>
            Reopen as scheduled
          </button>
        )}
        {b.status !== "cancelled" && (
          <button type="button" disabled={pending} onClick={() => status("cancelled")} className="text-bad">
            Cancel booking
          </button>
        )}
      </div>
    </div>
  );
}
