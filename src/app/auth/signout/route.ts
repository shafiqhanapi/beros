import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ALIVE_COOKIE, REMEMBER_COOKIE } from "@/lib/remember";

export async function POST(request: NextRequest) {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const res = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  res.cookies.delete(REMEMBER_COOKIE);
  res.cookies.delete(ALIVE_COOKIE);
  return res;
}
