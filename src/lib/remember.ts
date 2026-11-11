/**
 * "Keep me signed in". Supabase keeps a persistent session cookie; when the
 * box is unticked we also set a browser-session marker cookie. The middleware
 * signs the user out once the marker is gone (the browser was closed).
 */
export const REMEMBER_COOKIE = "beros_remember";
export const ALIVE_COOKIE = "beros_alive";

/** Call in the browser just before signing in. */
export function setRememberChoice(remember: boolean) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${REMEMBER_COOKIE}=${remember ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  // No Max-Age: a session cookie, cleared when the browser closes.
  document.cookie = `${ALIVE_COOKIE}=1; Path=/; SameSite=Lax${secure}`;
}
