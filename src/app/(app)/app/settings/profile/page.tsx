import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { ensureProfile, getOwnProfile } from "@/db/dal/profiles";
import { ProfileForm } from "@/features/settings/profile-form";
import { SAMPLE_PROFILE_DEFAULTS } from "@/lib/onboarding/defaults";
import { hasDatabaseUrl, hasAuthConfig } from "@/lib/env";

export const metadata: Metadata = {
  title: "Profile & office",
};

export default async function ProfileSettingsPage() {
  if (!hasAuthConfig() || !hasDatabaseUrl()) {
    redirect("/sign-in?error=config");
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/sign-in");
  }

  const profile = (await getOwnProfile(user.id)) ?? (await ensureProfile(user.id));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-auri-ink text-2xl font-semibold">Profile &amp; office</h2>
        <p className="text-auri-ink-muted mt-1 text-sm">
          Employee name, municipality, office, and department used on generated documents.
        </p>
      </div>
      <ProfileForm
        values={{
          employeeName: profile.employeeName || SAMPLE_PROFILE_DEFAULTS.employeeName,
          employeeTitle: profile.employeeTitle ?? SAMPLE_PROFILE_DEFAULTS.employeeTitle,
          organizationName:
            profile.organizationName ?? SAMPLE_PROFILE_DEFAULTS.organizationName,
          officeName: profile.officeName ?? SAMPLE_PROFILE_DEFAULTS.officeName,
          departmentName:
            profile.departmentName ?? SAMPLE_PROFILE_DEFAULTS.departmentName,
          timezone: profile.timezone || SAMPLE_PROFILE_DEFAULTS.timezone,
          locale: profile.locale || SAMPLE_PROFILE_DEFAULTS.locale,
        }}
      />
    </div>
  );
}
