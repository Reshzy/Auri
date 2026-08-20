/** DOCX / export display formatters matching audited official presentation. */

import { parseYmd } from "@/lib/dates/period";
import { formatDtrClock } from "@/lib/reports/dtr-format";
import { formatTotalHoursLabel } from "@/lib/reports/totals";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Audited DOCX date cell: `August 1, 2026` */
export function formatDocxDate(ymd: string): string {
  const { year, month, day } = parseYmd(ymd);
  const monthName = MONTHS[month - 1] ?? String(month);
  return `${monthName} ${day}, ${year}`;
}

/**
 * Audited period label: `August 1-15, 2026`
 * (not the UI middle-dot form).
 */
export function formatAccomplishmentPeriodLabel(
  startDate: string,
  endDate: string,
): string {
  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  const monthName = MONTHS[start.month - 1] ?? String(start.month);
  if (start.year === end.year && start.month === end.month) {
    return `${monthName} ${start.day}-${end.day}, ${start.year}`;
  }
  return `${formatDocxDate(startDate)}-${formatDocxDate(endDate)}`;
}

/** Format HH:MM as a familiar 12-hour clock without AM/PM (same as DTR). */
export function formatDocxClock(hhmm: string): string {
  return formatDtrClock(hhmm);
}

/** Audited AM/PM range: `7:00-12:00` */
export function formatDocxTimeRange(
  arrival: string | null | undefined,
  departure: string | null | undefined,
): string {
  if (!arrival || !departure) return "-";
  return `${formatDocxClock(arrival)}-${formatDocxClock(departure)}`;
}

/**
 * Daily time-spent cell. Non-work uses `-`.
 * Whole hours: `10 hrs`; with minutes: `9 hrs 30 mins` (audited lowercase style).
 */
export function formatDocxTimeSpent(workedMinutes: number): string {
  if (!Number.isFinite(workedMinutes) || workedMinutes <= 0) {
    return "0 hrs";
  }
  const whole = Math.floor(workedMinutes);
  const hours = Math.floor(whole / 60);
  const minutes = whole % 60;
  if (minutes === 0) {
    return `${hours} hrs`;
  }
  return `${hours} hrs ${minutes} mins`;
}

export { formatTotalHoursLabel };
