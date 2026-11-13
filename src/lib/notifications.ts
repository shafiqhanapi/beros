import "server-only";
import { adminRecipients, crewRecipient, renderEmail, sendEmail, SITE_URL } from "@/lib/email";
import { fmtHours, fmtMoney, fmtMonth } from "@/lib/format";

/**
 * The emails the portal sends (SPEC.md "Submission flow and notifications").
 * Each function is safe to call fire-and-forget: it never throws.
 */

const sgDateTime = (d = new Date()) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Singapore" }).format(d);

async function safe(fn: () => Promise<void>, what: string) {
  try {
    await fn();
  } catch (e) {
    console.error(`[notify] ${what} failed:`, e);
  }
}

/** Admin: a new crew member accepted their invite and signed in for the first time. */
export const notifyCrewOnboarded = (crew: { name: string; email: string; phone: string | null; startDate: string }) =>
  safe(async () => {
    const to = await adminRecipients();
    const { html, text } = renderEmail({
      heading: `${crew.name} has joined the crew`,
      intro: `${crew.name} accepted their invite and signed in to the Crew Portal for the first time. They can now log hours and submit claims.`,
      rows: [
        ["Name", crew.name],
        ["Email", crew.email],
        ...(crew.phone ? ([["Mobile", `+65 ${crew.phone.slice(0, 4)} ${crew.phone.slice(4)}`]] as [string, string][]) : []),
        ["Joined", sgDateTime()],
      ],
      button: { label: "View crew", href: `${SITE_URL}/admin/crew` },
      footnote: "Assign them to bookings under Admin → Bookings so jobs appear in their timesheet.",
    });
    await sendEmail({ to, subject: `New crew onboarded: ${crew.name}`, html, text });
  }, "crew onboarded");

/** Admin: a crew member submitted their monthly timesheet. */
export const notifyTimesheetSubmitted = (t: { timesheetId: string; crewName: string; month: string; hours: number; pay: number; jobs: number }) =>
  safe(async () => {
    const to = await adminRecipients();
    const monthName = fmtMonth(t.month);
    const { html, text } = renderEmail({
      heading: `${t.crewName} submitted their ${monthName} timesheet`,
      intro: "It's waiting for your review. Approve it, or reject it with a reason so they can fix and resubmit.",
      rows: [
        ["Crew", t.crewName],
        ["Month", monthName],
        ["Entries", String(t.jobs)],
        ["Total hours", fmtHours(t.hours)],
        ["Total amount", fmtMoney(t.pay)],
        ["Submitted", sgDateTime()],
      ],
      button: { label: "Review timesheet", href: `${SITE_URL}/admin/timesheets?month=${t.month.slice(0, 7)}&tab=submitted&id=${t.timesheetId}` },
    });
    await sendEmail({ to, subject: `Timesheet submitted: ${t.crewName}, ${monthName}`, html, text });
  }, "timesheet submitted");

/** Crew ("Payment sent") and admin: a month was marked as paid. */
export const notifyPaid = (p: { crewId: string; crewName: string; month: string; hoursPay: number; claimsTotal: number; payoutId: string; payslipNumber: string; paynow: string | null }) =>
  safe(async () => {
    const monthName = fmtMonth(p.month);
    const total = fmtMoney(p.hoursPay + p.claimsTotal);
    const rows: [string, string][] = [
      ["Pay period", monthName],
      ["Hours pay", fmtMoney(p.hoursPay)],
      ["Claims", fmtMoney(p.claimsTotal)],
      ["Total paid", total],
      ["Payslip no.", p.payslipNumber],
    ];

    const crewTo = await crewRecipient(p.crewId);
    if (crewTo) {
      const crewMail = renderEmail({
        heading: "Payment sent",
        intro: `Your ${monthName} pay of ${total} has been sent${p.paynow ? ` to PayNow ${p.paynow}` : ""}. Your payslip is ready to download.`,
        rows,
        button: { label: "Download payslip", href: `${SITE_URL}/payslips/${p.payoutId}/pdf` },
        footnote: "You'll need to sign in to download it. Anything look wrong? Reply to this email.",
      });
      await sendEmail({ to: crewTo, subject: `Payment sent: ${monthName} (${total})`, ...crewMail });
    }

    const adminTo = await adminRecipients();
    const adminMail = renderEmail({
      heading: `${p.crewName} marked as paid`,
      intro: `${p.crewName}'s ${monthName} payout was recorded and their payslip was created.${crewTo ? " They've been emailed." : " They have email notifications off, so they weren't emailed."}`,
      rows: [["Crew", p.crewName], ...rows, ["PayNow", p.paynow ?? "Not set"]],
      button: { label: "View payouts", href: `${SITE_URL}/admin/payouts?month=${p.month.slice(0, 7)}` },
    });
    await sendEmail({ to: adminTo, subject: `Paid: ${p.crewName}, ${monthName} (${total})`, ...adminMail });
  }, "paid");
