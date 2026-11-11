import { currentMonth, fmtMonth, recentMonths, toMonth } from "./format";

/** Month picker options (last 12 months) and the selected month from `?month=YYYY-MM`. */
export function monthParam(raw: string | undefined) {
  const months = recentMonths(12);
  const month = toMonth(raw) && months.includes(toMonth(raw)!) ? toMonth(raw)! : currentMonth();
  return {
    month,
    options: months.map((m) => ({ value: m.slice(0, 7), label: fmtMonth(m) })),
    value: month.slice(0, 7),
  };
}
