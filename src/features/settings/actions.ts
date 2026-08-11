"use server";

import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import {
  completeOwnOnboarding,
  getOwnProfile,
  updateOwnProfile,
} from "@/db/dal/profiles";
import { upsertOwnDefaultSchedule } from "@/db/dal/schedules";
import { listOwnSignatories, upsertOwnSignatories } from "@/db/dal/signatories";
import { getTemplateAvailability } from "@/db/dal/templates";
import {
  profileSchema,
  signatoriesFormSchema,
  weekdayRulesSchema,
  workScheduleSchema,
} from "@/lib/validation/onboarding";
import { hasDatabaseUrl } from "@/lib/env";

export type SettingsActionState = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function formNullable(formData: FormData, key: string): string | null {
  const value = formString(formData, key);
  return value.length > 0 ? value : null;
}

function rejectClientUserId(formData: FormData): string | undefined {
  const candidates = ["userId", "user_id", "ownerId", "owner_id"];
  for (const key of candidates) {
    const value = formData.get(key);
    if (value !== null && value !== undefined && `${value}`.length > 0) {
      return `${value}`;
    }
  }
  return undefined;
}

function requireDb(): SettingsActionState | null {
  if (!hasDatabaseUrl()) {
    return { error: "Database is not configured." };
  }
  return null;
}

export async function saveProfileAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const dbError = requireDb();
  if (dbError) {
    return dbError;
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/login");
  }

  const parsed = profileSchema.safeParse({
    employeeName: formString(formData, "employeeName"),
    employeeTitle: formNullable(formData, "employeeTitle"),
    organizationName: formString(formData, "organizationName"),
    officeName: formString(formData, "officeName"),
    departmentName: formNullable(formData, "departmentName"),
    timezone: formString(formData, "timezone") || "Asia/Manila",
    locale: formString(formData, "locale") || "en-PH",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile." };
  }

  try {
    await updateOwnProfile(user.id, parsed.data, rejectClientUserId(formData));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save profile.",
    };
  }

  const next = formString(formData, "nextStep");
  if (next === "schedule") {
    redirect("/onboarding?step=schedule");
  }
  return { success: "Profile saved." };
}

export async function saveScheduleAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const dbError = requireDb();
  if (dbError) {
    return dbError;
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/login");
  }

  let weekdayRulesRaw: unknown = {};
  try {
    weekdayRulesRaw = JSON.parse(formString(formData, "weekdayRulesJson") || "{}");
  } catch {
    return { error: "Schedule rules are invalid." };
  }

  const rulesParsed = weekdayRulesSchema.safeParse(weekdayRulesRaw);
  if (!rulesParsed.success) {
    return {
      error:
        rulesParsed.error.issues[0]?.message ?? "Schedule must cover all seven days.",
    };
  }

  const parsed = workScheduleSchema.safeParse({
    name: formString(formData, "name"),
    weekdayRules: rulesParsed.data,
    scheduleId: formNullable(formData, "scheduleId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid schedule." };
  }

  try {
    await upsertOwnDefaultSchedule(user.id, {
      name: parsed.data.name,
      weekdayRules: parsed.data.weekdayRules,
      scheduleId: parsed.data.scheduleId,
      clientSuppliedOwnerId: rejectClientUserId(formData),
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save schedule.",
    };
  }

  const next = formString(formData, "nextStep");
  if (next === "signatories") {
    redirect("/onboarding?step=signatories");
  }
  return { success: "Work schedule saved." };
}

export async function saveSignatoriesAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const dbError = requireDb();
  if (dbError) {
    return dbError;
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/login");
  }

  const slots = [0, 1, 2, 3].map((slot) => ({
    slot,
    displayName: formString(formData, `displayName_${slot}`),
    title: formString(formData, `title_${slot}`),
    isActive: formString(formData, `isActive_${slot}`) !== "false",
    effectiveFrom: formNullable(formData, `effectiveFrom_${slot}`),
    effectiveTo: formNullable(formData, `effectiveTo_${slot}`),
  }));

  const parsed = signatoriesFormSchema.safeParse({ signatories: slots });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid signatories.",
    };
  }

  try {
    await upsertOwnSignatories(
      user.id,
      parsed.data.signatories,
      rejectClientUserId(formData),
    );
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save signatories.",
    };
  }

  const next = formString(formData, "nextStep");
  if (next === "templates") {
    redirect("/onboarding?step=templates");
  }
  return { success: "Signatories saved." };
}

export async function continueTemplatesAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const dbError = requireDb();
  if (dbError) {
    return dbError;
  }

  try {
    await requireAuthenticatedUser();
  } catch {
    redirect("/login");
  }

  const templates = await getTemplateAvailability();
  if (!templates.bothAvailable) {
    return {
      error:
        "Both active templates must be available before continuing. Source manifests from Phase 0 or an activated template_versions row are required.",
    };
  }

  const next = formString(formData, "nextStep");
  if (next === "ready") {
    redirect("/onboarding?step=ready");
  }
  return { success: "Templates verified." };
}

export async function completeOnboardingAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const dbError = requireDb();
  if (dbError) {
    return dbError;
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/login");
  }

  try {
    const profile = await getOwnProfile(user.id);
    if (!profile?.employeeName?.trim()) {
      return { error: "Complete the employee and office step first." };
    }
    if (!profile.activeScheduleId) {
      return { error: "Save a work schedule before finishing onboarding." };
    }
    const signatories = await listOwnSignatories(user.id);
    if (signatories.length < 4) {
      return { error: "Save all four signatory slots before finishing." };
    }
    const templates = await getTemplateAvailability();
    if (!templates.bothAvailable) {
      return { error: "Both templates must be available before finishing." };
    }
    await completeOwnOnboarding(user.id, rejectClientUserId(formData));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not complete onboarding.",
    };
  }

  redirect("/app");
}
