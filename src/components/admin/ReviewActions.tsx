"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ErrorNote } from "@/components/ui";

type Result = { error?: string; ok?: string };

/** Approve / Reject buttons with the reject-reason dialog. */
export function ReviewActions({
  approveLabel,
  onApprove,
  onReject,
  afterHref,
  compact = false,
}: {
  approveLabel: string;
  onApprove: () => Promise<Result>;
  onReject: (reason: string) => Promise<Result>;
  afterHref?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.error) return setError(res.error);
      setRejecting(false);
      if (afterHref) router.replace(afterHref, { scroll: false });
      router.refresh();
    });

  const btn = compact ? "py-2.5 text-sm" : "py-3.5 text-[15px]";
  return (
    <div className="flex flex-col gap-3">
      <ErrorNote>{error}</ErrorNote>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => setRejecting(true)}
          className={`flex-1 rounded-[10px] border border-strong-line bg-card font-semibold ${btn}`}
        >
          Reject
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(onApprove)}
          className={`flex-1 rounded-[10px] bg-ink font-semibold text-white disabled:opacity-60 ${btn}`}
        >
          {pending && !rejecting ? "Approving…" : approveLabel}
        </button>
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" role="dialog" aria-modal aria-label="Reject">
          <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={() => setRejecting(false)} />
          <div className="relative flex w-full max-w-[400px] flex-col gap-4 rounded-3xl bg-card p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold">Reject with a reason</h2>
              <p className="text-sm text-muted">The crew member sees this so they can fix it and resubmit.</p>
            </div>
            <textarea
              autoFocus
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. No receipt attached"
              className="w-full resize-none rounded-xl border border-field p-3.5 text-[15px] outline-none focus:border-ink"
            />
            <ErrorNote>{error}</ErrorNote>
            <div className="flex gap-3">
              <button type="button" onClick={() => setRejecting(false)} className="flex-1 rounded-[14px] border border-strong-line py-3.5 font-semibold">
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason.trim() || pending}
                onClick={() => run(() => onReject(reason))}
                className="flex-1 rounded-[14px] bg-bad py-3.5 font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** "Approve all" button for a tab of submitted / pending items. */
export function ApproveAll({ label, onApprove }: { label: string; onApprove: () => Promise<Result> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`${label}?`)) return;
        start(async () => {
          const res = await onApprove();
          setMsg(res.error ?? res.ok ?? null);
          router.refresh();
        });
      }}
      className="shrink-0 rounded-[10px] border border-strong-line bg-card px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
    >
      {pending ? "Approving…" : msg ?? label}
    </button>
  );
}
