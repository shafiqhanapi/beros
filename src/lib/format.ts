/** Formatting helpers. All clock times are shown in Singapore time. */
export const TZ = "Asia/Singapore";

const money = new Intl.NumberFormat("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** $1,234.50 */
export const fmtMoney = (n: number | string | null | undefined) => `$${money.format(Number(n ?? 0))}`;

/** $30 when whole, $18.40 otherwise */
export const fmtMoneyShort = (n: number) => {
  const cents = Math.round(n * 100);
  return cents % 100 === 0 ? `$${(cents / 100).toLocaleString("en-SG")}` : fmtMoney(n);
};

/** 10.5h, 4h */
export const fmtHours = (h: number | string) => `${Number(Number(h).toFixed(1)).toString()}h`;

/** Parse a Postgres `date` (YYYY-MM-DD) as a UTC date so it never shifts a day. */
export const parseDate = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`);

const fmt = (opts: Intl.DateTimeFormatOptions, tz: string) =>
  new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: tz });

const noComma = (s: string) => s.replace(",", "");

/** "Thu 12 Nov" for a date column */
export const fmtDayDate = (d: string) =>
  noComma(fmt({ weekday: "short", day: "numeric", month: "short" }, "UTC").format(parseDate(d)));
/** "12 Nov" for a date column */
export const fmtShortDate = (d: string) => fmt({ day: "numeric", month: "short" }, "UTC").format(parseDate(d));
/** "Thu 12 Nov" for a timestamp, in SG time */
export const fmtDayTs = (ts: string) =>
  noComma(fmt({ weekday: "short", day: "numeric", month: "short" }, TZ).format(new Date(ts)));
/** "Thu 12 Nov 2026" for a timestamp, in SG time */
export const fmtDayTsLong = (ts: string) =>
  noComma(fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" }, TZ).format(new Date(ts)));
/** "12 Nov" for a timestamp, in SG time */
export const fmtShortTs = (ts: string) => fmt({ day: "numeric", month: "short" }, TZ).format(new Date(ts));
/** "Mar 2026" for a date column */
export const fmtMonthShort = (d: string) => fmt({ month: "short", year: "numeric" }, "UTC").format(parseDate(d));

/** YYYY-MM-DD of a timestamp in SG time */
export function sgDate(ts: string | Date = new Date()): string {
  const parts = fmt({ year: "numeric", month: "2-digit", day: "2-digit" }, TZ).formatToParts(new Date(ts));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Hour of day (0–23) in SG time */
export const sgHour = (d = new Date()) => Number(fmt({ hour: "2-digit", hour12: false }, TZ).format(d)) % 24;

// ---------- Months (stored as the first day: YYYY-MM-01) ----------

/** "2026-11-01" for the current SG month */
export const currentMonth = () => `${sgDate().slice(0, 7)}-01`;

/** Normalise "2026-11" or "2026-11-15" to "2026-11-01"; null if invalid. */
export function toMonth(v: string | undefined | null): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(v ?? "");
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null;
  return `${m[1]}-${m[2]}-01`;
}

export function addMonths(month: string, n: number): string {
  const d = parseDate(month);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
}

/** "November 2026" */
export const fmtMonth = (month: string) => fmt({ month: "long", year: "numeric" }, "UTC").format(parseDate(month));
/** "November" */
export const fmtMonthName = (month: string) => fmt({ month: "long" }, "UTC").format(parseDate(month));

/** Last day of the month as YYYY-MM-DD */
export const monthEnd = (month: string) => {
  const d = parseDate(addMonths(month, 1));
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
};

/** Timestamp range [start, end) of a month in SG time, for timestamptz filters. */
export const monthTsRange = (month: string) => ({
  start: `${month}T00:00:00+08:00`,
  end: `${addMonths(month, 1)}T00:00:00+08:00`,
});

/** The last `count` months, newest first. */
export const recentMonths = (count = 12, from = currentMonth()) =>
  Array.from({ length: count }, (_, i) => addMonths(from, -i));

// ---------- Periods ----------

export const PERIODS = [
  { value: "month", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "all", label: "All time" },
] as const;
export type Period = (typeof PERIODS)[number]["value"];

export const toPeriod = (v: string | undefined, fallback: Period = "month"): Period =>
  PERIODS.some((p) => p.value === v) ? (v as Period) : fallback;

/** First month included in a period, or null for all time. */
export function periodStart(p: Period): string | null {
  if (p === "all") return null;
  return addMonths(currentMonth(), p === "month" ? 0 : p === "3m" ? -2 : -5);
}

// ---------- People ----------

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function greeting(d = new Date()) {
  const h = sgHour(d);
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

// ---------- Singapore mobile numbers ----------

/** Keep digits only, max 8. */
export const phoneDigits = (v: string) => v.replace(/\D/g, "").slice(0, 8);
/** "9123 4567" */
export const fmtPhone = (digits: string) => (digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits);
/** Exactly 8 digits starting with 8 or 9 (matches the database check). */
export const isSgMobile = (digits: string) => /^[89]\d{7}$/.test(digits);
export const PHONE_ERROR = "Enter a valid 8-digit Singapore mobile number";

/** "11:00 am" for a timestamp, in SG time */
export const fmtTimeTs = (ts: string) =>
  new Intl.DateTimeFormat("en-SG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ }).format(new Date(ts)).toLowerCase();
