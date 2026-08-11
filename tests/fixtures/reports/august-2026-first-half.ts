import { createCompressedWeekdayRules } from "@/lib/onboarding/defaults";
import { classifyDateFromSchedule } from "@/lib/reports/classify";
import { datesForPreset } from "@/lib/dates/period";
import { formatTotalHoursLabel } from "@/lib/reports/totals";

export const AUGUST_2026_FIRST_HALF = {
  year: 2026,
  month: 8,
  kind: "FIRST_HALF" as const,
  startDate: "2026-08-01",
  endDate: "2026-08-15",
  expectedWorkdays: [
    "2026-08-03",
    "2026-08-04",
    "2026-08-05",
    "2026-08-06",
    "2026-08-10",
    "2026-08-11",
    "2026-08-12",
    "2026-08-13",
  ],
  expectedScheduledOff: [
    "2026-08-01",
    "2026-08-02",
    "2026-08-07",
    "2026-08-08",
    "2026-08-09",
    "2026-08-14",
    "2026-08-15",
  ],
  minutesPerCompleteWorkday: 600,
  expectedTotalMinutes: 4800,
  expectedTotalLabel: "80 HRS",
} as const;

export function buildAugust2026Classifications() {
  const rules = createCompressedWeekdayRules();
  const dates = datesForPreset(2026, 8, "FIRST_HALF");
  return dates.map((workDate) => classifyDateFromSchedule(workDate, rules));
}

export function assertAugust2026FixtureTotals(): {
  totalMinutes: number;
  label: string;
} {
  const totalMinutes =
    AUGUST_2026_FIRST_HALF.expectedWorkdays.length *
    AUGUST_2026_FIRST_HALF.minutesPerCompleteWorkday;
  return {
    totalMinutes,
    label: formatTotalHoursLabel(totalMinutes),
  };
}
