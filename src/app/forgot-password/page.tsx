"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { btnPrimary, ErrorNote, inputClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

async function sendResetLink(email: string) {
  return createClient().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
  });
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await sendResetLink(email);
    setBusy(false);
    if (error) return setError(error.message);
    router.push(`/forgot-password/sent?email=${encodeURIComponent(email.trim())}`);
  }

  return (
    <AuthShell
      icon="?"
      title="Forgot password?"
      subtitle="Enter your email and we’ll send you a link to reset your password."
      footer={
        <>
          <span className="text-muted">Remembered it?</span>
          <Link href="/login" className="font-semibold">
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="name@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthShell>
  );
}
