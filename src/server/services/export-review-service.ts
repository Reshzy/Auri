import "server-only";

import { getOwnReportWithEntries } from "@/db/dal/reports";
import type { ProfileSnapshot, SignatorySnapshot } from "@/db/dal/snapshots";
import { predictedExportFilenames } from "@/lib/exports/filenames";
import { PREVIEW_DISCLAIMER } from "@/lib/exports/preview-copy";
import type { DayClassification } from "@/lib/reports/classify";
import { isNonWorkClassification } from "@/lib/reports/classify";
import { pgTimeToHhmm } from "@/lib/reports/pg-time";
import { formatTotalHoursLabel } from "@/lib/reports/totals";
import { AppError } from "@/lib/reports/errors";
import { ReportPeriodService } from "@/server/services/report-period-service";
import { TemplateService } from "@/server/services/template-service";
import { ReportMappingService } from "@/server/services/report-mapping-service";
import type { ReportValidationResult } from "@/server/services/report-validation";

export type GenerationReviewSummary = {
  reportId: string;
  employeeName: string;
  employeeTitle: string | null;
  office: string;
  department: string;
  municipality: string;
  periodStart: string;
  periodEnd: string;
  totalWorkedLabel: string;
  workdayCount: number;
  offDayCount: number;
  incompleteCount: number;
  validation: ReportValidationResult;
  templates: {
    accomplishment: { version: number | null; sha256Prefix: string } | null;
    dtr: { version: number | null; sha256Prefix: string } | null;
  };
  filenames: { docx: string; xlsx: string; zip: string };
  timezone: string;
};

export class ExportReviewService {
  static async build(userId: string, reportId: string): Promise<GenerationReviewSummary> {
    const loaded = await getOwnReportWithEntries(userId, reportId);
    if (!loaded) throw new AppError("Report not found.", "NOT_FOUND");

    const validation = await ReportPeriodService.validateLoaded(
      userId,
      loaded.report,
      loaded.entries,
    );
    const profile = loaded.report.profileSnapshot as ProfileSnapshot;
    const payload = ReportMappingService.buildPayload({
      reportId: loaded.report.id,
      startDate: loaded.report.startDate,
      endDate: loaded.report.endDate,
      profileSnapshot: profile,
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
    });

    const workdayCount = loaded.entries.filter(
      (e) => e.classification === "workday",
    ).length;
    const offDayCount = loaded.entries.filter((e) =>
      isNonWorkClassification(e.classification as DayClassification),
    ).length;

    const accomplishment = await TemplateService.getActiveAccomplishmentTemplate();
    const dtr = await TemplateService.getActiveDtrTemplate();

    return {
      reportId: loaded.report.id,
      employeeName: payload.employee.name,
      employeeTitle: payload.employee.title,
      office: payload.organization.office,
      department: payload.organization.department,
      municipality: payload.organization.municipality,
      periodStart: loaded.report.startDate,
      periodEnd: loaded.report.endDate,
      totalWorkedLabel: formatTotalHoursLabel(payload.totalWorkedMinutes),
      workdayCount,
      offDayCount,
      incompleteCount: validation.incompleteCount,
      validation,
      templates: {
        accomplishment: accomplishment
          ? {
              version: accomplishment.version,
              sha256Prefix: accomplishment.sha256.slice(0, 8),
            }
          : null,
        dtr: dtr ? { version: dtr.version, sha256Prefix: dtr.sha256.slice(0, 8) } : null,
      },
      filenames: predictedExportFilenames({
        employeeName: payload.employee.name,
        startDate: loaded.report.startDate,
        endDate: loaded.report.endDate,
      }),
      timezone: profile.timezone || "Asia/Manila",
    };
  }
}

export type SemanticPreviewModel = {
  reportId: string;
  payload: ReturnType<typeof ReportMappingService.buildPayload>;
  validation: ReportValidationResult;
  disclaimer: string;
};

export class ReportPreviewService {
  static async build(userId: string, reportId: string): Promise<SemanticPreviewModel> {
    const loaded = await getOwnReportWithEntries(userId, reportId);
    if (!loaded) throw new AppError("Report not found.", "NOT_FOUND");
    const validation = await ReportPeriodService.validateLoaded(
      userId,
      loaded.report,
      loaded.entries,
    );
    const payload = ReportMappingService.buildPayload({
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
    });
    return {
      reportId,
      payload,
      validation,
      disclaimer: PREVIEW_DISCLAIMER,
    };
  }
}
