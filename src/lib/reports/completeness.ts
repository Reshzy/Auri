import { isNonWorkClassification, type DayClassification } from "@/lib/reports/classify";
import type { SessionPair } from "@/lib/reports/time";
import { hasCompleteSession } from "@/lib/reports/undertime";

/**
 * Whether a daily entry is complete enough for readiness (per-day flag).
 */
export function computeEntryCompleteness(input: {
  classification: DayClassification;
  classificationLabel: string | null;
  am: SessionPair;
  pm: SessionPair;
  accomplishments: string[];
}): boolean {
  if (isNonWorkClassification(input.classification)) {
    return Boolean(input.classificationLabel?.trim());
  }

  if (input.classification === "custom") {
    return Boolean(input.classificationLabel?.trim());
  }

  const hasSession = hasCompleteSession(input.am, input.pm);
  const hasAccomplishment = input.accomplishments.some((item) => item.trim().length > 0);
  return hasSession && hasAccomplishment;
}
