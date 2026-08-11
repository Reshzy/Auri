import {
  classifyDateFromSchedule,
  scheduledSessionsForDate,
} from "@/lib/reports/classify";
import type { WeekdayRules } from "@/lib/validation/onboarding";

/** Thin wrapper around schedule classification helpers for service-layer callers. */
export class ScheduleService {
  static classifyDate(workDate: string, weekdayRules: WeekdayRules) {
    return classifyDateFromSchedule(workDate, weekdayRules);
  }

  static scheduledSessions(workDate: string, weekdayRules: WeekdayRules) {
    return scheduledSessionsForDate(workDate, weekdayRules);
  }
}
