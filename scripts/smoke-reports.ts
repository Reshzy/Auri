import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dailyEntries } from "../src/db/schema/daily-entries";
import { profiles } from "../src/db/schema/profiles";
import { reportPeriods } from "../src/db/schema/report-periods";
import { signatories } from "../src/db/schema/signatories";
import { workSchedules } from "../src/db/schema/work-schedules";
import { createCompressedWeekdayRules } from "../src/lib/onboarding/defaults";
import { classifyDateFromSchedule } from "../src/lib/reports/classify";
import { datesForPreset } from "../src/lib/dates/period";
import { getDatabaseConnectionOptions } from "../src/lib/env";
import { AUGUST_2026_FIRST_HALF } from "../tests/fixtures/reports/august-2026-first-half";

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
      clerkUserId: `clerk_smoke_reports_${userId}`,
      employeeName: "phase4-smoke",
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

    const dates = datesForPreset(2026, 8, "FIRST_HALF");
    const rules = createCompressedWeekdayRules();
    const reportRows = await db
      .insert(reportPeriods)
      .values({
        userId,
        periodKind: "FIRST_HALF",
        startDate: AUGUST_2026_FIRST_HALF.startDate,
        endDate: AUGUST_2026_FIRST_HALF.endDate,
        status: "draft",
        profileSnapshot: {
          employeeName: "phase4-smoke",
          employeeTitle: null,
          organizationName: "Municipality",
          officeName: "Office",
          departmentName: null,
          timezone: "Asia/Manila",
          locale: "en-PH",
        },
        scheduleSnapshot: {
          id: scheduleId,
          name: "Compressed four-day week",
          weekdayRules: rules,
        },
        signatorySnapshot: [0, 1, 2, 3].map((slot) => ({
          slot,
          displayName: `Signer ${slot}`,
          title: `Title ${slot}`,
          isActive: true,
          effectiveFrom: null,
          effectiveTo: null,
        })),
      })
      .returning();

    const report = reportRows[0]!;
    const entryValues = dates.map((workDate) => {
      const classified = classifyDateFromSchedule(workDate, rules);
      return {
        reportPeriodId: report.id,
        userId,
        workDate,
        classification: classified.classification,
        classificationLabel: classified.classificationLabel,
        isComplete: classified.isComplete,
        accomplishments: [] as string[],
      };
    });
    await db.insert(dailyEntries).values(entryValues);

    const entries = await db
      .select()
      .from(dailyEntries)
      .where(eq(dailyEntries.reportPeriodId, report.id));

    if (entries.length !== 15) {
      throw new Error(`Expected 15 entries, got ${entries.length}`);
    }

    const workdays = entries
      .filter((e) => e.classification === "workday")
      .map((e) => e.workDate)
      .sort();
    const off = entries
      .filter((e) => e.classification === "scheduled_off")
      .map((e) => e.workDate)
      .sort();

    if (
      JSON.stringify(workdays) !==
      JSON.stringify([...AUGUST_2026_FIRST_HALF.expectedWorkdays])
    ) {
      throw new Error(`Workdays mismatch: ${workdays.join(",")}`);
    }
    if (
      JSON.stringify(off) !==
      JSON.stringify([...AUGUST_2026_FIRST_HALF.expectedScheduledOff])
    ) {
      throw new Error(`Off days mismatch: ${off.join(",")}`);
    }

    console.log("Phase 4 reports smoke: PASS");
  } finally {
    await db.delete(dailyEntries).where(eq(dailyEntries.userId, userId));
    await db.delete(reportPeriods).where(eq(reportPeriods.userId, userId));
    await db.delete(signatories).where(eq(signatories.userId, userId));
    await db
      .update(profiles)
      .set({ activeScheduleId: null })
      .where(eq(profiles.id, userId));
    await db.delete(workSchedules).where(eq(workSchedules.userId, userId));
    await db.delete(profiles).where(and(eq(profiles.id, userId)));
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error("Reports smoke failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
