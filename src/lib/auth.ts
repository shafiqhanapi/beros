import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { num, type CrewRow } from "@/lib/types";
import { adminClient, hasServiceRole } from "@/lib/supabase/admin";

export type CrewRole = "crew" | "admin";
export type CrewStatus = "invited" | "active" | "inactive";

/** The signed-in user's full public.crew row (see SPEC.md SQL). */
export type CrewProfile = CrewRow;

export type Session =
  | { state: "signed_out" }
  | { state: "no_profile"; email: string | undefined }
  | { state: "db_error"; email: string | undefined; message: string }
  | { state: "inactive"; crew: CrewProfile }
  | { state: "ok"; crew: CrewProfile; userMetadata: Record<string, unknown> };

const CREW_COLUMNS = "id, full_name, email, phone, role, status, hourly_rate, start_date, paynow_name, paynow_phone";

/**
 * The signed-in user and their crew profile, loaded once per request.
 * getClaims() verifies the login token locally (no call to Supabase Auth when
 * the project uses asymmetric signing keys). RLS (crew_self_read) lets a user
 * read their own crew row.
 */
export const getSession = cache(async (): Promise<Session> => {
  if (!isSupabaseConfigured) return { state: "signed_out" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { state: "signed_out" };
  const email = typeof claims.email === "string" ? claims.email : undefined;

  const { data: crew, error } = await supabase.from("crew").select(CREW_COLUMNS).eq("id", claims.sub).maybeSingle<CrewRow>();

  // A failed query (missing table, missing grants) is not the same as "not on the crew list".
  if (error) return { state: "db_error", email, message: `${error.code ?? ""} ${error.message}`.trim() };
  if (!crew) return { state: "no_profile", email };
  const row = { ...crew, hourly_rate: num(crew.hourly_rate) };
  if (row.status === "inactive") return { state: "inactive", crew: row };

  // First sign-in of an invited crew member: mark them active (crew can't
  // change their own status under RLS, so this uses the service role).
  if (row.status === "invited" && hasServiceRole) {
    const { error: activateError } = await adminClient()
      .from("crew")
      .update({ status: "active" })
      .eq("id", row.id)
      .eq("status", "invited");
    if (!activateError) row.status = "active";
  }
  return { state: "ok", crew: row, userMetadata: (claims.user_metadata as Record<string, unknown>) ?? {} };
});

/** user_metadata of the signed-in user (e.g. email_notifications). */
export async function getUserMetadata(): Promise<Record<string, unknown>> {
  const session = await getSession();
  return session.state === "ok" ? session.userMetadata : {};
}

/** Where a session should land: the role's home, /login, or /no-access. */
export function homeFor(session: Session): string {
  if (session.state === "signed_out") return "/login";
  if (session.state !== "ok") return "/no-access";
  return session.crew.role === "admin" ? "/admin" : "/timesheet";
}

async function requireRole(roles: CrewRole[]): Promise<CrewProfile> {
  const session = await getSession();
  if (session.state !== "ok" || !roles.includes(session.crew.role)) redirect(homeFor(session));
  return session.crew;
}

/**
 * Guard for the crew area: any signed-in crew member who isn't deactivated.
 * Admins may use it too, to log their own hours and claims; RLS limits the
 * crew screens' queries to the user's own rows either way.
 */
export const requireCrew = () => requireRole(["crew", "admin"]);

/**
 * Guard for /admin. Requires role 'admin' and status 'active',
 * matching is_admin() in the database so the UI never shows admin
 * screens that RLS would refuse.
 */
export async function requireAdmin(): Promise<CrewProfile> {
  const crew = await requireRole(["admin"]);
  if (crew.status !== "active") redirect("/no-access");
  return crew;
}
