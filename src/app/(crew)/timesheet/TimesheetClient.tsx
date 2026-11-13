"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FixedActions } from "@/components/Page";
import { PillSelect } from "@/components/PillSelect";
import { ConfirmDialog, Sheet } from "@/components/Sheet";
import {
  ErrorNote,
  ListCard,
  Notice,
  SectionHeader,
  Stat,
  StatRow,
  StatusPill,
  btnPrimary,
  btnSecondary,
  cardClass,
  inputClass,
  labelCaps,
} from "@/components/ui";
import type { TimesheetView } from "@/lib/data";
import {
  fmtDayDate,
  fmtDayTs,
  fmtDayTsLong,
  fmtHours,
  fmtMoney,
  fmtMonthName,
  fmtShortTs,
  monthEnd,
  sgDate,
} from "@/lib/format";
import type { BookingSummary } from "@/lib/types";
import { deleteEntry, saveEntry, submitTimesheet, withdrawTimesheet } from "../actions";

type Entry = TimesheetView["entries"][number];

/** What the Add hours sheet is editing. */
type SheetState =
  | { mode: "booking"; booking: BookingSummary }
  | { mode: "admin" }
  | { mode: "edit"; entry: Entry }
  | null;

export function TimesheetClient({
  view,
  rate,
  monthValue,
  monthOptions,
}: {
  view: TimesheetView;
  rate: number;
  monthValue: string;
  monthOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const { timesheet, entries, toLog, month } = view;
  const status = timesheet?.status ?? "draft";
  const editable = status === "draft" || status === "rejected";
  const pay = entries.reduce((s, e) => s + e.hours * e.rate, 0);
  const hours = entries.reduce((s, e) => s + e.hours, 0);
  const jobs = entries.length;

  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });

  const saveDraft = () => {
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  };

  /** Save draft + Submit (or Withdraw): top right on desktop, footer on mobile. */
  const actions = (where: "header" | "footer") => {
    // Header buttons are compact to sit beside the month pill; footer ones are full-size.
    const primary =
      where === "header"
        ? "rounded-[10px] bg-ink px-4 py-2 text-[13px] font-semibold text-white disabled:bg-strong-line disabled:text-draft"
        : `${btnPrimary} flex-1`;
    const secondary =
      where === "header" ? "rounded-[10px] border border-strong-line bg-card px-4 py-2 text-[13px] font-semibold disabled:opacity-50" : `${btnSecondary} flex-1`;
    if (editable)
      return (
        <>
          <button type="button" className={secondary} disabled={pending} onClick={saveDraft}>
            {saved ? "Draft saved ✓" : "Save draft"}
          </button>
          <button type="button" className={primary} disabled={pending || entries.length === 0} onClick={() => run(() => submitTimesheet(month))}>
            {pending ? "Submitting…" : "Submit timesheet"}
          </button>
        </>
      );
    if (status === "submitted")
      return (
        <button type="button" className={secondary} onClick={() => setConfirmWithdraw(true)}>
          Withdraw to edit
        </button>
      );
    return null;
  };
  const hasActions = editable || status === "submitted";

  return (
    <>
      <div className="flex w-full items-center gap-3">
        <h1 className="text-[22px] font-bold md:text-[26px]">Timesheet</h1>
        <div className="flex-1" />
        <PillSelect param="month" value={monthValue} options={monthOptions} label="Month" />
        {hasActions && <div className="hidden items-center gap-2 md:flex">{actions("header")}</div>}
      </div>

      <div className={`${cardClass} flex flex-col gap-4 p-5`}>
        <div className="flex items-center">
          <span className="text-[13px] font-medium text-muted">Hours pay</span>
          <div className="flex-1" />
          <StatusPill status={status} />
        </div>
        <p className="text-[28px] font-bold">{fmtMoney(pay)}</p>
        <StatRow>
          <Stat label="Logged" value={`${jobs} ${jobs === 1 ? "job" : "jobs"}`} />
          <Stat label="Hours" value={fmtHours(hours)} />
          <Stat label="To log" value={`${toLog.length} ${toLog.length === 1 ? "job" : "jobs"}`} />
        </StatRow>
      </div>

      {status === "submitted" && timesheet?.submitted_at && (
        <Notice title={`Submitted on ${fmtShortTs(timesheet.submitted_at)}`}>
          Waiting for review. Withdraw if you need to add or change hours.
        </Notice>
      )}
      {status === "rejected" && (
        <div className="flex flex-col gap-0.5 rounded-[14px] border border-bad/30 bg-bad/[0.06] px-4 py-3.5">
          <p className="text-sm font-semibold">Returned for changes</p>
          <p className="text-xs text-muted">{timesheet?.reject_reason || "Please check your hours and submit again."}</p>
        </div>
      )}
      {status === "approved" && (
        <div className="rounded-[14px] border border-ok/30 bg-ok/[0.06] px-4 py-3.5">
          <p className="text-sm font-semibold">Approved</p>
          <p className="text-xs text-muted">Payout will be made within the next 24 to 48 hours.</p>
        </div>
      )}
      {status === "paid" && timesheet?.paid_at && (
        <div className="rounded-[14px] border border-ok/30 bg-ok/[0.06] px-4 py-3.5">
          <p className="text-sm font-semibold">Paid on {fmtShortTs(timesheet.paid_at)}</p>
          <p className="text-xs text-muted">Your payslip is under Payslips.</p>
        </div>
      )}

      <ErrorNote>{error}</ErrorNote>

      <section className="flex flex-col gap-1">
        <SectionHeader title="Assigned Jobs" aside={`${toLog.length} to log`} />
        {toLog.length === 0 ? (
          <p className={`${cardClass} px-4 py-4 text-[13px] text-muted`}>No assigned jobs left to log this month.</p>
        ) : (
          <ListCard>
            {toLog.map((b) => (
              <div key={b.id} className="flex items-center gap-3 py-3.5">
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="truncate text-sm font-semibold">{b.title}</p>
                  <p className="truncate text-xs text-muted">
                    {fmtDayTs(b.scheduled_at)} · {b.address}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => setSheet({ mode: "booking", booking: b })}
                  className="shrink-0 rounded-[10px] bg-ink px-3 py-2 text-xs font-semibold text-white disabled:bg-segment disabled:text-faint"
                >
                  + Hours
                </button>
              </div>
            ))}
          </ListCard>
        )}
        {editable && (
          <button
            type="button"
            onClick={() => setSheet({ mode: "admin" })}
            className="mt-2 flex items-center justify-center rounded-[14px] border border-dashed border-[#d1d1d1] py-3.5 text-sm font-semibold whitespace-pre"
          >
            {"+  Add another entry"}
          </button>
        )}
      </section>

      <section className="flex flex-col gap-1">
        <SectionHeader title="Logged" aside={editable ? (entries.length ? "Tap to edit" : null) : "Locked"} />
        {entries.length === 0 ? (
          <p className={`${cardClass} px-4 py-4 text-[13px] text-muted`}>No hours logged yet.</p>
        ) : (
          <ListCard>
            {entries.map((e) => (
              <button
                key={e.id}
                type="button"
                disabled={!editable}
                onClick={() => setSheet({ mode: "edit", entry: e })}
                className="flex items-center gap-3 py-3.5 text-left disabled:cursor-default"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="truncate text-sm font-semibold">{e.booking?.title ?? "Admin matters"}</p>
                  <p className="truncate text-xs text-muted">
                    {fmtDayDate(e.work_date)} · {e.booking ? e.booking.address : e.note || "Admin matters"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-[3px]">
                  <p className="text-sm font-semibold">{fmtHours(e.hours)}</p>
                  <p className="text-xs text-muted">{fmtMoney(e.hours * e.rate)}</p>
                </div>
              </button>
            ))}
          </ListCard>
        )}
      </section>

      {hasActions && (
        <div className="md:hidden">
          <FixedActions aboveTabs>{actions("footer")}</FixedActions>
        </div>
      )}

      <ConfirmDialog
        open={confirmWithdraw}
        title="Withdraw timesheet?"
        confirmLabel={pending ? "Withdrawing…" : "Withdraw"}
        busy={pending}
        onCancel={() => setConfirmWithdraw(false)}
        onConfirm={() => run(() => withdrawTimesheet(month), () => setConfirmWithdraw(false))}
      >
        Your {fmtMonthName(month)} timesheet will go back to draft so you can edit it. Remember to submit it again by{" "}
        {Number(monthEnd(month).slice(8))} {fmtMonthName(month).slice(0, 3)}.
      </ConfirmDialog>

      {sheet && (
        <HoursSheet
          key={sheet.mode === "edit" ? sheet.entry.id : sheet.mode === "booking" ? sheet.booking.id : "admin"}
          state={sheet}
          month={month}
          rate={sheet.mode === "edit" ? sheet.entry.rate : rate}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

const CHIPS = [2, 3, 4, 5, 6];

function HoursSheet({
  state,
  month,
  rate,
  onClose,
  onSaved,
}: {
  state: NonNullable<SheetState>;
  month: string;
  rate: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const entry = state.mode === "edit" ? state.entry : null;
  const booking = state.mode === "booking" ? state.booking : entry?.booking ?? null;
  const isAdmin = state.mode === "admin" || (entry !== null && !entry.booking_id);
  const today = sgDate();
  const defaultDate = today >= month && today <= monthEnd(month) ? today : monthEnd(month);

  const [hours, setHours] = useState(entry?.hours ?? 4);
  const [note, setNote] = useState(entry?.note ?? "");
  const [date, setDate] = useState(entry?.work_date ?? defaultDate);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const step = (d: number) => setHours((h) => Math.min(24, Math.max(0.5, Math.round((h + d) * 2) / 2)));

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveEntry({
        month,
        entryId: entry?.id,
        bookingId: state.mode === "booking" ? state.booking.id : undefined,
        workDate: isAdmin ? date : undefined,
        hours,
        note,
      });
      if (res.error) setError(res.error);
      else onSaved();
    });

  const remove = () =>
    start(async () => {
      if (!entry) return;
      const res = await deleteEntry(entry.id);
      if (res.error) setError(res.error);
      else onSaved();
    });

  return (
    <Sheet open title={entry ? "Edit hours" : "Add hours"} onClose={onClose}>
      {booking ? (
        <div className="flex flex-col gap-1 rounded-[14px] bg-subtle p-4">
          <div className="flex items-center">
            <p className="text-[15px] font-semibold">{booking.title}</p>
            <div className="flex-1" />
            <span className="text-[11px] font-semibold text-muted">Booked</span>
          </div>
          <p className="text-[13px] text-muted">
            {fmtDayTsLong(booking.scheduled_at)} · {booking.address}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center rounded-[14px] bg-subtle p-4">
            <p className="text-[15px] font-semibold">Admin matters</p>
            <div className="flex-1" />
            <span className="text-[11px] font-semibold text-muted">Non-cleaning work</span>
          </div>
          <label className="flex flex-col gap-2">
            <span className={labelCaps}>Date</span>
            <input
              type="date"
              min={month}
              max={monthEnd(month)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} relative`}
            />
          </label>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <span className={labelCaps}>Hours worked</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Less"
            onClick={() => step(-0.5)}
            className="flex size-14 items-center justify-center rounded-2xl border border-strong-line text-[22px] font-medium"
          >
            −
          </button>
          <div className="flex flex-1 flex-col items-center gap-0.5">
            <span className="text-4xl font-bold" aria-live="polite">
              {Number(hours.toFixed(1))}
            </span>
            <span className="text-xs font-medium text-muted">hours</span>
          </div>
          <button
            type="button"
            aria-label="More"
            onClick={() => step(0.5)}
            className="flex size-14 items-center justify-center rounded-2xl border border-strong-line text-[22px] font-medium"
          >
            +
          </button>
        </div>
        <div className="flex gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setHours(c)}
              className={`flex-1 rounded-[10px] py-2 text-[13px] font-semibold ${hours === c ? "bg-ink text-white" : "bg-subtle"}`}
            >
              {c}h
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className={labelCaps}>{isAdmin ? "Note" : "Note (optional)"}</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isAdmin ? "e.g. Stock take" : "e.g. Extra time for balcony"}
          maxLength={200}
          className={`${inputClass} text-sm`}
        />
      </label>

      <div className="flex items-center border-t border-line pt-4">
        <div className="flex flex-1 flex-col gap-0.5 text-muted">
          <span className="text-[13px] font-medium">Pay for this job</span>
          <span className="text-xs">
            {fmtHours(hours)} × {fmtMoney(rate)}
          </span>
        </div>
        <span className="text-[22px] font-bold">{fmtMoney(hours * rate)}</span>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <button type="button" onClick={save} disabled={pending || (isAdmin && !note.trim())} className={btnPrimary}>
        {pending ? "Saving…" : "Save hours"}
      </button>
      {entry && (
        <button type="button" onClick={remove} disabled={pending} className="-mt-2 py-1 text-sm font-semibold text-bad">
          Delete entry
        </button>
      )}
    </Sheet>
  );
}
