/** Calendar date helpers using Asia/Manila semantics (no UTC weekday drift). */

export type PeriodKind = "FIRST_HALF" | "SECOND_HALF" | "CUSTOM";

export type DateYmd = `${number}-${string}-${string}`;

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type CalendarWeekdayKey = (typeof WEEKDAY_KEYS)[number];

/** Parse YYYY-MM-DD without timezone conversion. */
export function parseYmd(ymd: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) {
    throw new Error(`Invalid date: ${ymd}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`Invalid calendar date: ${ymd}`);
  }
  return { year, month, day };
}

export function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Weekday for a calendar date using local civil arithmetic.
 * Uses noon UTC construction so the civil Y-M-D is preserved across timezones.
 */
export function weekdayKeyForYmd(ymd: string): CalendarWeekdayKey {
  const { year, month, day } = parseYmd(ymd);
  const dow = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  return WEEKDAY_KEYS[dow]!;
}

export function weekdayLabelForYmd(ymd: string): string {
  const key = weekdayKeyForYmd(ymd);
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function eachDateInclusive(startYmd: string, endYmd: string): string[] {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  if (
    formatYmd(start.year, start.month, start.day) >
    formatYmd(end.year, end.month, end.day)
  ) {
    throw new Error("start_date must be on or before end_date");
  }

  const dates: string[] = [];
  let y = start.year;
  let m = start.month;
  let d = start.day;
  const endKey = formatYmd(end.year, end.month, end.day);

  for (;;) {
    const key = formatYmd(y, m, d);
    dates.push(key);
    if (key === endKey) break;
    d += 1;
    const dim = daysInMonth(y, m);
    if (d > dim) {
      d = 1;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }
  return dates;
}

export function periodRangeForPreset(
  year: number,
  month: number,
  kind: Exclude<PeriodKind, "CUSTOM">,
): { startDate: string; endDate: string } {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Year is out of range.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Month is out of range.");
  }

  if (kind === "FIRST_HALF") {
    return {
      startDate: formatYmd(year, month, 1),
      endDate: formatYmd(year, month, 15),
    };
  }

  const last = daysInMonth(year, month);
  return {
    startDate: formatYmd(year, month, 16),
    endDate: formatYmd(year, month, last),
  };
}

export function datesForPreset(
  year: number,
  month: number,
  kind: Exclude<PeriodKind, "CUSTOM">,
): string[] {
  const { startDate, endDate } = periodRangeForPreset(year, month, kind);
  return eachDateInclusive(startDate, endDate);
}

/** Manila "today" as YYYY-MM-DD. */
export function todayYmdManila(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Could not resolve Manila calendar date.");
  }
  return `${year}-${month}-${day}`;
}

export function inferCurrentPeriodPreset(todayYmd: string): {
  year: number;
  month: number;
  kind: "FIRST_HALF" | "SECOND_HALF";
} {
  const { year, month, day } = parseYmd(todayYmd);
  return {
    year,
    month,
    kind: day <= 15 ? "FIRST_HALF" : "SECOND_HALF",
  };
}
