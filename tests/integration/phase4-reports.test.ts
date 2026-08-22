import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createOwnReportPeriodWithForcedEntryFailure } from "@/db/dal/reports";
import { dailyEntries } from "@/db/schema/daily-entries";
import { profiles } from "@/db/schema/profiles";
import { reportExports } from "@/db/schema/report-exports";
import { reportPeriods } from "@/db/schema/report-periods";
import { signatories } from "@/db/schema/signatories";
import { templateVersions } from "@/db/schema/template-versions";
import { workSchedules } from "@/db/schema/work-schedules";
import { getDb } from "@/db";
import { createCompressedWeekdayRules } from "@/lib/onboarding/defaults";
import { hasDatabaseUrl } from "@/lib/env";
import { AppError } from "@/lib/reports/errors";
import { DailyEntryService } from "@/server/services/daily-entry-service";
import { ReportPeriodService } from "@/server/services/report-period-service";

config({ path: ".env.local" });
config();

const runLive = hasDatabaseUrl();

describe.skipIf(!runLive)("Phase 4 report integration (live Postgres)", () => {
  const userA = randomUUID();
  const userB = randomUUID();
  const createdUserIds = [userA, userB];
  let templateId: string | null = null;

  async function seedUser(userId: string) {
    const db = getDb();
    await db.insert(profiles).values({
      id: userId,
      authUserId: userId,
      employeeName: `user-${userId.slice(0, 8)}`,
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
      await db.delete(reportExports).where(eq(reportExports.userId, userId));
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
    if (templateId) {
      await db.delete(templateVersions).where(eq(templateVersions.id, templateId));
    }
  });

  it("creates report + entries atomically and is idempotent", async () => {
    const first = await ReportPeriodService.create(userA, {
      year: 2026,
      month: 8,
      periodKind: "FIRST_HALF",
    });
    expect(first.created).toBe(true);
    expect(first.entries).toHaveLength(15);

    const second = await ReportPeriodService.create(userA, {
      year: 2026,
      month: 8,
      periodKind: "FIRST_HALF",
    });
    expect(second.created).toBe(false);
    expect(second.report.id).toBe(first.report.id);
  });

  it("rolls back when entry creation fails", async () => {
    await expect(
      createOwnReportPeriodWithForcedEntryFailure(userA, {
        year: 2026,
        month: 9,
        periodKind: "FIRST_HALF",
      }),
    ).rejects.toThrow(/FORCED_ENTRY_FAILURE/);

    const db = getDb();
    const rows = await db
      .select()
      .from(reportPeriods)
      .where(
        and(
          eq(reportPeriods.userId, userA),
          eq(reportPeriods.startDate, "2026-09-01"),
          eq(reportPeriods.endDate, "2026-09-15"),
        ),
      );
    expect(rows).toHaveLength(0);
  });

  it("saves, reloads, rejects finalized edits, reopens, and invalidates exports", async () => {
    const created = await ReportPeriodService.create(userA, {
      year: 2026,
      month: 7,
      periodKind: "FIRST_HALF",
    });
    const workday = created.entries.find((e) => e.classification === "workday");
    expect(workday).toBeTruthy();

    const saved = await DailyEntryService.save(userA, created.report.id, workday!.id, {
      classification: "workday",
      classificationLabel: null,
      amArrival: "700",
      amDeparture: "12:00",
      pmArrival: "13:00",
      pmDeparture: "18:00",
      undertimeOverrideMinutes: null,
      accomplishments: ["Prepared documents"],
      remarks: "ok",
    });
    expect(saved.entry.workedMinutes).toBe(600);

    const reloaded = await ReportPeriodService.get(userA, created.report.id);
    const reloadedEntry = reloaded.entries.find((e) => e.id === workday!.id)!;
    expect(reloadedEntry.workedMinutes).toBe(600);
    expect(reloadedEntry.accomplishments).toContain("Prepared documents");

    // Mark all entries complete enough for finalize
    for (const entry of reloaded.entries) {
      if (entry.classification === "workday") {
        await DailyEntryService.save(userA, created.report.id, entry.id, {
          classification: "workday",
          classificationLabel: null,
          amArrival: "07:00",
          amDeparture: "12:00",
          pmArrival: "13:00",
          pmDeparture: "18:00",
          undertimeOverrideMinutes: null,
          accomplishments: ["Work item"],
          remarks: null,
        });
      }
    }

    const finalized = await ReportPeriodService.finalize(userA, created.report.id);
    expect(finalized.report.status).toBe("finalized");
    expect(finalized.report.finalizedAt).toBeTruthy();

    await expect(
      DailyEntryService.save(userA, created.report.id, workday!.id, {
        classification: "workday",
        classificationLabel: null,
        amArrival: "07:00",
        amDeparture: "12:00",
        pmArrival: "13:00",
        pmDeparture: "18:00",
        undertimeOverrideMinutes: null,
        accomplishments: ["Should fail"],
        remarks: null,
      }),
    ).rejects.toBeInstanceOf(AppError);

    const db = getDb();
    const tmpl = await db
      .insert(templateVersions)
      .values({
        templateKey: "accomplishment",
        version: 9000 + Math.floor(Math.random() * 1000),
        fileType: "docx",
        storagePath: "test/phase4.docx",
        sha256: "phase4-test-hash",
        manifest: {},
        isActive: false,
      })
      .returning();
    templateId = tmpl[0]!.id;

    await db.insert(reportExports).values({
      userId: userA,
      reportPeriodId: created.report.id,
      templateVersionId: templateId,
      format: "docx",
      storagePath: `test/${userA}/export.docx`,
      fileName: "export.docx",
      fileSizeBytes: 10,
      sha256: "export-hash",
      sourceRevision: "rev1",
      isCurrent: true,
    });

    const reopened = await ReportPeriodService.reopen(userA, created.report.id);
    expect(reopened.report.status === "draft" || reopened.report.status === "ready").toBe(
      true,
    );
    expect(reopened.report.finalizedAt).toBeNull();

    const exports = await db
      .select()
      .from(reportExports)
      .where(eq(reportExports.reportPeriodId, created.report.id));
    expect(exports.every((row) => row.isCurrent === false)).toBe(true);
    expect(exports).toHaveLength(1);

    const edited = await DailyEntryService.save(userA, created.report.id, workday!.id, {
      classification: "workday",
      classificationLabel: null,
      amArrival: "07:00",
      amDeparture: "12:00",
      pmArrival: "13:00",
      pmDeparture: "18:00",
      undertimeOverrideMinutes: null,
      accomplishments: ["After reopen"],
      remarks: null,
    });
    expect(edited.entry.accomplishments).toContain("After reopen");
  });

  it("isolates reports across users", async () => {
    const aReport = await ReportPeriodService.create(userA, {
      year: 2025,
      month: 1,
      periodKind: "FIRST_HALF",
    });
    await expect(
      ReportPeriodService.get(userB, aReport.report.id),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("copies previous workday without changing destination date/classification", async () => {
    const created = await ReportPeriodService.create(userB, {
      year: 2026,
      month: 8,
      periodKind: "FIRST_HALF",
    });
    const workdays = created.entries
      .filter((e) => e.classification === "workday")
      .sort((a, b) => a.workDate.localeCompare(b.workDate));
    const first = workdays[0]!;
    const second = workdays[1]!;

    await DailyEntryService.save(userB, created.report.id, first.id, {
      classification: "workday",
      classificationLabel: null,
      amArrival: "07:15",
      amDeparture: "12:00",
      pmArrival: "13:00",
      pmDeparture: "18:00",
      undertimeOverrideMinutes: 10,
      accomplishments: ["Copied item"],
      remarks: "from previous",
    });

    const copied = await DailyEntryService.copyPreviousWorkday(
      userB,
      created.report.id,
      second.id,
      { includeUndertimeOverride: false },
    );
    expect(copied.entry.workDate).toBe(second.workDate);
    expect(copied.entry.classification).toBe("workday");
    expect(copied.entry.amArrival?.startsWith("07:15")).toBe(true);
    expect(copied.entry.accomplishments).toContain("Copied item");
    expect(copied.entry.undertimeOverrideMinutes).toBeNull();
    expect(copied.entry.calculatedUndertimeMinutes).toBeGreaterThan(0);
  });
});
