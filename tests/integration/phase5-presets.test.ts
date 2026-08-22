import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { accomplishmentPresets } from "@/db/schema/accomplishment-presets";
import { dailyEntries } from "@/db/schema/daily-entries";
import { profiles } from "@/db/schema/profiles";
import { reportPeriods } from "@/db/schema/report-periods";
import { signatories } from "@/db/schema/signatories";
import { workSchedules } from "@/db/schema/work-schedules";
import { getDb } from "@/db";
import {
  applyOwnPresetsToDailyEntry,
  createOwnPreset,
  deactivateOwnPreset,
  listOwnActivePresets,
  seedStarterPresetsForUser,
  updateOwnPreset,
} from "@/db/dal/presets";
import { createCompressedWeekdayRules } from "@/lib/onboarding/defaults";
import { hasDatabaseUrl } from "@/lib/env";
import { STARTER_PRESETS } from "@/lib/presets/starters";
import { AppError } from "@/lib/reports/errors";
import { SHORTCUT_CONFLICT_MESSAGE } from "@/lib/validation/presets";
import { DailyEntryService } from "@/server/services/daily-entry-service";
import { PresetService } from "@/server/services/preset-service";
import { ReportPeriodService } from "@/server/services/report-period-service";

config({ path: ".env.local" });
config();

const runLive = hasDatabaseUrl();

describe.skipIf(!runLive)("Phase 5 presets integration (live Postgres)", () => {
  const userA = randomUUID();
  const userB = randomUUID();
  const createdUserIds = [userA, userB];

  async function seedUser(userId: string) {
    const db = getDb();
    await db.insert(profiles).values({
      id: userId,
      authUserId: userId,
      employeeName: `preset-${userId.slice(0, 8)}`,
      organizationName: "Municipality",
      officeName: "Office",
      timezone: "Asia/Manila",
      locale: "en-PH",
      onboardingCompletedAt: new Date().toISOString(),
    });
    const scheduleRows = await db
      .insert(workSchedules)
      .values({
        userId,
        name: "Compressed",
        weekdayRules: createCompressedWeekdayRules(),
        isDefault: true,
      })
      .returning();
    await db
      .update(profiles)
      .set({ activeScheduleId: scheduleRows[0]!.id })
      .where(eq(profiles.id, userId));
    for (let slot = 0; slot < 4; slot += 1) {
      await db.insert(signatories).values({
        userId,
        slot,
        displayName: `S${slot}`,
        title: `T${slot}`,
        isActive: true,
      });
    }
  }

  beforeAll(async () => {
    await seedUser(userA);
    await seedUser(userB);
  });

  afterAll(async () => {
    const db = getDb();
    for (const userId of createdUserIds) {
      await db
        .delete(accomplishmentPresets)
        .where(eq(accomplishmentPresets.userId, userId));
      await db.delete(dailyEntries).where(eq(dailyEntries.userId, userId));
      await db.delete(reportPeriods).where(eq(reportPeriods.userId, userId));
      await db.delete(signatories).where(eq(signatories.userId, userId));
      await db
        .update(profiles)
        .set({ activeScheduleId: null })
        .where(eq(profiles.id, userId));
      await db.delete(workSchedules).where(eq(workSchedules.userId, userId));
      await db.delete(profiles).where(eq(profiles.id, userId));
    }
  });

  it("creates, reads, updates, and deactivates presets for the owner", async () => {
    const created = await createOwnPreset(userA, {
      label: "Visitors",
      content: "Assisted visitors at the desk",
      category: "Front",
      shortcut: "vis",
    });
    expect(created.useCount).toBe(0);
    expect(created.shortcut).toBe("vis");

    const listed = await listOwnActivePresets(userA);
    expect(listed.some((p) => p.id === created.id)).toBe(true);

    const updated = await updateOwnPreset(userA, created.id, {
      label: "Visitors desk",
      content: "Assisted visitors at the desk",
      category: "Front desk",
      shortcut: "vis",
    });
    expect(updated.label).toBe("Visitors desk");

    const deactivated = await deactivateOwnPreset(userA, created.id);
    expect(deactivated.isActive).toBe(false);
    const after = await listOwnActivePresets(userA);
    expect(after.some((p) => p.id === created.id)).toBe(false);
  });

  it("rejects browser-supplied user_id and isolates across users", async () => {
    const owned = await createOwnPreset(userA, {
      label: "A only",
      content: "Owned by A unique content",
      category: null,
      shortcut: null,
    });

    await expect(
      createOwnPreset(
        userA,
        {
          label: "Bad",
          content: "Should fail ownership",
          category: null,
          shortcut: null,
        },
        userB,
      ),
    ).rejects.toThrow(/owner id/i);

    const bList = await listOwnActivePresets(userB);
    expect(bList.some((p) => p.id === owned.id)).toBe(false);

    await expect(
      updateOwnPreset(userB, owned.id, {
        label: "Hijack",
        content: "Owned by A unique content",
        category: null,
        shortcut: null,
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("enforces shortcut uniqueness per user and allows the same shortcut for another user", async () => {
    await createOwnPreset(userA, {
      label: "Docs A",
      content: "Prepared docs for A",
      category: null,
      shortcut: "docs",
    });
    await expect(
      createOwnPreset(userA, {
        label: "Docs A2",
        content: "Prepared more docs for A",
        category: null,
        shortcut: "DOCS",
      }),
    ).rejects.toMatchObject({ message: SHORTCUT_CONFLICT_MESSAGE });

    const b = await createOwnPreset(userB, {
      label: "Docs B",
      content: "Prepared docs for B",
      category: null,
      shortcut: "docs",
    });
    expect(b.shortcut).toBe("docs");
  });

  it("seeds starters idempotently without reactivating deactivated matches", async () => {
    const first = await seedStarterPresetsForUser(userB);
    expect(first.inserted.length).toBe(STARTER_PRESETS.length);

    const second = await seedStarterPresetsForUser(userB);
    expect(second.inserted.length).toBe(0);

    const active = await listOwnActivePresets(userB);
    const flag = active.find((p) => p.content === "Attended the flag ceremony");
    expect(flag).toBeTruthy();
    await deactivateOwnPreset(userB, flag!.id);

    const third = await seedStarterPresetsForUser(userB);
    expect(third.inserted.length).toBe(0);
    const stillActive = await listOwnActivePresets(userB);
    expect(stillActive.some((p) => p.content === "Attended the flag ceremony")).toBe(
      false,
    );
  });

  it("applies multiple presets in order, skips duplicates, updates use_count, and is retry-safe", async () => {
    const p1 = await createOwnPreset(userA, {
      label: "P1",
      content: "First applied preset",
      category: null,
      shortcut: "p1",
    });
    const p2 = await createOwnPreset(userA, {
      label: "P2",
      content: "Second applied preset",
      category: null,
      shortcut: "p2",
    });
    const p3 = await createOwnPreset(userA, {
      label: "P3",
      content: "Third applied preset",
      category: null,
      shortcut: null,
    });

    const report = await ReportPeriodService.create(userA, {
      year: 2026,
      month: 6,
      periodKind: "FIRST_HALF",
    });
    const workday = report.entries.find((e) => e.classification === "workday")!;

    await DailyEntryService.save(userA, report.report.id, workday.id, {
      classification: "workday",
      classificationLabel: null,
      amArrival: "07:00",
      amDeparture: "12:00",
      pmArrival: "13:00",
      pmDeparture: "18:00",
      undertimeOverrideMinutes: null,
      accomplishments: ["Manual item", "first applied preset"],
      remarks: null,
    });

    const applied = await applyOwnPresetsToDailyEntry(
      userA,
      report.report.id,
      workday.id,
      [p2.id, p1.id, p1.id, p3.id],
    );

    expect(applied.entry.accomplishments).toEqual([
      "Manual item",
      "first applied preset",
      "Second applied preset",
      "Third applied preset",
    ]);
    expect(applied.appliedPresetIds).toEqual([p2.id, p3.id]);
    expect(applied.skippedDuplicatePresetIds).toContain(p1.id);

    const usageP2 = applied.presetsUsage.find((u) => u.id === p2.id)!;
    expect(usageP2.useCount).toBe(1);
    expect(usageP2.lastUsedAt).toBeTruthy();

    const retry = await applyOwnPresetsToDailyEntry(userA, report.report.id, workday.id, [
      p2.id,
      p3.id,
    ]);
    expect(retry.appliedPresetIds).toEqual([]);
    expect(retry.skippedDuplicatePresetIds).toEqual([p2.id, p3.id]);
    expect(retry.entry.accomplishments).toEqual(applied.entry.accomplishments);

    const listed = await listOwnActivePresets(userA);
    expect(listed.find((p) => p.id === p2.id)?.useCount).toBe(1);
  });

  it("rejects foreign/inactive presets and finalized/archived mutations", async () => {
    const foreign = await createOwnPreset(userB, {
      label: "Foreign",
      content: "Foreign preset content unique",
      category: null,
      shortcut: "for",
    });
    const inactive = await createOwnPreset(userA, {
      label: "Inactive",
      content: "Inactive preset content unique",
      category: null,
      shortcut: null,
    });
    await deactivateOwnPreset(userA, inactive.id);

    const report = await ReportPeriodService.create(userA, {
      year: 2026,
      month: 5,
      periodKind: "FIRST_HALF",
    });
    const workday = report.entries.find((e) => e.classification === "workday")!;

    await expect(
      applyOwnPresetsToDailyEntry(userA, report.report.id, workday.id, [foreign.id]),
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      applyOwnPresetsToDailyEntry(userA, report.report.id, workday.id, [inactive.id]),
    ).rejects.toBeInstanceOf(AppError);

    for (const entry of report.entries) {
      if (entry.classification === "workday") {
        await DailyEntryService.save(userA, report.report.id, entry.id, {
          classification: "workday",
          classificationLabel: null,
          amArrival: "07:00",
          amDeparture: "12:00",
          pmArrival: "13:00",
          pmDeparture: "18:00",
          undertimeOverrideMinutes: null,
          accomplishments: ["Ready"],
          remarks: null,
        });
      }
    }

    await ReportPeriodService.finalize(userA, report.report.id);
    const active = await createOwnPreset(userA, {
      label: "Late",
      content: "Should not apply on finalized",
      category: null,
      shortcut: null,
    });
    await expect(
      applyOwnPresetsToDailyEntry(userA, report.report.id, workday.id, [active.id]),
    ).rejects.toMatchObject({ code: "NOT_EDITABLE" });

    const db = getDb();
    await db
      .update(reportPeriods)
      .set({ status: "archived" })
      .where(
        and(eq(reportPeriods.id, report.report.id), eq(reportPeriods.userId, userA)),
      );

    await expect(
      applyOwnPresetsToDailyEntry(userA, report.report.id, workday.id, [active.id]),
    ).rejects.toMatchObject({ code: "NOT_EDITABLE" });
  });

  it("lists only active presets for the picker and orders by use_count", async () => {
    const low = await PresetService.create(userA, {
      label: "Z low",
      content: "Low use content unique order",
      category: null,
      shortcut: null,
    });
    const high = await PresetService.create(userA, {
      label: "A high",
      content: "High use content unique order",
      category: null,
      shortcut: null,
    });

    const report = await ReportPeriodService.create(userA, {
      year: 2026,
      month: 4,
      periodKind: "SECOND_HALF",
    });
    const workday = report.entries.find((e) => e.classification === "workday")!;
    await applyOwnPresetsToDailyEntry(userA, report.report.id, workday.id, [
      high.id,
      high.id,
    ]);
    await applyOwnPresetsToDailyEntry(userA, report.report.id, workday.id, [high.id]);

    const listed = await listOwnActivePresets(userA);
    const highIdx = listed.findIndex((p) => p.id === high.id);
    const lowIdx = listed.findIndex((p) => p.id === low.id);
    expect(highIdx).toBeGreaterThanOrEqual(0);
    expect(lowIdx).toBeGreaterThanOrEqual(0);
    expect(highIdx).toBeLessThan(lowIdx);
    expect(listed.every((p) => p.isActive)).toBe(true);
  });
});
