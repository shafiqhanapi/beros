"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** "Mark as paid" with a confirm step; generates the payslip on the server. */
export function MarkPaidButton({
  name,
  total,
  onMarkPaid,
}: {
  name: string;
  total: string;
  onMarkPaid: () => Promise<{ error?: string; ok?: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Mark ${name} as paid (${total})? This creates their payslip and can't be undone here.`)) return;
          start(async () => {
            setError(null);
            const res = await onMarkPaid();
            if (res.error) setError(res.error);
            router.refresh();
          });
        }}
        className="rounded-lg bg-ink px-3 py-[7px] text-xs font-semibold whitespace-nowrap text-white disabled:opacity-60"
      >
        {pending ? "Paying…" : "Mark as paid"}
      </button>
      {error && <span className="max-w-48 text-xs text-bad">{error}</span>}
    </div>
  );
}
