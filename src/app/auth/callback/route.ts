import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safePath } from "@/lib/safe-path";

/**
 * Password-reset emails land here with ?code= to exchange for a session.
 * (Invite links use /auth/accept.) Sign-in is email and password only;
 * an error from Supabase sends the user back to /login with a message.
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
