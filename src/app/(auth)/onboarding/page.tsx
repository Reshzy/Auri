import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { loadOnboardingContext } from "@/db/dal/onboarding-state";
import { ProfileForm } from "@/features/settings/profile-form";
import { ScheduleForm } from "@/features/settings/schedule-form";
import { SignatoriesForm } from "@/features/settings/signatories-form";
import {
  ReadyStepPanel,
  TemplatesAvailabilityPanel,
} from "@/features/settings/templates-panel";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  type OnboardingStepId,
} from "@/lib/onboarding/progress";
import { hasDatabaseUrl, hasSupabasePublicConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  if (!hasSupabasePublicConfig()) {
    redirect("/login?error=config");
  }
  if (!hasDatabaseUrl()) {
    redirect("/login?error=config");
  }

  const params = await searchParams;
  let context;
  try {
    context = await loadOnboardingContext(params.step);
  } catch {
    redirect("/login");
  }

  if (context.completed) {
    redirect("/app");
  }

  const step = context.step;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <AuthCard
        title="Set up Auri"
        description="Collect employee, schedule, and signatory details before your first report. Progress is saved so you can resume after refresh."
      >
        <ol className="mb-6 flex flex-wrap gap-2" aria-label="Onboarding progress">
          {ONBOARDING_STEPS.map((id) => {
            const active = id === step;
            const done = ONBOARDING_STEPS.indexOf(id) < ONBOARDING_STEPS.indexOf(step);
            return (
              <li key={id}>
                <Link
                  href={`/onboarding?step=${id}`}
                  className={
                    active
                      ? "bg-auri-orange-600 inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white"
                      : done
                        ? "bg-auri-orange-100 text-auri-orange-700 inline-flex rounded-full px-3 py-1 text-xs font-medium"
                        : "bg-auri-orange-50 text-auri-ink-muted inline-flex rounded-full px-3 py-1 text-xs"
                  }
                  aria-current={active ? "step" : undefined}
                >
                  {ONBOARDING_STEP_LABELS[id]}
                </Link>
              </li>
            );
          })}
        </ol>

        <StepBody step={step} context={context} />
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
          <Link
            href="/onboarding?step=profile"
            className="bg-auri-orange-600 hover:bg-auri-orange-700 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-medium text-white"
          >
            Continue
          </Link>
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
