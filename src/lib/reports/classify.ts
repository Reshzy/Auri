import { weekdayKeyForYmd } from "@/lib/dates/period";
import type { WeekdayRules } from "@/lib/validation/onboarding";

export type DayClassification =
  "workday" | "scheduled_off" | "holiday" | "leave" | "absent" | "custom";

export type ClassifiedDay = {
  workDate: string;
  classification: DayClassification;
  classificationLabel: string | null;
  isComplete: boolean;
};

/**
 * Classify a calendar date from an immutable schedule snapshot.
 * Uses Manila civil weekday (via YYYY-MM-DD arithmetic), never UTC conversion of the date.
 */
export function classifyDateFromSchedule(
  workDate: string,
  weekdayRules: WeekdayRules,
): ClassifiedDay {
  const key = weekdayKeyForYmd(workDate);
  const rule = weekdayRules[key];
  if (!rule) {
    throw new Error(`Missing weekday rule for ${key}`);
  }

  if (rule.isWorkday) {
    return {
      workDate,
      classification: "workday",
      classificationLabel: null,
      isComplete: false,
    };
  }

  const label = rule.offDayLabel?.trim() || null;
  return {
    workDate,
    classification: "scheduled_off",
    classificationLabel: label,
    isComplete: Boolean(label),
  };
}

export function scheduledSessionsForDate(
  workDate: string,
  weekdayRules: WeekdayRules,
): {
  amStart: string | null;
  amEnd: string | null;
  pmStart: string | null;
  pmEnd: string | null;
} {
  const key = weekdayKeyForYmd(workDate);
  const rule = weekdayRules[key];
  return {
    amStart: rule?.amStart ?? null,
    amEnd: rule?.amEnd ?? null,
    pmStart: rule?.pmStart ?? null,
    pmEnd: rule?.pmEnd ?? null,
  };
}

export function isNonWorkClassification(classification: DayClassification): boolean {
  return (
    classification === "scheduled_off" ||
    classification === "holiday" ||
    classification === "leave" ||
    classification === "absent"
  );
}

export function blankEntryFromClassification(classified: ClassifiedDay): {
  classification: DayClassification;
  classificationLabel: string | null;
  amArrival: null;
  amDeparture: null;
  pmArrival: null;
  pmDeparture: null;
  workedMinutes: 0;
  calculatedUndertimeMinutes: 0;
  undertimeOverrideMinutes: null;
  accomplishments: string[];
  remarks: null;
  isComplete: boolean;
} {
  return {
    classification: classified.classification,
    classificationLabel: classified.classificationLabel,
    amArrival: null,
    amDeparture: null,
    pmArrival: null,
    pmDeparture: null,
    workedMinutes: 0,
    calculatedUndertimeMinutes: 0,
    undertimeOverrideMinutes: null,
    accomplishments: [],
    remarks: null,
    isComplete: classified.isComplete,
  };
}
