import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Supabase client with the service-role key. It bypasses row-level security,
 * so it is used only on the server for what the anon key cannot do:
 * inviting crew (creating auth users), activating invited crew on first
 * sign-in, blocking logins on deactivation, and the PayNow audit log.
 * The key must never reach the browser: it is not NEXT_PUBLIC_.
 */
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const hasServiceRole = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);

let client: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  if (!hasServiceRole) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY isn't set on the server. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.",
    );
  }
  client ??= createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
