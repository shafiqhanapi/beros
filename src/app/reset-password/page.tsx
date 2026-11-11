"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { PasswordInput } from "@/components/PasswordInput";
import { btnPrimary, ErrorNote } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/** Reached from the reset email via /auth/callback, which signs the user in first. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One number", ok: /\d/.test(password) },
    { label: "Passwords match", ok: password.length > 0 && password === confirm },
  ];
  const valid = rules.every((r) => r.ok);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(
        error.message.includes("different from the old")
          ? "Choose a password you haven’t used before."
          : error.message,
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <AuthShell icon="•••" title="Set a new password" subtitle="Choose a password you haven’t used before.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">New password</span>
          <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Confirm password</span>
          <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <ul className="flex flex-col gap-1.5">
          {rules.map((r) => (
            <li key={r.label} className="flex items-center gap-2">
              <span className={`w-3 text-xs font-bold ${r.ok ? "text-ok" : "text-[#c4c4c4]"}`}>{r.ok ? "✓" : "•"}</span>
              <span className={`text-[13px] font-medium ${r.ok ? "text-ink" : "text-muted"}`}>{r.label}</span>
            </li>
          ))}
        </ul>
        <ErrorNote>{error}</ErrorNote>
        <button type="submit" disabled={!valid || busy} className={btnPrimary}>
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}
