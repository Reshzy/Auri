/** DTR XLSX display formatters matching audited CSC Form No. 48 presentation. */

import { parseYmd } from "@/lib/dates/period";
import { isNonWorkClassification, type DayClassification } from "@/lib/reports/classify";
import { DTR_DAY_ROW_OFFSET } from "@/lib/templates/dtr-cell-map";

const MONTHS_UPPER = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

/**
 * Audited DTR period label: `AUGUST 1-15` (uppercase month, no year).
 * Distinct from DOCX `August 1-15, 2026`.
 */
export function formatDtrPeriodLabel(startDate: string, endDate: string): string {
  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  const monthName = MONTHS_UPPER[start.month - 1] ?? String(start.month);
  if (start.year === end.year && start.month === end.month) {
    return `${monthName} ${start.day}-${end.day}`;
  }
  const endMonth = MONTHS_UPPER[end.month - 1] ?? String(end.month);
  return `${monthName} ${start.day}-${endMonth} ${end.day}`;
}

/**
 * DTR employee/signature presentation: uppercase to match CSC sample.
 * Canonical ExportPayload keeps stored casing; transform only here.
 */
export function formatDtrEmployeeName(name: string): string {
  return name.normalize("NFKC").trim().toUpperCase();
}

/**
 * Default DTR time: familiar 12-hour clock without AM/PM and without a leading hour zero.
 * `07:00` → `7:00`, `12:00` → `12:00`, `13:00` → `1:00`, `18:05` → `6:05`.
 * No timezone conversion — local office `time` values.
 */
export function formatDtrClock(hhmm: string | null | undefined): string {
  if (!hhmm) return "";
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return hhmm.trim();
  let hour = Number(match[1]);
  const minute = match[2]!;
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return hhmm.trim();
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${minute}`;
}

/** Calendar day of month from YYYY-MM-DD. */
export function calendarDayFromYmd(ymd: string): number {
  return parseYmd(ymd).day;
}

/** Worksheet row = calendar day + 13. */
export function dtrRowForCalendarDay(day: number): number {
  return day + DTR_DAY_ROW_OFFSET;
}

export function finalUndertimeMinutes(
  calculatedUndertimeMinutes: number,
  undertimeOverrideMinutes: number | null | undefined,
): number {
  return undertimeOverrideMinutes ?? calculatedUndertimeMinutes;
}

export function splitUndertimeMinutes(totalMinutes: number): {
  hours: number;
  minutes: number;
} {
  const whole = Math.max(0, Math.floor(totalMinutes));
  return {
    hours: Math.floor(whole / 60),
    minutes: whole % 60,
  };
}

/**
 * Zero undertime: leave daily hour/minute cells blank (audited workbook convention).
 * Positive undertime: numeric hours and minutes.
 */
export function dtrUndertimeCellValues(totalMinutes: number): {
  hours: number | null;
  minutes: number | null;
} {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return { hours: null, minutes: null };
  }
  const split = splitUndertimeMinutes(totalMinutes);
  return { hours: split.hours, minutes: split.minutes };
}

export function isDtrBlankDay(classification: DayClassification): boolean {
  return isNonWorkClassification(classification);
}
