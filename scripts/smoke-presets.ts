import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { accomplishmentPresets } from "../src/db/schema/accomplishment-presets";
import { dailyEntries } from "../src/db/schema/daily-entries";
import { profiles } from "../src/db/schema/profiles";
import { reportPeriods } from "../src/db/schema/report-periods";
import { signatories } from "../src/db/schema/signatories";
import { workSchedules } from "../src/db/schema/work-schedules";
import { createCompressedWeekdayRules } from "../src/lib/onboarding/defaults";
import { normalizeAccomplishmentForCompare } from "../src/lib/presets/normalize";
import { mergePresetContents } from "../src/lib/presets/merge";
import { STARTER_PRESETS } from "../src/lib/presets/starters";
import { getDatabaseConnectionOptions } from "../src/lib/env";
import { datesForPreset } from "../src/lib/dates/period";
import { classifyDateFromSchedule } from "../src/lib/reports/classify";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("SKIP: DATABASE_URL not set");
    process.exit(0);
  }

  const options = getDatabaseConnectionOptions(url);
  const client = postgres(url, {
    max: 1,
    prepare: options.prepare,
    ssl: options.ssl,
  });
  const db = drizzle(client);
  const userId = randomUUID();
  const scheduleId = randomUUID();

  try {
    await db.insert(profiles).values({
      id: userId,
      employeeName: "phase5-smoke",
      organizationName: "Municipality",
      officeName: "Office",
      timezone: "Asia/Manila",
      locale: "en-PH",
      onboardingCompletedAt: new Date().toISOString(),
    });

    await db.insert(workSchedules).values({
      id: scheduleId,
      userId,
      name: "Compressed four-day week",
      weekdayRules: createCompressedWeekdayRules(),
      isDefault: true,
    });
    await db
      .update(profiles)
      .set({ activeScheduleId: scheduleId })
      .where(eq(profiles.id, userId));

    for (let slot = 0; slot < 4; slot += 1) {
      await db.insert(signatories).values({
        userId,
        slot,
        displayName: `Signer ${slot}`,
        title: `Title ${slot}`,
        isActive: true,
      });
    }

    const inserted = await db
      .insert(accomplishmentPresets)
      .values(
        STARTER_PRESETS.map((starter) => ({
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

    if (inserted.length !== 5) {
      throw new Error(`Expected 5 starters, got ${inserted.length}`);
    }

    // Idempotency check by normalized content
    const existingKeys = new Set(
      inserted.map((row) => normalizeAccomplishmentForCompare(row.content)),
    );
    const missing = STARTER_PRESETS.filter(
      (s) => !existingKeys.has(normalizeAccomplishmentForCompare(s.content)),
    );
    if (missing.length !== 0) {
      throw new Error("Starter idempotency key check failed");
    }

    const dates = datesForPreset(2026, 8, "FIRST_HALF");
    const rules = createCompressedWeekdayRules();
    const reportRows = await db
      .insert(reportPeriods)
      .values({
        userId,
        periodKind: "FIRST_HALF",
        startDate: "2026-08-01",
        endDate: "2026-08-15",
        status: "draft",
        scheduleSnapshot: { weekdayRules: rules },
        profileSnapshot: { employeeName: "phase5-smoke" },
        signatorySnapshot: [],
      })
      .returning();
    const report = reportRows[0]!;

    await db.insert(dailyEntries).values(
      dates.map((workDate) => {
        const classified = classifyDateFromSchedule(workDate, rules);
        return {
          reportPeriodId: report.id,
          userId,
          workDate,
          classification: classified.classification,
          classificationLabel: classified.classificationLabel,
          workedMinutes: 0,
          calculatedUndertimeMinutes: 0,
          undertimeOverrideMinutes: null,
          accomplishments: [] as string[],
          remarks: null,
          isComplete: classified.isComplete,
        };
      }),
    );

    const entry = (
      await db
        .select()
        .from(dailyEntries)
        .where(eq(dailyEntries.reportPeriodId, report.id))
    ).find((row) => row.classification === "workday");
    if (!entry) throw new Error("No workday entry");

    const selected = inserted.slice(0, 3);
    const merge = mergePresetContents({
      existing: entry.accomplishments ?? [],
      selectedContents: selected.map((p) => p.content),
    });
    if (merge.next.length !== 3) {
      throw new Error("Expected three applied accomplishments");
    }

    const now = new Date().toISOString();
    await db
      .update(dailyEntries)
      .set({ accomplishments: merge.next, updatedAt: now })
      .where(eq(dailyEntries.id, entry.id));

    for (const preset of selected) {
      await db
        .update(accomplishmentPresets)
        .set({ useCount: 1, lastUsedAt: now, updatedAt: now })
        .where(eq(accomplishmentPresets.id, preset.id));
    }

    const retry = mergePresetContents({
      existing: merge.next,
      selectedContents: selected.map((p) => p.content),
    });
    if (retry.appliedIndexes.length !== 0) {
      throw new Error("Retry should skip all duplicates");
    }

    console.log("OK: presets smoke — starters, ordered apply, duplicate skip, use_count");
  } finally {
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
    await client.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
