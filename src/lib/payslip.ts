import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { LOGO_PATHS } from "./logo-paths";
import { fmtDayDate, fmtHours, fmtMoney, fmtMonth } from "./format";

/** Data printed on a payslip (SPEC.md "Monthly payslip"). */
export interface PayslipData {
  number: string;
  crewName: string;
  month: string; // YYYY-MM-01
  paidAt: string; // ISO timestamp
  jobs: { date: string; label: string; hours: number; rate: number }[];
  claims: { date: string; label: string; amount: number }[];
}

const INK = rgb(0.05, 0.05, 0.05);
const MUTED = rgb(0.45, 0.45, 0.45);
const LINE = rgb(0.9, 0.9, 0.9);
const SOFT = rgb(0.965, 0.965, 0.965);

const W = 595.28; // A4
const H = 841.89;
const M = 48; // margin

/** Generates the payslip PDF and returns its bytes. */
export async function renderPayslip(d: PayslipData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`BEROS payslip ${fmtMonth(d.month)} – ${d.crewName}`);
  pdf.setAuthor("BEROS Hygiene Care");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Standard PDF fonts only cover Western European characters; replace anything else.
  const safe = (s: string, f: PDFFont = font) =>
    [...s].map((ch) => { try { f.encodeText(ch); return ch; } catch { return "?"; } }).join("");

  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  const text = (s: string, x: number, size = 10, f: PDFFont = font, color = INK) =>
    page.drawText(safe(s, f), { x, y, size, font: f, color });
  const right = (s: string, xRight: number, size = 10, f: PDFFont = font, color = INK) => {
    const t = safe(s, f);
    page.drawText(t, { x: xRight - f.widthOfTextAtSize(t, size), y, size, font: f, color });
  };
  const rule = (yy = y) => page.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: 0.75, color: LINE });
  const ensure = (space: number) => {
    if (y - space > M + 40) return;
    page = pdf.addPage([W, H]);
    y = H - M;
  };

  // Header: logo, company, payslip number
  for (const p of LOGO_PATHS) page.drawSvgPath(p, { x: M, y: y + 2, scale: 0.85, color: INK });
  right("PAYSLIP", W - M, 16, bold);
  y -= 30;
  text("BEROS Hygiene Care", M, 10, font, MUTED);
  right(`No. ${d.number}`, W - M, 10, font, MUTED);
  y -= 28;
  rule();
  y -= 26;

  // Crew and period
  const field = (label: string, value: string, x: number) => {
    page.drawText(label.toUpperCase(), { x, y, size: 8, font: bold, color: MUTED });
    page.drawText(safe(value, bold), { x, y: y - 16, size: 12, font: bold, color: INK });
  };
  field("Crew member", d.crewName, M);
  field("Pay period", fmtMonth(d.month), M + 210);
  field("Payment date", new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Singapore" }).format(new Date(d.paidAt)), M + 360);
  y -= 50;

  // Hours
  const cols = { date: M, label: M + 80, hours: W - M - 110, amount: W - M };
  const tableHead = (a: string, b: string, c: string | null, e: string) => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: SOFT });
    text(a.toUpperCase(), cols.date + 6, 8, bold, MUTED);
    text(b.toUpperCase(), cols.label, 8, bold, MUTED);
    if (c) right(c.toUpperCase(), cols.hours, 8, bold, MUTED);
    right(e.toUpperCase(), cols.amount - 6, 8, bold, MUTED);
    y -= 24;
  };

  text("Hours", M, 13, bold);
  y -= 20;
  const hoursTotal = d.jobs.reduce((s, j) => s + j.hours, 0);
  const hoursPay = d.jobs.reduce((s, j) => s + j.hours * j.rate, 0);
  if (d.jobs.length === 0) {
    text("No hours this month.", M, 10, font, MUTED);
    y -= 22;
  } else {
    tableHead("Date", "Booking", "Hours", "Amount");
    for (const j of d.jobs) {
      ensure(20);
      text(fmtDayDate(j.date), cols.date + 6);
      text(j.label.length > 52 ? `${j.label.slice(0, 51)}…` : j.label, cols.label);
      right(fmtHours(j.hours), cols.hours);
      right(fmtMoney(j.hours * j.rate), cols.amount - 6);
      y -= 18;
      rule(y + 10);
    }
    y -= 6;
    const rates = [...new Set(d.jobs.map((j) => j.rate))];
    const calc = rates.length === 1 ? `${fmtHours(hoursTotal)} × ${fmtMoney(rates[0])}` : `${fmtHours(hoursTotal)} total`;
    text(`Hours pay (${calc})`, M + 6, 10, bold);
    right(fmtMoney(hoursPay), cols.amount - 6, 10, bold);
    y -= 34;
  }

  // Claims
  ensure(80);
  text("Claims", M, 13, bold);
  y -= 20;
  const claimsTotal = d.claims.reduce((s, c) => s + c.amount, 0);
  if (d.claims.length === 0) {
    text("No claims this month.", M, 10, font, MUTED);
    y -= 22;
  } else {
    tableHead("Date", "Type", null, "Amount");
    for (const c of d.claims) {
      ensure(20);
      text(fmtDayDate(c.date), cols.date + 6);
      text(c.label, cols.label);
      right(fmtMoney(c.amount), cols.amount - 6);
      y -= 18;
      rule(y + 10);
    }
    y -= 6;
    text("Claims total", M + 6, 10, bold);
    right(fmtMoney(claimsTotal), cols.amount - 6, 10, bold);
    y -= 34;
  }

  // Total paid
  ensure(70);
  page.drawRectangle({ x: M, y: y - 18, width: W - 2 * M, height: 44, color: INK });
  page.drawText("Total paid", { x: M + 16, y: y - 2, size: 12, font: bold, color: rgb(1, 1, 1) });
  const total = fmtMoney(hoursPay + claimsTotal);
  page.drawText(total, { x: W - M - 16 - bold.widthOfTextAtSize(total, 16), y: y - 4, size: 16, font: bold, color: rgb(1, 1, 1) });
  y -= 50;
  text("Hours pay + claims. Straight payout: no CPF or other deductions.", M, 9, font, MUTED);

  // Footer on every page
  for (const p of pdf.getPages()) {
    p.drawText(safe(`BEROS Hygiene Care · Payslip ${d.number}`), { x: M, y: 28, size: 8, font, color: MUTED });
  }
  return pdf.save();
}
