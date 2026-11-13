"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { safePath } from "@/lib/safe-path";

/**
 * Landing page for invite links. Supabase's default invite email sends the
 * session in the URL fragment (#access_token=…), which only the browser can
 * read, so this page stores it and then continues (normally to /reset-password,
 * where the new crew member chooses a password).
 */
function Accept() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = params.get("next") ?? "/reset-password";
    const safeNext = safePath(next);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    const code = params.get("code");
    const supabase = createClient();

    (async () => {
      if (hash.get("error_description")) return setError(hash.get("error_description"));
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) return setError(error.message);
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return setError(error.message);
      } else {
        return setError("This invite link is incomplete. Ask your admin to resend it.");
      }
      router.replace(safeNext);
      router.refresh();
    })();
  }, [params, router]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo size="lg" />
      {error ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-6 text-sm">
          <p className="font-semibold">This invite link didn’t work</p>
          <p className="text-muted">{error} Links expire after 24 hours; ask your admin to resend the invite.</p>
          <a href="/login" className="font-semibold underline">
            Go to sign in
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted">Setting up your account…</p>
      )}
    </main>
  );
}

export default function AcceptPage() {
  return (
    <Suspense>
      <Accept />
    </Suspense>
  );
}
