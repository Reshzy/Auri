import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { ensureProfile } from "@/db/dal/profiles";
import { listOwnSignatories } from "@/db/dal/signatories";
import { SignatoriesForm } from "@/features/settings/signatories-form";
import { SAMPLE_SIGNATORY_DEFAULTS } from "@/lib/onboarding/defaults";
import { hasDatabaseUrl, hasAuthConfig } from "@/lib/env";

export const metadata: Metadata = {
  title: "Signatories",
};

export default async function SignatoriesSettingsPage() {
  if (!hasAuthConfig() || !hasDatabaseUrl()) {
    redirect("/sign-in?error=config");
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/sign-in");
  }

  await ensureProfile(user.id);
  const rows = await listOwnSignatories(user.id);
  const values =
    rows.length === 4
      ? rows.map((row) => ({
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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h2 className="text-auri-ink text-2xl font-semibold">Signatories</h2>
        <p className="text-auri-ink-muted mt-1 text-sm">
          Four ordered slots: employee signature owner and three verifiers.
        </p>
      </div>
      <SignatoriesForm values={values} />
    </div>
  );
}
