import "server-only";

import { randomUUID } from "node:crypto";
import { getOwnReportWithEntries } from "@/db/dal/reports";
import { getTemplateAvailability } from "@/db/dal/templates";
import {
  assertUserExportRateLimit,
  findCurrentExportForFormat,
  findCurrentExportForFormatOn,
  withReportExportLock,
  type ExportFormat,
  type ReportExportRow,
} from "@/db/dal/exports";
import type {
  ProfileSnapshot,
  ScheduleSnapshot,
  SignatorySnapshot,
} from "@/db/dal/snapshots";
import { ExportError } from "@/lib/exports/errors";
import {
  aggregateOverallStatus,
  downloadUrlForExport,
  type ExportResultItem,
  type OverallExportStatus,
} from "@/lib/exports/results";
import { computeFormatSourceRevision } from "@/lib/exports/source-revision";
import type { DayClassification } from "@/lib/reports/classify";
import { pgTimeToHhmm } from "@/lib/reports/pg-time";
import { DocxExportService } from "@/server/services/docx-export-service";
import { ExportPersistenceService } from "@/server/services/export-persistence-service";
import {
  ReportMappingService,
  type MappingReportInput,
} from "@/server/services/report-mapping-service";
import { validateReport } from "@/server/services/report-validation";
import { TemplateService } from "@/server/services/template-service";
import { XlsxExportService } from "@/server/services/xlsx-export-service";
import { ZipExportService } from "@/server/services/zip-export-service";
import type { GeneratedStorage } from "@/server/storage/generated-reports-storage";
import type { ZipBundleManifest } from "@/lib/exports/zip-manifest";

export type ExportGenerationResponse = {
  overallStatus: OverallExportStatus;
  reportId: string;
  results: ExportResultItem[];
};

function toMappingInput(
  loaded: NonNullable<Awaited<ReturnType<typeof getOwnReportWithEntries>>>,
): MappingReportInput {
  return {
    reportId: loaded.report.id,
    startDate: loaded.report.startDate,
    endDate: loaded.report.endDate,
    profileSnapshot: loaded.report.profileSnapshot as ProfileSnapshot,
    signatorySnapshot: loaded.report.signatorySnapshot as SignatorySnapshot[],
    entries: loaded.entries.map((entry) => ({
      workDate: entry.workDate,
      classification: entry.classification as DayClassification,
      classificationLabel: entry.classificationLabel,
      amArrival: pgTimeToHhmm(entry.amArrival),
      amDeparture: pgTimeToHhmm(entry.amDeparture),
      pmArrival: pgTimeToHhmm(entry.pmArrival),
      pmDeparture: pgTimeToHhmm(entry.pmDeparture),
      workedMinutes: entry.workedMinutes,
      calculatedUndertimeMinutes: entry.calculatedUndertimeMinutes,
      undertimeOverrideMinutes: entry.undertimeOverrideMinutes,
      accomplishments: entry.accomplishments ?? [],
      remarks: entry.remarks,
    })),
  };
}

function toResult(row: ReportExportRow, status: "created" | "reused"): ExportResultItem {
  return {
    format: row.format as ExportFormat,
    status,
    export: {
      id: row.id,
      fileName: row.fileName,
      fileSizeBytes: row.fileSizeBytes,
      sha256: row.sha256,
      isCurrent: row.isCurrent,
      createdAt: row.createdAt,
      downloadUrl: downloadUrlForExport(row.id),
    },
  };
}

function failedResult(format: ExportFormat, error: unknown): ExportResultItem {
  const err =
    error instanceof ExportError
      ? error
      : new ExportError(
          format === "zip"
            ? "ZIP_GENERATION_FAILED"
            : format === "xlsx"
              ? "XLSX_GENERATION_FAILED"
              : "DOCX_GENERATION_FAILED",
          "Generation failed.",
          { cause: error },
        );
  return {
    format,
    status: "failed",
    error: { code: err.code, correlationId: err.correlationId },
  };
}

export class ExportOrchestrationService {
  static async generate(input: {
    ownerId: string;
    reportId: string;
    formats: ExportFormat[];
    acknowledgedWarnings: string[];
    storage?: GeneratedStorage;
  }): Promise<ExportGenerationResponse> {
    const loaded = await getOwnReportWithEntries(input.ownerId, input.reportId);
    if (!loaded) {
      throw new ExportError("REPORT_NOT_FOUND", "Report not found.");
    }
    if (loaded.report.status === "archived") {
      throw new ExportError("FORBIDDEN", "Archived reports cannot be exported.");
    }

    const templates = await getTemplateAvailability();
    const validation = validateReport({
      report: {
        id: loaded.report.id,
        startDate: loaded.report.startDate,
        endDate: loaded.report.endDate,
        status: loaded.report.status,
        createdAt: loaded.report.createdAt,
        snapshotsRefreshedAt: loaded.report.snapshotsRefreshedAt,
        profileSnapshot: loaded.report.profileSnapshot as ProfileSnapshot,
        scheduleSnapshot: loaded.report.scheduleSnapshot as ScheduleSnapshot | null,
        signatorySnapshot: loaded.report.signatorySnapshot as SignatorySnapshot[],
      },
      entries: loaded.entries.map((entry) => ({
        id: entry.id,
        workDate: entry.workDate,
        classification: entry.classification as DayClassification,
        classificationLabel: entry.classificationLabel,
        amArrival: pgTimeToHhmm(entry.amArrival),
        amDeparture: pgTimeToHhmm(entry.amDeparture),
        pmArrival: pgTimeToHhmm(entry.pmArrival),
        pmDeparture: pgTimeToHhmm(entry.pmDeparture),
        workedMinutes: entry.workedMinutes,
        calculatedUndertimeMinutes: entry.calculatedUndertimeMinutes,
        undertimeOverrideMinutes: entry.undertimeOverrideMinutes,
        accomplishments: entry.accomplishments ?? [],
        remarks: entry.remarks,
        isComplete: entry.isComplete,
      })),
      templates: templates.items,
    });

    if (!validation.ready || validation.errors.length > 0) {
      throw new ExportError(
        "REPORT_INCOMPLETE",
        "Report has blocking validation errors and cannot be exported.",
      );
    }

    const acknowledged = new Set(input.acknowledgedWarnings);
    const unacked = validation.warnings.filter(
      (warning) => !acknowledged.has(warning.code),
    );
    if (unacked.length > 0) {
      throw new ExportError(
        "WARNING_ACKNOWLEDGEMENT_REQUIRED",
        "Acknowledge all warnings before generating files.",
      );
    }

    const mappingInput = toMappingInput(loaded);
    const payload = ReportMappingService.buildPayload(mappingInput);

    const needsDocx = input.formats.includes("docx") || input.formats.includes("zip");
    const needsXlsx = input.formats.includes("xlsx") || input.formats.includes("zip");

    const accomplishment = needsDocx
      ? await TemplateService.getActiveAccomplishmentTemplate()
      : null;
    const dtr = needsXlsx ? await TemplateService.getActiveDtrTemplate() : null;

    if (needsDocx && !accomplishment) {
      throw new ExportError(
        "TEMPLATE_NOT_FOUND",
        "Accomplishment template is not available.",
      );
    }
    if (needsXlsx && !dtr) {
      throw new ExportError("TEMPLATE_NOT_FOUND", "DTR template is not available.");
    }

    const hashes = {
      accomplishmentSha256: accomplishment?.sha256 ?? "",
      dtrSha256: dtr?.sha256 ?? "",
    };
    const revisions = {
      docx: computeFormatSourceRevision("docx", payload, hashes),
      xlsx: computeFormatSourceRevision("xlsx", payload, hashes),
      zip: computeFormatSourceRevision("zip", payload, hashes),
    };

    const results: ExportResultItem[] = [];
    const members: {
      docx?: { row: ReportExportRow; buffer: Buffer; templateSha256: string };
      xlsx?: { row: ReportExportRow; buffer: Buffer; templateSha256: string };
    } = {};

    for (const format of input.formats.filter((item) => item !== "zip") as Array<
      "docx" | "xlsx"
    >) {
      try {
        const ensured = await this.ensureMember({
          ownerId: input.ownerId,
          reportId: input.reportId,
          format,
          mappingInput,
          sourceRevision: revisions[format],
          templateVersionId: format === "docx" ? accomplishment!.id : dtr!.id,
          templateSha256:
            format === "docx" ? hashes.accomplishmentSha256 : hashes.dtrSha256,
          storage: input.storage,
        });
        members[format] = ensured;
        results.push(toResult(ensured.row, ensured.status));
      } catch (error) {
        results.push(failedResult(format, error));
      }
    }

    if (input.formats.includes("zip")) {
      if (!members.docx || !members.xlsx) {
        results.push({
          format: "zip",
          status: "failed",
          error: {
            code: "ZIP_GENERATION_FAILED",
            correlationId: crypto.randomUUID(),
          },
        });
      } else {
        try {
          const zip = await this.ensureZip({
            ownerId: input.ownerId,
            reportId: input.reportId,
            mappingInput,
            sourceRevision: revisions.zip,
            docx: members.docx,
            xlsx: members.xlsx,
            storage: input.storage,
          });
          results.push(toResult(zip.row, zip.status));
        } catch (error) {
          results.push(failedResult("zip", error));
        }
      }
    }

    const ordered = (["docx", "xlsx", "zip"] as const)
      .map((format) => results.find((item) => item.format === format))
      .filter((item): item is ExportResultItem => Boolean(item));

    return {
      overallStatus: aggregateOverallStatus(ordered),
      reportId: input.reportId,
      results: ordered,
    };
  }

  private static async ensureMember(input: {
    ownerId: string;
    reportId: string;
    format: "docx" | "xlsx";
    mappingInput: MappingReportInput;
    sourceRevision: string;
    templateVersionId: string;
    templateSha256: string;
    storage?: GeneratedStorage;
  }): Promise<{
    row: ReportExportRow;
    buffer: Buffer;
    templateSha256: string;
    status: "created" | "reused";
  }> {
    const existing = await findCurrentExportForFormat({
      userId: input.ownerId,
      reportPeriodId: input.reportId,
      format: input.format,
    });
    if (
      existing &&
      existing.sourceRevision === input.sourceRevision &&
      existing.templateVersionId === input.templateVersionId
    ) {
      const verified = await ExportPersistenceService.verifyStoredObject(existing, {
        storage: input.storage,
      });
      if (verified.present && verified.matches && verified.bytes) {
        return {
          row: existing,
          buffer: verified.bytes,
          templateSha256: input.templateSha256,
          status: "reused",
        };
      }
    }

    const generated =
      input.format === "docx"
        ? await DocxExportService.generateAccomplishmentDocx(input.mappingInput)
        : await XlsxExportService.generateDtrXlsx(input.mappingInput);

    if (generated.sourceRevision !== input.sourceRevision) {
      throw new ExportError("EXPORT_INTEGRITY_FAILED", "Source revision mismatch.");
    }

    const id = randomUUID();
    return withReportExportLock(input.ownerId, input.reportId, async (tx) => {
      const again = await findCurrentExportForFormatOn(tx, {
        userId: input.ownerId,
        reportPeriodId: input.reportId,
        format: input.format,
      });
      if (
        again &&
        again.sourceRevision === input.sourceRevision &&
        again.templateVersionId === input.templateVersionId
      ) {
        const verified = await ExportPersistenceService.verifyStoredObject(again, {
          storage: input.storage,
        });
        if (verified.present && verified.matches && verified.bytes) {
          return {
            row: again,
            buffer: verified.bytes,
            templateSha256: input.templateSha256,
            status: "reused" as const,
          };
        }
      }

      await assertUserExportRateLimit(input.ownerId);

      const row = await ExportPersistenceService.persistGeneratedFile(
        {
          id,
          userId: input.ownerId,
          reportPeriodId: input.reportId,
          format: input.format,
          fileName: generated.fileName,
          buffer: generated.buffer,
          sha256: generated.sha256,
          sourceRevision: input.sourceRevision,
          templateVersionId: input.templateVersionId,
          bundleManifest: null,
        },
        { storage: input.storage, db: tx },
      );

      return {
        row,
        buffer: generated.buffer,
        templateSha256: input.templateSha256,
        status: "created" as const,
      };
    });
  }

  private static async ensureZip(input: {
    ownerId: string;
    reportId: string;
    mappingInput: MappingReportInput;
    sourceRevision: string;
    docx: { row: ReportExportRow; buffer: Buffer; templateSha256: string };
    xlsx: { row: ReportExportRow; buffer: Buffer; templateSha256: string };
    storage?: GeneratedStorage;
  }): Promise<{ row: ReportExportRow; status: "created" | "reused" }> {
    const existing = await findCurrentExportForFormat({
      userId: input.ownerId,
      reportPeriodId: input.reportId,
      format: "zip",
    });
    if (existing && existing.sourceRevision === input.sourceRevision) {
      const verified = await ExportPersistenceService.verifyStoredObject(existing, {
        storage: input.storage,
      });
      if (verified.present && verified.matches) {
        return { row: existing, status: "reused" };
      }
    }

    if (!input.docx.row.templateVersionId || !input.xlsx.row.templateVersionId) {
      throw new ExportError(
        "TEMPLATE_NOT_FOUND",
        "ZIP members are missing template versions.",
      );
    }

    const packaged = await ZipExportService.packageReport({
      employeeName: input.mappingInput.profileSnapshot.employeeName,
      startDate: input.mappingInput.startDate,
      endDate: input.mappingInput.endDate,
      docx: {
        exportId: input.docx.row.id,
        fileName: input.docx.row.fileName,
        buffer: input.docx.buffer,
        sha256: input.docx.row.sha256,
        fileSizeBytes: input.docx.row.fileSizeBytes,
        templateVersionId: input.docx.row.templateVersionId,
        templateSha256: input.docx.templateSha256,
      },
      xlsx: {
        exportId: input.xlsx.row.id,
        fileName: input.xlsx.row.fileName,
        buffer: input.xlsx.buffer,
        sha256: input.xlsx.row.sha256,
        fileSizeBytes: input.xlsx.row.fileSizeBytes,
        templateVersionId: input.xlsx.row.templateVersionId,
        templateSha256: input.xlsx.templateSha256,
      },
    });

    const id = randomUUID();
    return withReportExportLock(input.ownerId, input.reportId, async (tx) => {
      const again = await findCurrentExportForFormatOn(tx, {
        userId: input.ownerId,
        reportPeriodId: input.reportId,
        format: "zip",
      });
      if (again && again.sourceRevision === input.sourceRevision) {
        const verified = await ExportPersistenceService.verifyStoredObject(again, {
          storage: input.storage,
        });
        if (verified.present && verified.matches) {
          return { row: again, status: "reused" as const };
        }
      }

      await assertUserExportRateLimit(input.ownerId);

      const row = await ExportPersistenceService.persistGeneratedFile(
        {
          id,
          userId: input.ownerId,
          reportPeriodId: input.reportId,
          format: "zip",
          fileName: packaged.fileName,
          buffer: packaged.buffer,
          sha256: packaged.sha256,
          sourceRevision: input.sourceRevision,
          templateVersionId: null,
          bundleManifest: packaged.bundleManifest as ZipBundleManifest,
        },
        { storage: input.storage, db: tx },
      );
      return { row, status: "created" as const };
    });
  }
}
