import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ALIVE_COOKIE, REMEMBER_COOKIE } from "@/lib/remember";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Paths anyone can open without signing in. */
const PUBLIC_PATHS = ["/login", "/auth", "/forgot-password"];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/**
 * Refreshes the Supabase session cookie on every request and sends signed-out
 * visitors to /login. Role checks (crew vs admin) happen in the route-group
 * layouts, which read the crew profile from the database.
 */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured) {
    // Not configured yet: everything except public pages goes to /login,
    // which explains what is missing.
    if (isPublic(request.nextUrl.pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not put code between createServerClient and getUser(): it refreshes the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // "Keep me signed in" was unticked and the browser has since been closed.
  if (user && request.cookies.get(REMEMBER_COOKIE)?.value === "0" && !request.cookies.get(ALIVE_COOKIE)) {
    await supabase.auth.signOut();
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    redirect.cookies.delete(REMEMBER_COOKIE);
    return redirect;
  }

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}
