import {
  blankEntryFromClassification,
  classifyDateFromSchedule,
  isNonWorkClassification,
  scheduledSessionsForDate,
  type DayClassification,
} from "@/lib/reports/classify";
import { computeEntryCompleteness } from "@/lib/reports/completeness";
import {
  normalizeAndValidateDayTimes,
  type SessionValidationIssue,
} from "@/lib/reports/time";
import { workedAndUndertime } from "@/lib/reports/undertime";
import type { WeekdayRules } from "@/lib/validation/onboarding";
import type { DailyEntryUpdateInput } from "@/lib/validation/reports";

export type RecalculatedEntry = {
  classification: DayClassification;
  classificationLabel: string | null;
  amArrival: string | null;
  amDeparture: string | null;
  pmArrival: string | null;
  pmDeparture: string | null;
  workedMinutes: number;
  calculatedUndertimeMinutes: number;
  undertimeOverrideMinutes: number | null;
  accomplishments: string[];
  remarks: string | null;
  isComplete: boolean;
  issues: SessionValidationIssue[];
};

export function recalculateDailyEntry(input: {
  workDate: string;
  weekdayRules: WeekdayRules;
  update: DailyEntryUpdateInput;
}): RecalculatedEntry {
  const times = normalizeAndValidateDayTimes({
    amArrival: input.update.amArrival,
    amDeparture: input.update.amDeparture,
    pmArrival: input.update.pmArrival,
    pmDeparture: input.update.pmDeparture,
  });

  const classification = input.update.classification;
  const classificationLabel = input.update.classificationLabel ?? null;
  const accomplishments = input.update.accomplishments;
  const remarks = input.update.remarks ?? null;
  const undertimeOverrideMinutes = input.update.undertimeOverrideMinutes ?? null;

  const am = { arrival: times.amArrival, departure: times.amDeparture };
  const pm = { arrival: times.pmArrival, departure: times.pmDeparture };

  if (times.issues.length > 0) {
    return {
      classification,
      classificationLabel,
      amArrival: times.amArrival,
      amDeparture: times.amDeparture,
      pmArrival: times.pmArrival,
      pmDeparture: times.pmDeparture,
      workedMinutes: 0,
      calculatedUndertimeMinutes: 0,
      undertimeOverrideMinutes,
      accomplishments,
      remarks,
      isComplete: false,
      issues: times.issues,
    };
  }

  const scheduled = scheduledSessionsForDate(input.workDate, input.weekdayRules);
  const { workedMinutes, calculatedUndertimeMinutes } = workedAndUndertime({
    am,
    pm,
    scheduled,
    undertimeOverrideMinutes,
  });

  // Non-work days clear times for storage consistency when omitting is allowed
  if (isNonWorkClassification(classification) && !am.arrival && !pm.arrival) {
    // keep null times
  }

  const isComplete = computeEntryCompleteness({
    classification,
    classificationLabel,
    am,
    pm,
    accomplishments,
  });

  return {
    classification,
    classificationLabel,
    amArrival: times.amArrival,
    amDeparture: times.amDeparture,
    pmArrival: times.pmArrival,
    pmDeparture: times.pmDeparture,
    workedMinutes,
    calculatedUndertimeMinutes,
    undertimeOverrideMinutes,
    accomplishments,
    remarks,
    isComplete,
    issues: [],
  };
}

export function resetEntryFromSchedule(workDate: string, weekdayRules: WeekdayRules) {
  const classified = classifyDateFromSchedule(workDate, weekdayRules);
  return blankEntryFromClassification(classified);
}
