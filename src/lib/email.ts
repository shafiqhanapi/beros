import "server-only";
import { adminClient, hasServiceRole } from "@/lib/supabase/admin";

/**
 * Transactional email via Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Needs RESEND_API_KEY on the server. Sending never throws: a failed email is
 * logged and the action that triggered it still succeeds.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.EMAIL_FROM ?? "BEROS Crew Portal <crew@beros.online>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "hello@beros.online";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://crew.beros.online").replace(/\/$/, "");

export const canSendEmail = Boolean(RESEND_API_KEY);

export async function sendEmail(msg: { to: string | string[]; subject: string; html: string; text: string }) {
  const to = (Array.isArray(msg.to) ? msg.to : [msg.to]).filter(Boolean);
  if (!to.length) return;
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set; skipped "${msg.subject}" to ${to.join(", ")}`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, reply_to: REPLY_TO, subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!res.ok) console.error(`[email] Resend ${res.status} for "${msg.subject}": ${await res.text()}`);
  } catch (e) {
    console.error(`[email] failed to send "${msg.subject}":`, e);
  }
}

/** Emails of every active admin (plus ADMIN_NOTIFY_EMAIL if set). */
export async function adminRecipients(): Promise<string[]> {
  const extra = (process.env.ADMIN_NOTIFY_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!hasServiceRole) return extra;
  const { data } = await adminClient().from("crew").select("email").eq("role", "admin").eq("status", "active");
  return [...new Set([...(data ?? []).map((r) => r.email as string), ...extra])];
}

/** A crew member's email if they haven't switched off email notifications (Profile → Settings). */
export async function crewRecipient(crewId: string): Promise<string | null> {
  if (!hasServiceRole) return null;
  const { data } = await adminClient().auth.admin.getUserById(crewId);
  const user = data?.user;
  if (!user?.email || user.user_metadata?.email_notifications === false) return null;
  return user.email;
}

// ---------------------------------------------------------------------------
// Layout (matches supabase/email-templates/invite.html)
// ---------------------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export interface EmailContent {
  heading: string;
  intro: string;
  rows?: [string, string][];
  button?: { label: string; href: string };
  footnote?: string;
}

export function renderEmail(c: EmailContent): { html: string; text: string } {
  const rows = c.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f6f6f6;border-radius:12px;">
        ${c.rows
          .map(
            ([k, v]) => `<tr><td style="padding:10px 16px;font-size:13px;color:#737373;">${esc(k)}</td><td align="right" style="padding:10px 16px;font-size:14px;font-weight:600;color:#0d0d0d;">${esc(v)}</td></tr>`,
          )
          .join("")}
      </table>`
    : "";
  const button = c.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="border-radius:12px;background:#0d0d0d;">
         <a href="${esc(c.button.href)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(c.button.label)}</a>
       </td></tr></table>`
    : "";
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.heading)}</title></head>
<body style="margin:0;padding:0;background:#f6f6f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
  <tr><td align="center" style="padding:8px 0 24px;"><img src="${SITE_URL}/email/beros-logo.png" width="142" height="22" alt="BEROS" style="display:block;border:0;"></td></tr>
  <tr><td style="background:#ffffff;border:1px solid #ebebeb;border-radius:16px;padding:32px 28px;font-family:${FONT};color:#0d0d0d;">
    <h1 style="margin:0 0 12px;font-size:22px;line-height:28px;font-weight:700;">${esc(c.heading)}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:23px;color:#404040;">${esc(c.intro)}</p>
    ${rows}${button}
    ${c.footnote ? `<p style="margin:0;font-size:13px;line-height:20px;color:#737373;">${esc(c.footnote)}</p>` : ""}
  </td></tr>
  <tr><td align="center" style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:#999999;">
    Questions? Email <a href="mailto:hello@beros.online" style="color:#737373;">hello@beros.online</a><br>
    BEROS Hygiene Care · Crew Portal · <a href="${SITE_URL}" style="color:#737373;">crew.beros.online</a>
  </td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    c.heading,
    "",
    c.intro,
    ...(c.rows?.length ? ["", ...c.rows.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(c.button ? ["", `${c.button.label}: ${c.button.href}`] : []),
    ...(c.footnote ? ["", c.footnote] : []),
    "",
    "BEROS Hygiene Care · Crew Portal · crew.beros.online",
  ].join("\n");
  return { html, text };
}
