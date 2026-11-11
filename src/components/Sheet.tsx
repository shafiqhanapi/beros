"use client";

import { useEffect } from "react";

/**
 * Bottom sheet on phones (rounded top, grab handle, scrim), centred dialog on desktop.
 * Matches the "Add hours" and "New claim" sheets in Figma.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col gap-5 overflow-y-auto rounded-t-3xl bg-card px-6 pt-3 pb-[calc(34px+env(safe-area-inset-bottom))] md:max-w-[440px] md:rounded-3xl md:pt-6 md:pb-6">
        <div className="flex justify-center md:hidden">
          <span className="h-1 w-9 rounded-sm bg-[#d1d1d1]" />
        </div>
        <div className="flex items-center">
          <h2 className="text-lg font-bold">{title}</h2>
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="text-sm font-semibold text-muted">
            Cancel
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Centred confirm dialog ("Withdraw timesheet?"). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" role="alertdialog" aria-modal aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onCancel} />
      <div className="relative flex w-full max-w-[342px] flex-col gap-5 rounded-3xl bg-card p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm leading-[21px] text-muted">{children}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-[14px] border border-strong-line py-3.5 text-[15px] font-semibold">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-[14px] bg-ink py-3.5 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
