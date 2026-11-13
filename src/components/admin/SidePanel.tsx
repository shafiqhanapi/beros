"use client";

import { useEffect } from "react";

/** Right-hand drawer on desktop, full-screen sheet on mobile (Figma A5b, A6b). */
export function SidePanel({ title, subtitle, onClose, footer, children }: { title: string; subtitle?: string; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode }) {
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
            {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-9 items-center justify-center rounded-[10px] bg-subtle text-sm font-bold">
            ✕
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">{children}</div>
        {footer && <div className="flex gap-3 border-t border-line px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
