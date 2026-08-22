import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDb } from "@/db";
import { hasDatabaseUrl } from "@/lib/env";
import { dailyEntries } from "@/db/schema/daily-entries";
import { profiles } from "@/db/schema/profiles";
import { reportExports } from "@/db/schema/report-exports";
import { reportPeriods } from "@/db/schema/report-periods";
import { signatories } from "@/db/schema/signatories";
import { templateVersions } from "@/db/schema/template-versions";
import { workSchedules } from "@/db/schema/work-schedules";
import { createCompressedWeekdayRules } from "@/lib/onboarding/defaults";
import { isZipBundleManifest } from "@/lib/exports/zip-manifest";
import { EXPORT_RATE_LIMIT_MAX } from "@/lib/exports/rate-limit";
import { DailyEntryService } from "@/server/services/daily-entry-service";
import { ExportDeletionService } from "@/server/services/export-deletion-service";
import { ExportHistoryService } from "@/server/services/export-history-service";
import { ExportOrchestrationService } from "@/server/services/export-orchestration-service";
import { ExportPersistenceService } from "@/server/services/export-persistence-service";
import { ReportPeriodService } from "@/server/services/report-period-service";
import { TemplateService } from "@/server/services/template-service";
import {
  createMemoryGeneratedStorage,
  setGeneratedStorageForTests,
} from "@/server/storage/generated-reports-storage";

config({ path: ".env.local" });
config();

const runLive = hasDatabaseUrl();

describe.skipIf(!runLive)(
  "Phase 8 export persistence (live Postgres + memory Storage)",
  () => {
    const userA = randomUUID();
    const userB = randomUUID();
    const userC = randomUUID();
    const createdUserIds = [userA, userB, userC];
    const createdTemplateIds: string[] = [];
    const storage = createMemoryGeneratedStorage();

    async function seedUser(userId: string) {
      const db = getDb();
      await db.insert(profiles).values({
        id: userId,
        authUserId: userId,
        employeeName: `Export User ${userId.slice(0, 8)}`,
        employeeTitle: "COS",
        organizationName: "Municipality",
        officeName: "Office",
        departmentName: "Records",
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
          displayName: `Signer ${slot}`,
          title: `Title ${slot}`,
          isActive: true,
        });
      }
    }

    async function ensureTemplates() {
      let accomplishment = await TemplateService.getActiveAccomplishmentTemplate();
      let dtr = await TemplateService.getActiveDtrTemplate();
      const db = getDb();
      if (!accomplishment) {
        const manifest = JSON.parse(
          readFileSync(
            path.join(process.cwd(), "templates/manifests/accomplishment-report-v1.json"),
            "utf8",
          ),
        ) as { runtimeSha256: string; version: number };
        const rows = await db
          .insert(templateVersions)
          .values({
            templateKey: "accomplishment",
            version: 8000 + Math.floor(Math.random() * 1000),
            fileType: "docx",
            storagePath: "local/accomplishment-report-v1.docx",
            sha256: manifest.runtimeSha256,
            manifest: {},
            isActive: true,
          })
          .returning();
        createdTemplateIds.push(rows[0]!.id);
        accomplishment = await TemplateService.getActiveAccomplishmentTemplate();
      }
      if (!dtr) {
        const manifest = JSON.parse(
          readFileSync(
            path.join(process.cwd(), "templates/manifests/dtr-csc-form-48-v1.json"),
            "utf8",
          ),
        ) as { runtimeSha256: string; version: number };
        const rows = await db
          .insert(templateVersions)
          .values({
            templateKey: "dtr",
            version: 8000 + Math.floor(Math.random() * 1000),
            fileType: "xlsx",
            storagePath: "local/dtr-csc-form-48-v1.xlsx",
            sha256: manifest.runtimeSha256,
            manifest: {},
            isActive: true,
          })
          .returning();
        createdTemplateIds.push(rows[0]!.id);
        dtr = await TemplateService.getActiveDtrTemplate();
      }
      expect(accomplishment).toBeTruthy();
      expect(dtr).toBeTruthy();
    }

    async function fillWorkdays(userId: string, reportId: string) {
      const loaded = await ReportPeriodService.get(userId, reportId);
      for (const entry of loaded.entries) {
        if (entry.classification !== "workday") continue;
        await DailyEntryService.save(userId, reportId, entry.id, {
          classification: "workday",
          classificationLabel: null,
          amArrival: "07:00",
          amDeparture: "12:00",
          pmArrival: "13:00",
          pmDeparture: "18:00",
          undertimeOverrideMinutes: null,
          accomplishments: ["Prepared documents"],
          remarks: null,
        });
      }
    }

    beforeAll(async () => {
      setGeneratedStorageForTests(storage);
      await seedUser(userA);
      await seedUser(userB);
      await seedUser(userC);
      await ensureTemplates();
    });

    afterAll(async () => {
      setGeneratedStorageForTests(null);
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
      for (const id of createdTemplateIds) {
        await db.delete(templateVersions).where(eq(templateVersions.id, id));
      }
    });

    it("persists DOCX, XLSX, and ZIP with provenance, reuse, invalidation, and deletion", async () => {
      const created = await ReportPeriodService.create(userA, {
        year: 2026,
        month: 8,
        periodKind: "FIRST_HALF",
      });
      await fillWorkdays(userA, created.report.id);
      const validation = await ReportPeriodService.validate(userA, created.report.id);
      const ack = validation.warnings.map((warning) => warning.code);

      const first = await ExportOrchestrationService.generate({
        ownerId: userA,
        reportId: created.report.id,
        formats: ["docx", "xlsx", "zip"],
        acknowledgedWarnings: ack,
        storage,
      });
      expect(first.overallStatus).toBe("complete");
      expect(first.results.map((item) => item.format)).toEqual(["docx", "xlsx", "zip"]);
      expect(first.results.every((item) => item.status === "created")).toBe(true);

      const zipResult = first.results.find((item) => item.format === "zip")!;
      const db = getDb();
      const zipRow = (
        await db
          .select()
          .from(reportExports)
          .where(eq(reportExports.id, zipResult.export!.id))
      )[0]!;
      expect(zipRow.templateVersionId).toBeNull();
      expect(isZipBundleManifest(zipRow.bundleManifest)).toBe(true);
      const manifest = zipRow.bundleManifest as {
        members: Array<{ sha256: string; format: string }>;
      };
      const docxRow = (
        await db
          .select()
          .from(reportExports)
          .where(
            eq(
              reportExports.id,
              first.results.find((i) => i.format === "docx")!.export!.id,
            ),
          )
      )[0]!;
      const xlsxRow = (
        await db
          .select()
          .from(reportExports)
          .where(
            eq(
              reportExports.id,
              first.results.find((i) => i.format === "xlsx")!.export!.id,
            ),
          )
      )[0]!;
      expect(manifest.members.find((m) => m.format === "docx")?.sha256).toBe(
        docxRow.sha256,
      );
      expect(manifest.members.find((m) => m.format === "xlsx")?.sha256).toBe(
        xlsxRow.sha256,
      );

      const reused = await ExportOrchestrationService.generate({
        ownerId: userA,
        reportId: created.report.id,
        formats: ["docx", "xlsx", "zip"],
        acknowledgedWarnings: ack,
        storage,
      });
      expect(reused.results.every((item) => item.status === "reused")).toBe(true);
      expect(reused.results[0]!.export!.id).toBe(first.results[0]!.export!.id);

      const [concurrentA, concurrentB] = await Promise.all([
        ExportOrchestrationService.generate({
          ownerId: userA,
          reportId: created.report.id,
          formats: ["docx"],
          acknowledgedWarnings: ack,
          storage,
        }),
        ExportOrchestrationService.generate({
          ownerId: userA,
          reportId: created.report.id,
          formats: ["docx"],
          acknowledgedWarnings: ack,
          storage,
        }),
      ]);
      const currentDocx = await db
        .select()
        .from(reportExports)
        .where(eq(reportExports.reportPeriodId, created.report.id));
      expect(
        currentDocx.filter((row) => row.format === "docx" && row.isCurrent).length,
      ).toBe(1);
      expect(
        [concurrentA.results[0]?.status, concurrentB.results[0]?.status].every(
          (status) => status === "reused" || status === "created",
        ),
      ).toBe(true);

      const workday = (
        await ReportPeriodService.get(userA, created.report.id)
      ).entries.find((entry) => entry.classification === "workday")!;
      await DailyEntryService.save(userA, created.report.id, workday.id, {
        classification: "workday",
        classificationLabel: null,
        amArrival: "07:00",
        amDeparture: "12:00",
        pmArrival: "13:00",
        pmDeparture: "18:00",
        undertimeOverrideMinutes: null,
        accomplishments: ["Updated after export"],
        remarks: null,
      });
      const history = await ExportHistoryService.listForReport(userA, created.report.id, {
        storage,
      });
      expect(history.every((item) => item.presentationStatus === "outdated")).toBe(true);
      expect(history.some((item) => item.downloadable)).toBe(true);

      const nextValidation = await ReportPeriodService.validate(userA, created.report.id);
      const next = await ExportOrchestrationService.generate({
        ownerId: userA,
        reportId: created.report.id,
        formats: ["docx"],
        acknowledgedWarnings: nextValidation.warnings.map((w) => w.code),
        storage,
      });
      expect(next.results[0]?.status).toBe("created");
      expect(next.results[0]?.export?.id).not.toBe(first.results[0]?.export?.id);

      const nextDocx = (
        await db
          .select()
          .from(reportExports)
          .where(eq(reportExports.id, next.results[0]!.export!.id))
      )[0]!;
      storage.objects.delete(nextDocx.storagePath);
      const missingHistory = await ExportHistoryService.listForReport(
        userA,
        created.report.id,
        { storage },
      );
      const missingItem = missingHistory.find((item) => item.id === nextDocx.id);
      expect(missingItem?.downloadable).toBe(false);
      expect(missingItem?.presentationStatus).toBe("outdated");

      const missing = await ExportOrchestrationService.generate({
        ownerId: userA,
        reportId: created.report.id,
        formats: ["docx"],
        acknowledgedWarnings: nextValidation.warnings.map((w) => w.code),
        storage,
      });
      expect(missing.results[0]?.status).toBe("created");

      const zipAgain = await ExportOrchestrationService.generate({
        ownerId: userA,
        reportId: created.report.id,
        formats: ["docx", "xlsx", "zip"],
        acknowledgedWarnings: nextValidation.warnings.map((w) => w.code),
        storage,
      });
      const zipId = zipAgain.results.find((item) => item.format === "zip")!.export!.id;
      const memberXlsxId = zipAgain.results.find((item) => item.format === "xlsx")!
        .export!.id;
      const memberDocxId = zipAgain.results.find((item) => item.format === "docx")!
        .export!.id;
      await ExportDeletionService.deleteOwned(userA, memberXlsxId, { storage });
      expect(
        (await db.select().from(reportExports).where(eq(reportExports.id, zipId))).length,
      ).toBe(1);
      await ExportDeletionService.deleteOwned(userA, zipId, { storage });
      expect(
        (await db.select().from(reportExports).where(eq(reportExports.id, memberDocxId)))
          .length,
      ).toBe(1);

      await expect(
        ExportOrchestrationService.generate({
          ownerId: userB,
          reportId: created.report.id,
          formats: ["docx"],
          acknowledgedWarnings: [],
          storage,
        }),
      ).rejects.toMatchObject({ code: "REPORT_NOT_FOUND" });
    }, 120_000);

    it("does not insert metadata when upload fails and compensates DB insert failure", async () => {
      const created = await ReportPeriodService.create(userA, {
        year: 2026,
        month: 7,
        periodKind: "FIRST_HALF",
      });
      const failing = createMemoryGeneratedStorage();
      const originalUpload = failing.upload.bind(failing);
      failing.upload = async () => {
        throw new Error("upload boom");
      };
      await expect(
        ExportPersistenceService.persistGeneratedFile(
          {
            id: randomUUID(),
            userId: userA,
            reportPeriodId: created.report.id,
            format: "docx",
            fileName: "Auri_Test_2026-07-01_to_2026-07-15_Accomplishment.docx",
            buffer: Buffer.from("PK-test-docx-bytes-xxxxxxxx"),
            sha256: createHash("sha256")
              .update(Buffer.from("PK-test-docx-bytes-xxxxxxxx"))
              .digest("hex"),
            sourceRevision: "rev",
            templateVersionId: (await TemplateService.getActiveAccomplishmentTemplate())!
              .id,
            bundleManifest: null,
          },
          { storage: failing },
        ),
      ).rejects.toBeTruthy();
      const db = getDb();
      const rows = await db
        .select()
        .from(reportExports)
        .where(eq(reportExports.reportPeriodId, created.report.id));
      expect(rows).toHaveLength(0);

      failing.upload = originalUpload;
      const id = randomUUID();
      const buffer = Buffer.from("PK-test-docx-bytes-yyyyyyyy");
      const sha256 = createHash("sha256").update(buffer).digest("hex");
      const throwingDb = {
        transaction: async () => {
          throw new Error("insert boom");
        },
      };
      await expect(
        ExportPersistenceService.persistGeneratedFile(
          {
            id,
            userId: userA,
            reportPeriodId: created.report.id,
            format: "docx",
            fileName: "Auri_Test_2026-07-01_to_2026-07-15_Accomplishment.docx",
            buffer,
            sha256,
            sourceRevision: "rev",
            templateVersionId: (await TemplateService.getActiveAccomplishmentTemplate())!
              .id,
            bundleManifest: null,
          },
          { storage: failing, db: throwingDb as never },
        ),
      ).rejects.toBeTruthy();
      expect([...failing.objects.keys()].some((key) => key.includes(id))).toBe(false);
    });

    it("reuses verified current exports even when the new-row rate limit is full", async () => {
      const created = await ReportPeriodService.create(userC, {
        year: 2026,
        month: 6,
        periodKind: "FIRST_HALF",
      });
      await fillWorkdays(userC, created.report.id);
      const validation = await ReportPeriodService.validate(userC, created.report.id);
      const ack = validation.warnings.map((warning) => warning.code);
      const first = await ExportOrchestrationService.generate({
        ownerId: userC,
        reportId: created.report.id,
        formats: ["docx"],
        acknowledgedWarnings: ack,
        storage,
      });
      expect(first.results[0]?.status).toBe("created");
      const currentId = first.results[0]!.export!.id;
      const template = await TemplateService.getActiveAccomplishmentTemplate();
      expect(template).toBeTruthy();
      const db = getDb();
      const fillers = Array.from({ length: EXPORT_RATE_LIMIT_MAX - 1 }, () =>
        randomUUID(),
      );
      await db.insert(reportExports).values(
        fillers.map((id) => ({
          id,
          userId: userC,
          reportPeriodId: created.report.id,
          templateVersionId: template!.id,
          format: "docx" as const,
          storagePath: `${userC}/${created.report.id}/${id}/Auri_Filler_2026-06-01_to_2026-06-15_Accomplishment.docx`,
          fileName: "Auri_Filler_2026-06-01_to_2026-06-15_Accomplishment.docx",
          fileSizeBytes: 12,
          sha256: "ab".repeat(32),
          sourceRevision: "filler",
          isCurrent: false,
          bundleManifest: null,
        })),
      );

      const reused = await ExportOrchestrationService.generate({
        ownerId: userC,
        reportId: created.report.id,
        formats: ["docx"],
        acknowledgedWarnings: ack,
        storage,
      });
      expect(reused.results[0]?.status).toBe("reused");
      expect(reused.results[0]?.export?.id).toBe(currentId);

      const currentRow = (
        await db.select().from(reportExports).where(eq(reportExports.id, currentId))
      )[0]!;
      storage.objects.delete(currentRow.storagePath);
      const limited = await ExportOrchestrationService.generate({
        ownerId: userC,
        reportId: created.report.id,
        formats: ["docx"],
        acknowledgedWarnings: ack,
        storage,
      });
      expect(limited.overallStatus).toBe("failed");
      expect(limited.results[0]?.status).toBe("failed");
      expect(limited.results[0]?.error?.code).toBe("EXPORT_RATE_LIMITED");
    }, 120_000);
  },
);
