import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { assertOwnerMatchesSession } from "@/db/dal/ownership";
import {
  assertEditable,
  getScheduleRulesFromReport,
  type DailyEntryRow,
  type ReportPeriodRow,
} from "@/db/dal/reports";
import { accomplishmentPresets } from "@/db/schema/accomplishment-presets";
import { dailyEntries, reportPeriods } from "@/db/schema";
import { invalidateOwnReportExportsOn } from "@/db/dal/exports";
import { dedupeIdsPreserveOrder, mergePresetContents } from "@/lib/presets/merge";
import {
  normalizeAccomplishmentForCompare,
  normalizeShortcut,
} from "@/lib/presets/normalize";
import { filterPresets } from "@/lib/presets/search";
import { orderPresets } from "@/lib/presets/order";
import { STARTER_PRESETS } from "@/lib/presets/starters";
import { AppError } from "@/lib/reports/errors";
import { recalculateDailyEntry } from "@/lib/reports/recalculate";
import { SHORTCUT_CONFLICT_MESSAGE, type PresetInput } from "@/lib/validation/presets";
import type { DayClassification } from "@/lib/reports/classify";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PresetRow = typeof accomplishmentPresets.$inferSelect;

function assertUserId(userId: string): void {
  if (!UUID_RE.test(userId)) {
    throw new AppError("Invalid authenticated user id.", "VALIDATION");
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code === "23505") return true;
  const message =
    "message" in error ? String((error as { message?: unknown }).message) : "";
  return message.includes("accomplishment_presets_shortcut_per_user_idx");
}

async function assertShortcutAvailable(
  userId: string,
  shortcut: string | null,
  exceptPresetId?: string,
): Promise<void> {
  if (!shortcut) return;
  const db = getDb();
  const rows = await db
    .select({ id: accomplishmentPresets.id })
    .from(accomplishmentPresets)
    .where(
      and(
        eq(accomplishmentPresets.userId, userId),
        eq(accomplishmentPresets.shortcut, shortcut),
      ),
    )
    .limit(2);
  const conflict = rows.find((row) => row.id !== exceptPresetId);
  if (conflict) {
    throw new AppError(SHORTCUT_CONFLICT_MESSAGE, "CONFLICT");
  }
}

export async function listOwnActivePresets(
  userId: string,
  options?: { query?: string },
): Promise<PresetRow[]> {
  assertUserId(userId);
  const db = getDb();
  const rows = await db
    .select()
    .from(accomplishmentPresets)
    .where(
      and(
        eq(accomplishmentPresets.userId, userId),
        eq(accomplishmentPresets.isActive, true),
      ),
    )
    .orderBy(
      desc(accomplishmentPresets.useCount),
      sql`${accomplishmentPresets.lastUsedAt} desc nulls last`,
      asc(accomplishmentPresets.label),
      asc(accomplishmentPresets.createdAt),
    );

  const ordered = orderPresets(rows);
  if (!options?.query?.trim()) return ordered;
  return filterPresets(ordered, options.query);
}

export async function getOwnPreset(
  userId: string,
  presetId: string,
): Promise<PresetRow | null> {
  assertUserId(userId);
  if (!UUID_RE.test(presetId)) return null;
  const db = getDb();
  const rows = await db
    .select()
    .from(accomplishmentPresets)
    .where(
      and(
        eq(accomplishmentPresets.id, presetId),
        eq(accomplishmentPresets.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

function canonicalizePresetInput(input: PresetInput): PresetInput {
  return {
    label: input.label.trim(),
    content: input.content.trim(),
    category:
      input.category === null ||
      input.category === undefined ||
      input.category.trim() === ""
        ? null
        : input.category.trim(),
    shortcut: normalizeShortcut(input.shortcut),
  };
}

export async function createOwnPreset(
  userId: string,
  input: PresetInput,
  clientSuppliedOwnerId?: unknown,
): Promise<PresetRow> {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  const data = canonicalizePresetInput(input);
  await assertShortcutAvailable(userId, data.shortcut);

  const db = getDb();
  try {
    const inserted = await db
      .insert(accomplishmentPresets)
      .values({
        userId,
        label: data.label,
        content: data.content,
        category: data.category,
        shortcut: data.shortcut,
        useCount: 0,
        lastUsedAt: null,
        isActive: true,
      })
      .returning();
    if (!inserted[0]) {
      throw new AppError("Could not create preset.", "VALIDATION");
    }
    return inserted[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isUniqueViolation(error)) {
      throw new AppError(SHORTCUT_CONFLICT_MESSAGE, "CONFLICT");
    }
    throw error;
  }
}

export async function updateOwnPreset(
  userId: string,
  presetId: string,
  input: PresetInput,
  clientSuppliedOwnerId?: unknown,
): Promise<PresetRow> {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  if (!UUID_RE.test(presetId)) {
    throw new AppError("Preset not found.", "NOT_FOUND");
  }

  const existing = await getOwnPreset(userId, presetId);
  if (!existing || !existing.isActive) {
    throw new AppError("Preset not found.", "NOT_FOUND");
  }

  const data = canonicalizePresetInput(input);
  await assertShortcutAvailable(userId, data.shortcut, presetId);

  const db = getDb();
  try {
    const updated = await db
      .update(accomplishmentPresets)
      .set({
        label: data.label,
        content: data.content,
        category: data.category,
        shortcut: data.shortcut,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(accomplishmentPresets.id, presetId),
          eq(accomplishmentPresets.userId, userId),
          eq(accomplishmentPresets.isActive, true),
        ),
      )
      .returning();
    if (!updated[0]) {
      throw new AppError("Preset not found.", "NOT_FOUND");
    }
    return updated[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isUniqueViolation(error)) {
      throw new AppError(SHORTCUT_CONFLICT_MESSAGE, "CONFLICT");
    }
    throw error;
  }
}

export async function deactivateOwnPreset(
  userId: string,
  presetId: string,
  clientSuppliedOwnerId?: unknown,
): Promise<PresetRow> {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  if (!UUID_RE.test(presetId)) {
    throw new AppError("Preset not found.", "NOT_FOUND");
  }

  const db = getDb();
  const updated = await db
    .update(accomplishmentPresets)
    .set({
      isActive: false,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(accomplishmentPresets.id, presetId),
        eq(accomplishmentPresets.userId, userId),
        eq(accomplishmentPresets.isActive, true),
      ),
    )
    .returning();

  if (!updated[0]) {
    throw new AppError("Preset not found.", "NOT_FOUND");
  }
  return updated[0];
}

export type SeedStartersResult = {
  inserted: PresetRow[];
  skipped: number;
  totalStarters: number;
};

/**
 * Idempotent starter seeding. Matches by normalized content across all presets
 * (active and inactive). Never overwrites or reactivates existing rows.
 */
export async function seedStarterPresetsForUser(
  userId: string,
  clientSuppliedOwnerId?: unknown,
): Promise<SeedStartersResult> {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);

  const db = getDb();
  const existing = await db
    .select()
    .from(accomplishmentPresets)
    .where(eq(accomplishmentPresets.userId, userId));

  const existingKeys = new Set(
    existing.map((row) => normalizeAccomplishmentForCompare(row.content)),
  );

  const missing = STARTER_PRESETS.filter(
    (starter) => !existingKeys.has(normalizeAccomplishmentForCompare(starter.content)),
  );

  if (missing.length === 0) {
    return {
      inserted: [],
      skipped: STARTER_PRESETS.length,
      totalStarters: STARTER_PRESETS.length,
    };
  }

  const inserted = await db
    .insert(accomplishmentPresets)
    .values(
      missing.map((starter) => ({
        userId,
        label: starter.label,
        content: starter.content,
        category: null as string | null,
        shortcut: null as string | null,
        useCount: 0,
        lastUsedAt: null as string | null,
        isActive: true,
      })),
    )
    .returning();

  return {
    inserted,
    skipped: STARTER_PRESETS.length - inserted.length,
    totalStarters: STARTER_PRESETS.length,
  };
}

export type ApplyPresetsResult = {
  report: ReportPeriodRow;
  entry: DailyEntryRow;
  savedAt: string;
  appliedPresetIds: string[];
  skippedDuplicatePresetIds: string[];
  presetsUsage: Array<{
    id: string;
    useCount: number;
    lastUsedAt: string | null;
  }>;
};

export async function applyOwnPresetsToDailyEntry(
  userId: string,
  reportId: string,
  entryId: string,
  presetIds: string[],
  clientSuppliedOwnerId?: unknown,
): Promise<ApplyPresetsResult> {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  if (!UUID_RE.test(reportId) || !UUID_RE.test(entryId)) {
    throw new AppError("Daily entry not found.", "NOT_FOUND");
  }

  const orderedIds = dedupeIdsPreserveOrder(presetIds);
  if (orderedIds.length === 0) {
    throw new AppError("Select at least one preset.", "VALIDATION");
  }
  for (const id of orderedIds) {
    if (!UUID_RE.test(id)) {
      throw new AppError("Invalid preset id.", "VALIDATION");
    }
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const lockedEntries = await tx
      .select()
      .from(dailyEntries)
      .where(
        and(
          eq(dailyEntries.id, entryId),
          eq(dailyEntries.reportPeriodId, reportId),
          eq(dailyEntries.userId, userId),
        ),
      )
      .for("update");

    const entry = lockedEntries[0];
    if (!entry) {
      throw new AppError("Daily entry not found.", "NOT_FOUND");
    }

    const reportRows = await tx
      .select()
      .from(reportPeriods)
      .where(and(eq(reportPeriods.id, reportId), eq(reportPeriods.userId, userId)))
      .limit(1);
    const report = reportRows[0];
    if (!report) {
      throw new AppError("Daily entry not found.", "NOT_FOUND");
    }
    assertEditable(report.status);

    const presetRows = await tx
      .select()
      .from(accomplishmentPresets)
      .where(
        and(
          eq(accomplishmentPresets.userId, userId),
          eq(accomplishmentPresets.isActive, true),
          inArray(accomplishmentPresets.id, orderedIds),
        ),
      );

    const byId = new Map(presetRows.map((row) => [row.id, row]));
    const orderedPresets: PresetRow[] = [];
    for (const id of orderedIds) {
      const preset = byId.get(id);
      if (!preset) {
        throw new AppError(
          "One or more presets are missing, inactive, or not yours.",
          "FORBIDDEN",
        );
      }
      orderedPresets.push(preset);
    }

    const existingAccomplishments = entry.accomplishments ?? [];
    const merge = mergePresetContents({
      existing: existingAccomplishments,
      selectedContents: orderedPresets.map((p) => p.content),
    });

    if (merge.next.length > 40) {
      throw new AppError("A day can have at most 40 accomplishment items.", "VALIDATION");
    }

    const appliedPresetIds = merge.appliedIndexes.map((i) => orderedPresets[i]!.id);
    const skippedDuplicatePresetIds = merge.skippedDuplicateIndexes.map(
      (i) => orderedPresets[i]!.id,
    );

    const rules = getScheduleRulesFromReport(report);
    const recalculated = recalculateDailyEntry({
      workDate: entry.workDate,
      weekdayRules: rules,
      update: {
        classification: entry.classification as DayClassification,
        classificationLabel: entry.classificationLabel,
        amArrival: entry.amArrival,
        amDeparture: entry.amDeparture,
        pmArrival: entry.pmArrival,
        pmDeparture: entry.pmDeparture,
        undertimeOverrideMinutes: entry.undertimeOverrideMinutes,
        accomplishments: merge.next,
        remarks: entry.remarks,
      },
    });

    if (recalculated.issues.length > 0) {
      throw new AppError(recalculated.issues[0]!.message, "VALIDATION");
    }

    const now = new Date().toISOString();
    const updatedEntries = await tx
      .update(dailyEntries)
      .set({
        accomplishments: recalculated.accomplishments,
        isComplete: recalculated.isComplete,
        updatedAt: now,
      })
      .where(
        and(
          eq(dailyEntries.id, entryId),
          eq(dailyEntries.reportPeriodId, reportId),
          eq(dailyEntries.userId, userId),
        ),
      )
      .returning();

    const updatedEntry = updatedEntries[0];
    if (!updatedEntry) {
      throw new AppError("Daily entry not found.", "NOT_FOUND");
    }

    await tx
      .update(reportPeriods)
      .set({ updatedAt: now })
      .where(and(eq(reportPeriods.id, reportId), eq(reportPeriods.userId, userId)));

    if (appliedPresetIds.length > 0) {
      await invalidateOwnReportExportsOn(tx, userId, reportId);
    }

    const presetsUsage: ApplyPresetsResult["presetsUsage"] = [];
    for (const presetId of appliedPresetIds) {
      const bumped = await tx
        .update(accomplishmentPresets)
        .set({
          useCount: sql`${accomplishmentPresets.useCount} + 1`,
          lastUsedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(accomplishmentPresets.id, presetId),
            eq(accomplishmentPresets.userId, userId),
            eq(accomplishmentPresets.isActive, true),
          ),
        )
        .returning({
          id: accomplishmentPresets.id,
          useCount: accomplishmentPresets.useCount,
          lastUsedAt: accomplishmentPresets.lastUsedAt,
        });
      if (bumped[0]) {
        presetsUsage.push(bumped[0]);
      }
    }

    // Include skipped presets' current usage for client refresh without increment
    for (const presetId of skippedDuplicatePresetIds) {
      if (presetsUsage.some((p) => p.id === presetId)) continue;
      const preset = byId.get(presetId);
      if (preset) {
        presetsUsage.push({
          id: preset.id,
          useCount: preset.useCount,
          lastUsedAt: preset.lastUsedAt,
        });
      }
    }

    const refreshedReport = await tx
      .select()
      .from(reportPeriods)
      .where(and(eq(reportPeriods.id, reportId), eq(reportPeriods.userId, userId)))
      .limit(1);

    return {
      report: refreshedReport[0]!,
      entry: updatedEntry,
      savedAt: now,
      appliedPresetIds,
      skippedDuplicatePresetIds,
      presetsUsage,
    };
  });
}

/** Used by tests / diagnostics — ownership-scoped load of all presets including inactive. */
export async function listOwnPresetsIncludingInactive(
  userId: string,
): Promise<PresetRow[]> {
  assertUserId(userId);
  const db = getDb();
  return db
    .select()
    .from(accomplishmentPresets)
    .where(eq(accomplishmentPresets.userId, userId));
}

export async function countOwnActivePresets(userId: string): Promise<number> {
  assertUserId(userId);
  const db = getDb();
  const rows = await db
    .select({ id: accomplishmentPresets.id })
    .from(accomplishmentPresets)
    .where(
      and(
        eq(accomplishmentPresets.userId, userId),
        eq(accomplishmentPresets.isActive, true),
      ),
    );
  return rows.length;
}
