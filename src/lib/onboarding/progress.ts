export const ONBOARDING_STEPS = [
  "welcome",
  "profile",
  "schedule",
  "signatories",
  "templates",
  "ready",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_STEP_LABELS: Record<OnboardingStepId, string> = {
  welcome: "Welcome",
  profile: "Employee and office",
  schedule: "Work schedule",
  signatories: "Signatories",
  templates: "Templates",
  ready: "Ready",
};

export type OnboardingProgressInput = {
  employeeName: string;
  activeScheduleId: string | null;
  signatoryCount: number;
  templatesAvailable: boolean;
  onboardingCompletedAt: string | null;
};

export function hasCompletedProfile(employeeName: string): boolean {
  return employeeName.trim().length > 0;
}

export function hasCompletedSchedule(activeScheduleId: string | null): boolean {
  return Boolean(activeScheduleId);
}

export function hasCompletedSignatories(signatoryCount: number): boolean {
  return signatoryCount >= 4;
}

/**
 * Infer the first incomplete onboarding step from persisted domain state.
 * Welcome is skipped once profile data exists (welcome itself has no DB row).
 */
export function resolveOnboardingStep(input: OnboardingProgressInput): OnboardingStepId {
  if (input.onboardingCompletedAt) {
    return "ready";
  }
  if (!hasCompletedProfile(input.employeeName)) {
    return "welcome";
  }
  if (!hasCompletedSchedule(input.activeScheduleId)) {
    return "schedule";
  }
  if (!hasCompletedSignatories(input.signatoryCount)) {
    return "signatories";
  }
  if (!input.templatesAvailable) {
    return "templates";
  }
  return "ready";
}

export function isOnboardingComplete(
  onboardingCompletedAt: string | null | undefined,
): boolean {
  return Boolean(onboardingCompletedAt);
}

export function parseOnboardingStep(
  value: string | null | undefined,
): OnboardingStepId | null {
  if (!value) {
    return null;
  }
  return (ONBOARDING_STEPS as readonly string[]).includes(value)
    ? (value as OnboardingStepId)
    : null;
}

/** Clamp a requested step so users cannot skip unfinished required data. */
export function clampOnboardingStep(
  requested: OnboardingStepId | null,
  resolved: OnboardingStepId,
): OnboardingStepId {
  if (!requested) {
    return resolved;
  }
  const requestedIndex = ONBOARDING_STEPS.indexOf(requested);
  const resolvedIndex = ONBOARDING_STEPS.indexOf(resolved);
  if (requestedIndex <= resolvedIndex) {
    return requested;
  }
  // Welcome has no persisted row — allow advancing once into the profile form.
  if (resolved === "welcome" && requested === "profile") {
    return "profile";
  }
  return resolved;
}
