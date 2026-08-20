import { parseYmd } from "@/lib/dates/period";

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

export function formatPeriodLabel(
  startDate: string,
  endDate: string,
  periodKind: string,
): string {
  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  const monthName = MONTHS[start.month - 1] ?? String(start.month);
  if (periodKind === "FIRST_HALF") {
    return `${monthName} ${start.year} · 1–15`;
  }
  if (periodKind === "SECOND_HALF") {
    return `${monthName} ${start.year} · 16–${end.day}`;
  }
  return `${startDate} → ${endDate}`;
}

export function formatPeriodKind(periodKind: string): string {
  switch (periodKind) {
    case "FIRST_HALF":
      return "First half";
    case "SECOND_HALF":
      return "Second half";
    case "CUSTOM":
      return "Custom";
    default:
      return periodKind;
  }
}

export function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatCompletionSummary(input: {
  progressLabel: string;
  incompleteOrInvalidCount: number;
  totalWorkedLabel: string;
}): string {
  const incomplete =
    input.incompleteOrInvalidCount > 0
      ? `${input.incompleteOrInvalidCount} missing/incomplete`
      : "All days complete";
  return `Progress ${input.progressLabel} · ${input.totalWorkedLabel} · ${incomplete}`;
}

export function formatMinutesLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0 && mins === 0) return "0 mins";
  if (mins === 0) return `${hours}h`;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}
