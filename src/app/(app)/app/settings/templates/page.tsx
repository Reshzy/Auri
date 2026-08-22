import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { getTemplateAvailability } from "@/db/dal/templates";
import { TemplatesAvailabilityPanel } from "@/features/settings/templates-panel";
import { hasDatabaseUrl, hasAuthConfig } from "@/lib/env";

export const metadata: Metadata = {
  title: "Templates",
};

export default async function TemplatesSettingsPage() {
  if (!hasAuthConfig() || !hasDatabaseUrl()) {
    redirect("/sign-in?error=config");
  }

  try {
    await requireAuthenticatedUser();
  } catch {
    redirect("/sign-in");
  }

  const templates = await getTemplateAvailability();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-auri-ink text-2xl font-semibold">Templates</h2>
        <p className="text-auri-ink-muted mt-1 text-sm">
          Verify that both active templates are available for document generation.
        </p>
      </div>
      <TemplatesAvailabilityPanel
        items={templates.items}
        bothAvailable={templates.bothAvailable}
        mode="settings"
      />
    </div>
  );
}
