import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { OnboardingStepMotion } from "@/components/motion/onboarding-step-motion";
import { Button } from "@/components/ui/button";
import { DatabaseUnavailable } from "@/components/ui/unavailable-state";
import { loadOnboardingContext } from "@/db/dal/onboarding-state";
import { ProfileForm } from "@/features/settings/profile-form";
import { ScheduleForm } from "@/features/settings/schedule-form";
import { SignatoriesForm } from "@/features/settings/signatories-form";
import {
  ReadyStepPanel,
  TemplatesAvailabilityPanel,
} from "@/features/settings/templates-panel";
import { shouldShowDatabaseUnavailable } from "@/lib/auth/handle-page-error";
import { hasDatabaseUrl, hasClerkConfig } from "@/lib/env";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  type OnboardingStepId,
} from "@/lib/onboarding/progress";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set up Auri",
  description: "Finish your profile, schedule, and signatories before creating a report.",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  if (!hasClerkConfig() || !hasDatabaseUrl()) {
    return (
      <div className="mx-auto w-full max-w-md">
        <DatabaseUnavailable />
      </div>
    );
  }

  const params = await searchParams;
  let context;
  try {
    context = await loadOnboardingContext(params.step);
  } catch (error) {
    shouldShowDatabaseUnavailable(error);
    return (
      <div className="mx-auto w-full max-w-md">
        <DatabaseUnavailable />
      </div>
    );
  }

  if (context.completed) {
    redirect("/app");
  }

  const step = context.step;
  const stepIndex = ONBOARDING_STEPS.indexOf(step) + 1;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <AuthCard
        title="Set up Auri"
        description="Progress is saved, so you can resume after refresh. Complete these details before your first report."
      >
        <p className="text-auri-ink-muted mb-3 text-sm">
          Step {stepIndex} of {ONBOARDING_STEPS.length}. You can return to an earlier step
          at any time.
        </p>
        <ol className="mb-6 flex flex-wrap gap-2" aria-label="Onboarding progress">
          {ONBOARDING_STEPS.map((id) => {
            const active = id === step;
            const done = ONBOARDING_STEPS.indexOf(id) < ONBOARDING_STEPS.indexOf(step);
            return (
              <li key={id}>
                <Link
                  href={`/onboarding?step=${id}`}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full px-3 py-1 text-xs font-medium",
                    active
                      ? "bg-auri-orange-700 font-semibold text-white"
                      : done
                        ? "bg-auri-orange-100 text-auri-orange-700"
                        : "bg-auri-orange-50 text-auri-ink-muted",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {ONBOARDING_STEP_LABELS[id]}
                </Link>
              </li>
            );
          })}
        </ol>

        <OnboardingStepMotion step={step}>
          <StepBody step={step} context={context} />
        </OnboardingStepMotion>
      </AuthCard>
    </div>
  );
}

function StepBody({
  step,
  context,
}: {
  step: OnboardingStepId;
  context: Awaited<ReturnType<typeof loadOnboardingContext>>;
}) {
  switch (step) {
    case "welcome":
      return (
        <div className="space-y-4">
          <p className="text-auri-ink-muted text-sm">
            Auri generates two official documents from your period entries: an
            accomplishment report (DOCX) and a Daily Time Record (XLSX). The next steps
            capture the employee, office, schedule, and signatory details those files
            need.
          </p>
          <Button asChild className="w-full">
            <Link href="/onboarding?step=profile">Continue</Link>
          </Button>
        </div>
      );
    case "profile":
      return (
        <ProfileForm
          values={{
            employeeName: context.profileDefaults.employeeName,
            employeeTitle: context.profileDefaults.employeeTitle ?? "",
            organizationName: context.profileDefaults.organizationName ?? "",
            officeName: context.profileDefaults.officeName ?? "",
            departmentName: context.profileDefaults.departmentName ?? "",
            timezone: context.profileDefaults.timezone,
            locale: context.profileDefaults.locale,
          }}
          nextStep="schedule"
          submitLabel="Save and continue"
        />
      );
    case "schedule":
      return (
        <ScheduleForm
          scheduleId={context.scheduleDefaults.id}
          name={context.scheduleDefaults.name}
          weekdayRules={context.scheduleDefaults.weekdayRules}
          nextStep="signatories"
          submitLabel="Save and continue"
        />
      );
    case "signatories":
      return (
        <SignatoriesForm
          values={context.signatoryDefaults}
          nextStep="templates"
          submitLabel="Save and continue"
        />
      );
    case "templates":
      return (
        <TemplatesAvailabilityPanel
          items={context.templates.items}
          bothAvailable={context.templates.bothAvailable}
          mode="onboarding"
        />
      );
    case "ready":
      return <ReadyStepPanel />;
    default:
      return null;
  }
}
