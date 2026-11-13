import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const supabaseWs = supabase.replace(/^https:/, "wss:");

/**
 * Content Security Policy: the browser only loads scripts, styles and data from
 * this site and the Supabase project, and the portal can't be framed by other
 * sites. ('unsafe-inline' is needed for Next.js's inline bootstrap scripts.)
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseWs}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Internal portal: keep every page and file out of search engines.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Keep recently visited pages in the browser's router cache so switching
    // tabs back and forth is instant. Saving anything (server actions call
    // revalidatePath / router.refresh) clears this cache, so your own changes
    // always show at once. "static" also covers pages preloaded with
    // <Link prefetch>, e.g. the crew tabs.
    staleTimes: { dynamic: 30, static: 60 },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
