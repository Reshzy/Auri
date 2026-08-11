import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { ensureProfile } from "@/db/dal/profiles";
import { getOwnActiveSchedule } from "@/db/dal/schedules";
import { ScheduleForm } from "@/features/settings/schedule-form";
import {
  COMPRESSED_SCHEDULE_NAME,
  createCompressedWeekdayRules,
} from "@/lib/onboarding/defaults";
import type { WeekdayRules } from "@/lib/validation/onboarding";
import { hasDatabaseUrl, hasSupabasePublicConfig } from "@/lib/env";

export default async function ScheduleSettingsPage() {
  if (!hasSupabasePublicConfig() || !hasDatabaseUrl()) {
    redirect("/login?error=config");
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/login");
  }

  await ensureProfile(user.id);
  const active = await getOwnActiveSchedule(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-auri-ink text-2xl font-semibold">Work schedule</h2>
        <p className="text-auri-ink-muted mt-1 text-sm">
          Define all seven weekday rules. Use the compressed four-day preset or the
          standard five-day week, then edit exact times.
        </p>
      </div>
      <ScheduleForm
        scheduleId={active?.id ?? null}
        name={active?.name ?? COMPRESSED_SCHEDULE_NAME}
        weekdayRules={
          (active?.weekdayRules as WeekdayRules | undefined) ??
          createCompressedWeekdayRules()
        }
      />
    </div>
  );
}
