"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Avatar, TableCard, tdClass, thClass } from "@/components/admin/ui";
import { ErrorNote } from "@/components/ui";
import type { AdminCrew } from "@/lib/admin-data";
import { PHONE_ERROR, fmtMoneyShort, fmtMonthShort, fmtPhone, isSgMobile, parseDate, phoneDigits } from "@/lib/format";
import { inviteCrew, resendInvite, setCrewActive, updateCrew, updateCrewPayNow, type CrewInput } from "../actions";

const STATUS = {
  active: { label: "Active", cls: "bg-ok/10 text-ok" },
  invited: { label: "Invited", cls: "bg-wait/10 text-wait" },
  inactive: { label: "Inactive", cls: "bg-draft/10 text-draft" },
} as const;

function CrewStatus({ status }: { status: AdminCrew["status"] }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-[5px] rounded-[20px] py-[3px] pr-[9px] pl-2 text-[11px] font-semibold ${s.cls}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

const recentlyUpdated = (iso: string | null) => {
  if (!iso) return null;
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5;
  if (hours > 72) return null;
  return hours < 1 ? "PayNow updated just now" : hours < 24 ? `PayNow updated ${Math.round(hours)}h ago` : `PayNow updated ${Math.round(hours / 24)}d ago`;
};

type Panel = { mode: "add" } | { mode: "edit"; id: string } | null;

export function CrewClient({ crew, meId, today, canInvite }: { crew: AdminCrew[]; meId: string; today: string; canInvite: boolean }) {
  const [q, setQ] = useState("");
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();
  const [resending, startResend] = useTransition();

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? crew.filter((c) => `${c.full_name} ${c.email} ${c.phone ?? ""}`.toLowerCase().includes(s)) : crew;
  }, [crew, q]);
  const active = crew.filter((c) => c.status === "active").length;
  const inactive = crew.filter((c) => c.status === "inactive").length;
  const editing = panel?.mode === "edit" ? crew.find((c) => c.id === panel.id) ?? null : null;

  const resend = (id: string) =>
    startResend(async () => {
      const res = await resendInvite(id);
      setNotice(res.error ?? res.ok ?? null);
    });

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[13px] font-medium text-muted">
            {active} active{inactive ? ` · ${inactive} inactive` : ""}
          </p>
          <h1 className="text-[22px] font-bold tracking-[-0.52px] md:text-[26px]">Crew</h1>
        </div>
        <button type="button" onClick={() => setPanel({ mode: "add" })} className="rounded-[10px] bg-ink px-4 py-2.5 text-sm font-semibold whitespace-pre text-white">
          {"+  Add crew"}
        </button>
      </div>

      {!canInvite && (
        <p className="rounded-xl border border-wait/30 bg-wait/[0.08] px-4 py-3 text-[13px]">
          <strong>Invites are off:</strong> add <code>SUPABASE_SERVICE_ROLE_KEY</code> to the Vercel project to send crew invites and block logins on
          deactivation.
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-card px-4 py-3 text-[13px] font-medium" onClick={() => setNotice(null)}>
          {notice}
        </p>
      )}

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search crew"
        aria-label="Search crew"
        className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-ink"
      />

      <div className="hidden md:block">
        <TableCard>
          <table className="w-full">
            <thead className="bg-[#fafafa]">
              <tr>
                <th className={thClass}>Crew</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Phone</th>
                <th className={thClass}>Rate</th>
                <th className={thClass}>Started</th>
                <th className={thClass}>Status</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className={tdClass}>
                    <span className="flex items-center gap-2.5">
                      <Avatar name={c.full_name} size={24} />
                      <span className="flex flex-col">
                        <span className="font-semibold">
                          {c.full_name}
                          {c.role === "admin" && <span className="ml-1.5 text-[11px] font-semibold text-muted">Admin</span>}
                        </span>
                        {recentlyUpdated(c.paynow_updated_at) && <span className="text-[11px] text-muted">{recentlyUpdated(c.paynow_updated_at)}</span>}
                      </span>
                    </span>
                  </td>
                  <td className={`${tdClass} text-[13px] text-muted`}>{c.email}</td>
                  <td className={`${tdClass} text-[13px] text-muted`}>{c.phone ? fmtPhone(c.phone) : "—"}</td>
                  <td className={tdClass}>{fmtMoneyShort(c.hourly_rate)}/h</td>
                  <td className={`${tdClass} text-[13px] text-muted`}>{fmtMonthShort(c.start_date)}</td>
                  <td className={tdClass}>
                    <CrewStatus status={c.status} />
                  </td>
                  <td className={tdClass}>
                    <span className="flex gap-2">
                      {c.status === "invited" && (
                        <button type="button" disabled={resending} onClick={() => resend(c.id)} className="rounded-lg border border-strong-line px-3 py-[7px] text-xs font-semibold">
                          Resend
                        </button>
                      )}
                      <button type="button" onClick={() => setPanel({ mode: "edit", id: c.id })} className="rounded-lg border border-strong-line px-3 py-[7px] text-xs font-semibold">
                        Edit
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="border-t border-line px-4 py-6 text-center text-[13px] text-muted">No crew match “{q}”.</p>}
        </TableCard>
      </div>

      <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card md:hidden">
        {list.map((c) => (
          <button key={c.id} type="button" onClick={() => setPanel({ mode: "edit", id: c.id })} className="flex items-center gap-3 border-line px-4 py-3.5 text-left [&+&]:border-t">
            <Avatar name={c.full_name} size={40} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-[15px] font-semibold">{c.full_name}</p>
              <p className="truncate text-xs text-muted">
                {c.phone ? `+65 ${fmtPhone(c.phone)}` : c.email} · {fmtMoneyShort(c.hourly_rate)}/h
              </p>
            </div>
            <CrewStatus status={c.status} />
          </button>
        ))}
      </div>

      {panel?.mode === "add" && (
        <AddCrewPanel
          today={today}
          onClose={() => setPanel(null)}
          onDone={(msg) => {
            setPanel(null);
            setNotice(msg);
            router.refresh();
          }}
        />
      )}
      {editing && (
        <EditCrewPanel
          key={editing.id}
          crew={editing}
          isMe={editing.id === meId}
          onResend={() => resend(editing.id)}
          onClose={() => setPanel(null)}
          onDone={(msg) => {
            setPanel(null);
            setNotice(msg);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Side panel + fields
// ---------------------------------------------------------------------------

function SidePanel({ title, subtitle, onClose, footer, children }: { title: string; subtitle: string; onClose: () => void; footer: React.ReactNode; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex h-full w-full flex-col bg-card md:w-[480px]">
        <div className="flex items-start gap-3 border-b border-line px-6 pt-[calc(20px+env(safe-area-inset-top))] pb-4 md:pt-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="truncate text-[13px] text-muted">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-9 items-center justify-center rounded-[10px] bg-subtle text-sm font-bold">
            ✕
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">{children}</div>
        <div className="flex gap-3 border-t border-line px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]">{footer}</div>
      </div>
    </div>
  );
}

const fieldBox = (error: boolean, locked = false) =>
  `flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-sm ${
    locked ? "bg-subtle text-muted" : "bg-card focus-within:border-ink"
  } ${error ? "border-[1.5px] border-bad" : "border border-field"}`;

function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="text-[13px] font-semibold">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-bad">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function PhoneInput({ value, onChange, onBlur, error }: { value: string; onChange: (v: string) => void; onBlur?: () => void; error: boolean }) {
  return (
    <div className={fieldBox(error)}>
      <span className="text-muted">+65</span>
      <input
        type="tel"
        inputMode="numeric"
        value={fmtPhone(value)}
        onChange={(e) => onChange(phoneDigits(e.target.value))}
        onBlur={onBlur}
        placeholder="9123 4567"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
      />
    </div>
  );
}

function useCrewForm(init: CrewInput) {
  const [f, setF] = useState(init);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = {
    fullName: f.fullName.trim() ? null : "Enter the crew member's full name",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email?.trim() ?? "") ? null : "Enter a valid email address",
    phone: isSgMobile(f.phone) ? null : PHONE_ERROR,
    hourlyRate: Number(f.hourlyRate) > 0 ? null : "Enter a rate above $0",
    startDate: f.startDate ? null : "Pick a start date",
  };
  const show = (k: keyof typeof errors) => (touched[k] ? errors[k] : null);
  const touch = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const set = <K extends keyof CrewInput>(k: K, v: CrewInput[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setTouched((t) => ({ ...t, [k]: true }));
  };
  return { f, set, errors, show, touch };
}

function RateDate({ form, rateHint }: { form: ReturnType<typeof useCrewForm>; rateHint?: string }) {
  const { f, set, show, touch } = form;
  return (
    <div className="flex gap-3">
      <Field label="Hourly rate" error={show("hourlyRate")} hint={rateHint}>
        <div className={fieldBox(Boolean(show("hourlyRate")))}>
          <span className="text-muted">$</span>
          <input
            inputMode="decimal"
            value={String(f.hourlyRate)}
            onChange={(e) => set("hourlyRate", e.target.value.replace(/[^\d.]/g, "") as unknown as number)}
            onBlur={touch("hourlyRate")}
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
          <span className="text-xs text-muted">/ hour</span>
        </div>
      </Field>
      <Field label="Start date" error={show("startDate")}>
        <input type="date" value={f.startDate} onChange={(e) => set("startDate", e.target.value)} className={fieldBox(Boolean(show("startDate")))} />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add crew
// ---------------------------------------------------------------------------

function AddCrewPanel({ today, onClose, onDone }: { today: string; onClose: () => void; onDone: (msg: string) => void }) {
  const form = useCrewForm({ fullName: "", email: "", phone: "", hourlyRate: 20, startDate: today });
  const { f, set, errors, show, touch } = form;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const valid = Object.values(errors).every((e) => !e);

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await inviteCrew({ ...f, hourlyRate: Number(f.hourlyRate) });
      if (res.error) setError(res.error);
      else onDone(res.ok ?? "Invite sent");
    });

  return (
    <SidePanel
      title="Add crew"
      subtitle="They’ll get an email invite to the Crew Portal."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 rounded-[10px] border border-strong-line py-3 text-sm font-semibold">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={!valid || pending} className="flex-1 rounded-[10px] bg-ink py-3 text-sm font-semibold text-white disabled:bg-strong-line disabled:text-draft">
            {pending ? "Sending…" : "Send invite"}
          </button>
        </>
      }
    >
      <Field label="Full name" error={show("fullName")}>
        <input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} onBlur={touch("fullName")} autoFocus className={fieldBox(Boolean(show("fullName")))} />
      </Field>
      <Field label="Email" error={show("email")}>
        <input
          type="email"
          inputMode="email"
          value={f.email}
          onChange={(e) => set("email", e.target.value)}
          onBlur={touch("email")}
          className={fieldBox(Boolean(show("email")))}
        />
      </Field>
      <Field label="Mobile number" error={show("phone")}>
        <PhoneInput value={f.phone} onChange={(v) => set("phone", v)} onBlur={touch("phone")} error={Boolean(show("phone"))} />
      </Field>
      <RateDate form={form} />
      <ErrorNote>{error}</ErrorNote>
    </SidePanel>
  );
}

// ---------------------------------------------------------------------------
// Edit crew
// ---------------------------------------------------------------------------

function EditCrewPanel({
  crew,
  isMe,
  onResend,
  onClose,
  onDone,
}: {
  crew: AdminCrew;
  isMe: boolean;
  onResend: () => void;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const form = useCrewForm({ fullName: crew.full_name, email: crew.email, phone: crew.phone ?? "", hourlyRate: crew.hourly_rate, startDate: crew.start_date });
  const { f, set, errors, show, touch } = form;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const valid = !errors.fullName && !errors.phone && !errors.hourlyRate && !errors.startDate;

  const [payEdit, setPayEdit] = useState(false);
  const [payName, setPayName] = useState(crew.paynow_name ?? crew.full_name);
  const [payPhone, setPayPhone] = useState(crew.paynow_phone ?? "");
  const [payError, setPayError] = useState<string | null>(null);
  const [payPending, startPay] = useTransition();
  const router = useRouter();

  const save = () =>
    start(async () => {
      setError(null);
      const res = await updateCrew(crew.id, { ...f, hourlyRate: Number(f.hourlyRate) });
      if (res.error) setError(res.error);
      else onDone(`${f.fullName} saved`);
    });

  const savePayNow = () =>
    startPay(async () => {
      setPayError(null);
      const res = await updateCrewPayNow(crew.id, payName, payPhone);
      if (res.error) return setPayError(res.error);
      setPayEdit(false);
      router.refresh();
    });

  const toggleActive = () => {
    const deactivate = crew.status !== "inactive";
    if (deactivate && !confirm(`Deactivate ${crew.full_name}? They won't be able to sign in. Their history and payslips are kept.`)) return;
    start(async () => {
      const res = await setCrewActive(crew.id, !deactivate);
      if (res.error) setError(res.error);
      else onDone(`${crew.full_name} ${deactivate ? "deactivated" : "reactivated"}`);
    });
  };

  const since = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(parseDate(crew.start_date));

  return (
    <SidePanel
      title="Edit crew"
      subtitle={`${crew.full_name} · ${crew.status === "active" ? "Active" : crew.status === "invited" ? "Invited" : "Inactive"} since ${since}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 rounded-[10px] border border-strong-line py-3 text-sm font-semibold">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!valid || pending} className="flex-1 rounded-[10px] bg-ink py-3 text-sm font-semibold text-white disabled:bg-strong-line disabled:text-draft">
            {pending ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <Field label="Full name" error={show("fullName")}>
        <input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} onBlur={touch("fullName")} className={fieldBox(Boolean(show("fullName")))} />
      </Field>
      <Field label="Email (login)" hint="Email can’t be changed. To use a new email, deactivate this account and add them as new crew.">
        <div className={fieldBox(false, true)}>
          <span className="min-w-0 flex-1 truncate">{crew.email}</span>
          <span className="text-[11px] font-semibold">Locked</span>
        </div>
      </Field>
      <Field label="Mobile number" error={show("phone")}>
        <PhoneInput value={f.phone} onChange={(v) => set("phone", v)} onBlur={touch("phone")} error={Boolean(show("phone"))} />
      </Field>
      <RateDate form={form} rateHint="New rate applies to hours logged from today." />

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">PayNow</span>
        <div className="flex flex-col gap-3 rounded-xl border border-line p-3.5">
          {payEdit ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Name on PayNow</span>
                <input value={payName} onChange={(e) => setPayName(e.target.value)} className={fieldBox(!payName.trim())} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">PayNow mobile number</span>
                <PhoneInput value={payPhone} onChange={setPayPhone} error={payPhone.length === 8 && !isSgMobile(payPhone)} />
              </label>
              <ErrorNote>{payError}</ErrorNote>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPayEdit(false)} className="rounded-lg border border-strong-line px-3 py-2 text-xs font-semibold">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={savePayNow}
                  disabled={payPending || !payName.trim() || !isSgMobile(payPhone)}
                  className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {payPending ? "Saving…" : "Save"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                <span className="font-medium">{crew.paynow_name ?? "Not set"}</span>
                <span className="text-xs text-muted">{crew.paynow_phone ? `+65 ${fmtPhone(crew.paynow_phone)}` : "No PayNow number yet"}</span>
              </div>
              <button type="button" onClick={() => setPayEdit(true)} className="rounded-lg border border-strong-line px-3 py-2 text-xs font-semibold">
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
        {crew.status === "invited" && (
          <button type="button" onClick={onResend} className="self-start text-sm font-semibold underline">
            Resend invite
          </button>
        )}
        {!isMe && (
          <button type="button" onClick={toggleActive} disabled={pending} className={`self-start text-sm font-semibold ${crew.status === "inactive" ? "text-ink" : "text-bad"}`}>
            {crew.status === "inactive" ? "Reactivate account" : "Deactivate account"}
          </button>
        )}
        <span className="text-xs text-muted">Deactivating blocks sign-in and keeps their history and payslips.</span>
      </div>
    </SidePanel>
  );
}
