import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safePath } from "@/lib/safe-path";

/**
 * Google sign-in and password-reset emails land here with ?code= to exchange
 * for a session. With open sign-ups disabled in Supabase, a Google account
 * that isn't on the crew list comes back with an error instead.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = safePath(nextParam);

  const oauthError = `${searchParams.get("error") ?? ""} ${searchParams.get("error_description") ?? ""}`.toLowerCase();
  if (oauthError.trim()) {
    const reason = oauthError.includes("signup") || oauthError.includes("not allowed") ? "not_crew" : "auth";
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
