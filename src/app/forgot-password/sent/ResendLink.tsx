"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResendLink({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (!email) return null;

  async function resend() {
    setState("sending");
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/confirm?next=/reset-password`,
    });
    setState(error ? "error" : "sent");
  }

  if (state === "sent") return <span className="text-muted">Link sent again.</span>;
  return (
    <>
      <span className="text-muted">{state === "error" ? "Couldn’t resend." : "Didn’t get it?"}</span>
      <button type="button" onClick={resend} disabled={state === "sending"} className="font-semibold">
        {state === "sending" ? "Sending…" : "Resend link"}
      </button>
    </>
  );
}
