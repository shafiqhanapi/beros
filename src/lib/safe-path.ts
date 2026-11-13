/**
 * Only allow redirects to a path on this site. Rejects absolute URLs,
 * protocol-relative "//evil.com" and the backslash trick "/\evil.com"
 * (browsers treat "\" like "/"), plus control characters.
 */
export function safePath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
