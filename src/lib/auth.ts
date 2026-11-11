import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type CrewRole = "crew" | "admin";
export type CrewStatus = "invited" | "active" | "inactive";

/** Columns of public.crew that the guards and layouts need (see SPEC.md SQL). */
export interface CrewProfile {
  id: string;
  full_name: string;
  email: string;
  role: CrewRole;
  status: CrewStatus;
}

export type Session =
  | { state: "signed_out" }
  | { state: "no_profile"; email: string | undefined }
  | { state: "db_error"; email: string | undefined; message: string }
  | { state: "inactive"; crew: CrewProfile }
  | { state: "ok"; crew: CrewProfile };

/**
 * The signed-in user and their crew profile. Cached per request.
 * RLS (crew_self_read) lets a user read their own crew row.
 */
export const getSession = cache(async (): Promise<Session> => {
  if (!isSupabaseConfigured) return { state: "signed_out" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "signed_out" };

  const { data: crew, error } = await supabase
    .from("crew")
    .select("id, full_name, email, role, status")
    .eq("id", user.id)
    .maybeSingle<CrewProfile>();

  // A failed query (missing table, missing grants) is not the same as "not on the crew list".
  if (error) return { state: "db_error", email: user.email, message: `${error.code ?? ""} ${error.message}`.trim() };
  if (!crew) return { state: "no_profile", email: user.email };
  if (crew.status === "inactive") return { state: "inactive", crew };
  return { state: "ok", crew };
});

/** Where a session should land: the role's home, /login, or /no-access. */
export function homeFor(session: Session): string {
  if (session.state === "signed_out") return "/login";
  if (session.state !== "ok") return "/no-access";
  return session.crew.role === "admin" ? "/admin" : "/home";
}

async function requireRole(role: CrewRole): Promise<CrewProfile> {
  const session = await getSession();
  if (session.state !== "ok" || session.crew.role !== role) redirect(homeFor(session));
  return session.crew;
}

/** Guard for the crew area: crew role, not deactivated. */
export const requireCrew = () => requireRole("crew");

/**
 * Guard for /admin. Requires role 'admin' and status 'active',
 * matching is_admin() in the database so the UI never shows admin
 * screens that RLS would refuse.
 */
export async function requireAdmin(): Promise<CrewProfile> {
  const crew = await requireRole("admin");
  if (crew.status !== "active") redirect("/no-access");
  return crew;
}
