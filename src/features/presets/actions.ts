"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { hasDatabaseUrl } from "@/lib/env";
import { toSafeErrorMessage } from "@/lib/reports/errors";
import { applyPresetsSchema, presetSchema } from "@/lib/validation/presets";
import { PresetService } from "@/server/services/preset-service";

export type PresetActionState = {
  error?: string;
  success?: string;
  presetId?: string;
  insertedCount?: number;
};

export type ApplyPresetsResult = {
  ok: boolean;
  error?: string;
  savedAt?: string;
  entry?: unknown;
  reportStatus?: string;
  validationReady?: boolean;
  validation?: unknown;
  revision?: number;
  appliedPresetIds?: string[];
  skippedDuplicatePresetIds?: string[];
  presetsUsage?: Array<{
    id: string;
    useCount: number;
    lastUsedAt: string | null;
  }>;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function rejectClientUserId(formData: FormData): string | undefined {
  for (const key of ["userId", "user_id", "ownerId", "owner_id"]) {
    const value = formData.get(key);
    if (value !== null && value !== undefined && `${value}`.length > 0) {
      return `${value}`;
    }
  }
  return undefined;
}

async function requireUser() {
  try {
    return await requireAuthenticatedUser();
  } catch {
    redirect("/sign-in");
  }
}

function parsePresetForm(formData: FormData) {
  return presetSchema.safeParse({
    label: formString(formData, "label"),
    content: formString(formData, "content"),
    category: formString(formData, "category"),
    shortcut: formString(formData, "shortcut"),
  });
}

export async function createPresetAction(
  _prev: PresetActionState,
  formData: FormData,
): Promise<PresetActionState> {
  if (!hasDatabaseUrl()) return { error: "Database is not configured." };
  const user = await requireUser();
  const parsed = parsePresetForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid preset." };
  }
  try {
    const created = await PresetService.create(
      user.id,
      parsed.data,
      rejectClientUserId(formData),
    );
    revalidatePath("/app/presets");
    revalidatePath("/app");
    return { success: "Preset created.", presetId: created.id };
  } catch (error) {
    return { error: toSafeErrorMessage(error, "Could not create the preset.") };
  }
}

export async function updatePresetAction(
  _prev: PresetActionState,
  formData: FormData,
): Promise<PresetActionState> {
  if (!hasDatabaseUrl()) return { error: "Database is not configured." };
  const user = await requireUser();
  const presetId = formString(formData, "presetId");
  const parsed = parsePresetForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid preset." };
  }
  try {
    const updated = await PresetService.update(
      user.id,
      presetId,
      parsed.data,
      rejectClientUserId(formData),
    );
    revalidatePath("/app/presets");
    return { success: "Preset updated.", presetId: updated.id };
  } catch (error) {
    return { error: toSafeErrorMessage(error, "Could not update the preset.") };
  }
}

export async function deactivatePresetAction(
  _prev: PresetActionState,
  formData: FormData,
): Promise<PresetActionState> {
  if (!hasDatabaseUrl()) return { error: "Database is not configured." };
  const user = await requireUser();
  const presetId = formString(formData, "presetId");
  const confirmed = formString(formData, "confirm") === "yes";
  if (!confirmed) {
    return { error: "Deactivate requires confirmation." };
  }
  try {
    await PresetService.deactivate(user.id, presetId, rejectClientUserId(formData));
    revalidatePath("/app/presets");
    return { success: "Preset deactivated.", presetId };
  } catch (error) {
    return {
      error: toSafeErrorMessage(error, "Could not deactivate the preset."),
    };
  }
}

export async function seedStarterPresetsAction(
  _prev: PresetActionState,
  formData: FormData,
): Promise<PresetActionState> {
  if (!hasDatabaseUrl()) return { error: "Database is not configured." };
  const user = await requireUser();
  try {
    const result = await PresetService.seedStarters(
      user.id,
      rejectClientUserId(formData),
    );
    revalidatePath("/app/presets");
    if (result.inserted.length === 0) {
      return {
        success: "Starter presets are already present.",
        insertedCount: 0,
      };
    }
    return {
      success: `Added ${result.inserted.length} starter preset${result.inserted.length === 1 ? "" : "s"}.`,
      insertedCount: result.inserted.length,
    };
  } catch (error) {
    return {
      error: toSafeErrorMessage(error, "Could not add starter presets."),
    };
  }
}

export async function applyPresetsToDailyEntryAction(input: {
  reportId: string;
  entryId: string;
  presetIds: string[];
  revision?: number;
  clientSuppliedOwnerId?: unknown;
}): Promise<ApplyPresetsResult> {
  if (!hasDatabaseUrl()) {
    return {
      ok: false,
      error: "Database is not configured.",
      revision: input.revision,
    };
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    return {
      ok: false,
      error: "Authentication required.",
      revision: input.revision,
    };
  }

  const parsed = applyPresetsSchema.safeParse({
    reportId: input.reportId,
    entryId: input.entryId,
    presetIds: input.presetIds,
    revision: input.revision,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid preset selection.",
      revision: input.revision,
    };
  }

  try {
    const result = await PresetService.applyToDailyEntry(
      user.id,
      parsed.data.reportId,
      parsed.data.entryId,
      parsed.data.presetIds,
      input.clientSuppliedOwnerId,
    );
    return {
      ok: true,
      savedAt: result.savedAt,
      entry: result.entry,
      reportStatus: result.reportStatus,
      validationReady: result.validation.ready,
      validation: result.validation,
      revision: input.revision,
      appliedPresetIds: result.appliedPresetIds,
      skippedDuplicatePresetIds: result.skippedDuplicatePresetIds,
      presetsUsage: result.presetsUsage,
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, "Could not apply presets."),
      revision: input.revision,
    };
  }
}
