"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, ErrorNote, inputClass } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { setRememberChoice } from "@/lib/remember";
import { safePath } from "@/lib/safe-path";

const safeNext = (n?: string) => safePath(n);

export function LoginForm({ initialError, next }: { initialError: string | null; next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setRememberChoice(remember);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      setError(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
      return;
    }
    router.replace(safeNext(next));
    router.refresh();
  }

  return (
    <form onSubmit={signIn} className="flex flex-col gap-4 rounded-2xl border border-line bg-card px-5 py-6">
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
      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold">Password</span>
        <PasswordInput
          required
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <div className="flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
          <span className="flex size-[18px] items-center justify-center rounded-[5px] border border-field bg-card peer-checked:border-ink peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30">
            {remember && <Image src="/icon-check.svg" alt="" width={12} height={9.5} className="h-[7.5px] w-2.5" />}
          </span>
          <span className="text-[13px] font-medium">Keep me signed in</span>
        </label>
        <div className="flex-1" />
        <Link href="/forgot-password" className="text-[13px] font-semibold">
          Forgot password?
        </Link>
      </div>

      <ErrorNote>{error}</ErrorNote>

      <button type="submit" disabled={busy} className={btnPrimary}>
        {busy ? "Signing in…" : "Sign in"}
      </button>

    </form>
  );
}
