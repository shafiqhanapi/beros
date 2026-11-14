"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safePath } from "@/lib/safe-path";

const TYPES: EmailOtpType[] = ["invite", "recovery", "magiclink", "email", "signup"];

/**
 * Verifies an email link (invite or password reset) on the server, so it works
 * in whatever browser or email app opened it. Runs only when the person taps
 * "Continue", so email security scanners that pre-open links can't use it up.
 */
export async function confirmLink(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as EmailOtpType;
  const next = safePath(String(formData.get("next") ?? ""), "/reset-password");
  if (!tokenHash || !TYPES.includes(type)) redirect(`/auth/link-expired?reason=invalid&type=${encodeURIComponent(type)}`);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) redirect(`/auth/link-expired?type=${encodeURIComponent(type)}`);
  redirect(next);
}

/**
 * Sends a fresh set-password link. Works for invited crew who never finished
 * setting up as well as for forgotten passwords. The reply never says whether
 * the email exists, so the form can't be used to discover crew addresses.
 */
export async function requestNewLink(email: string): Promise<{ ok: true } | { error: string }> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return { error: "Enter a valid email address." };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("x-forwarded-host") ?? h.get("host") ?? "crew.beros.online"}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo: `${origin}/auth/confirm?next=/reset-password` });
  if (error && /rate limit|too many|security purposes/i.test(error.message)) {
    return { error: "Too many requests. Please wait a minute and try again." };
  }
  return { ok: true };
}
