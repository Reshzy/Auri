import "server-only";

import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { ensureProfile } from "@/db/dal/profiles";
import { getOwnActiveSchedule, listOwnSchedules } from "@/db/dal/schedules";
import { listOwnSignatories } from "@/db/dal/signatories";
import { getTemplateAvailability } from "@/db/dal/templates";
import {
  clampOnboardingStep,
  isOnboardingComplete,
  parseOnboardingStep,
  resolveOnboardingStep,
  type OnboardingStepId,
} from "@/lib/onboarding/progress";
import {
  SAMPLE_PROFILE_DEFAULTS,
  SAMPLE_SIGNATORY_DEFAULTS,
  createCompressedWeekdayRules,
} from "@/lib/onboarding/defaults";
import type { WeekdayRules } from "@/lib/validation/onboarding";
import { hasDatabaseUrl } from "@/lib/env";

export async function loadOnboardingContext(requestedStep?: string | null) {
  const user = await requireAuthenticatedUser();
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is required for onboarding.");
  }

  const profile = await ensureProfile(user.id);
  const [signatoryRows, activeSchedule, schedules, templates] = await Promise.all([
    listOwnSignatories(user.id),
    getOwnActiveSchedule(user.id),
    listOwnSchedules(user.id),
    getTemplateAvailability(),
  ]);

  const resolved = resolveOnboardingStep({
    employeeName: profile.employeeName,
    activeScheduleId: profile.activeScheduleId,
    signatoryCount: signatoryRows.length,
    templatesAvailable: templates.bothAvailable,
    onboardingCompletedAt: profile.onboardingCompletedAt,
  });

  const step = clampOnboardingStep(parseOnboardingStep(requestedStep), resolved);

  const profileDefaults = {
    employeeName: profile.employeeName || SAMPLE_PROFILE_DEFAULTS.employeeName,
    employeeTitle: profile.employeeTitle ?? SAMPLE_PROFILE_DEFAULTS.employeeTitle,
    organizationName:
      profile.organizationName ?? SAMPLE_PROFILE_DEFAULTS.organizationName,
    officeName: profile.officeName ?? SAMPLE_PROFILE_DEFAULTS.officeName,
    departmentName: profile.departmentName ?? SAMPLE_PROFILE_DEFAULTS.departmentName,
    timezone: profile.timezone || SAMPLE_PROFILE_DEFAULTS.timezone,
    locale: profile.locale || SAMPLE_PROFILE_DEFAULTS.locale,
  };

  const signatoryDefaults =
    signatoryRows.length === 4
      ? signatoryRows.map((row) => ({
          slot: row.slot,
          displayName: row.displayName,
          title: row.title,
          isActive: row.isActive,
          effectiveFrom: row.effectiveFrom,
          effectiveTo: row.effectiveTo,
        }))
      : SAMPLE_SIGNATORY_DEFAULTS.map((row) => ({
          slot: row.slot,
          displayName: row.displayName,
          title: row.title,
          isActive: true,
          effectiveFrom: null as string | null,
          effectiveTo: null as string | null,
        }));

  const scheduleDefaults = {
    id: activeSchedule?.id ?? null,
    name: activeSchedule?.name ?? "Compressed four-day week",
    weekdayRules:
      (activeSchedule?.weekdayRules as WeekdayRules | undefined) ??
      createCompressedWeekdayRules(),
  };

  return {
    user,
    profile,
    step,
    resolvedStep: resolved,
    completed: isOnboardingComplete(profile.onboardingCompletedAt),
    profileDefaults,
    scheduleDefaults,
    signatoryDefaults,
    schedules,
    templates,
  };
}

export type OnboardingContext = Awaited<ReturnType<typeof loadOnboardingContext>>;
export type { OnboardingStepId };
