import "server-only";

import {
  createOwnReportPeriod,
  findActiveReportWithEntriesByRange,
  getOwnReportWithEntries,
  getProfileSnapshot,
  getSignatorySnapshot,
  listOwnReports,
  parseScheduleSnapshot,
  refreshOwnReportSnapshots,
  updateOwnReportStatus,
  type DailyEntryRow,
  type ReportPeriodRow,
  type ReportWithEntries,
} from "@/db/dal/reports";
import { getOwnProfile } from "@/db/dal/profiles";
import { getTemplateAvailability } from "@/db/dal/templates";
import type { DayClassification } from "@/lib/reports/classify";
import { AppError } from "@/lib/reports/errors";
import { pgTimeToHhmm } from "@/lib/reports/pg-time";
import { formatTotalHoursLabel, sumWorkedMinutes } from "@/lib/reports/totals";
import type { ReportPeriodCreateInput } from "@/lib/validation/reports";
import {
  validateReport,
  type ReportValidationResult,
} from "@/server/services/report-validation";

export type ReportListItem = {
  report: ReportPeriodRow;
  totalWorkedMinutes: number;
  totalWorkedLabel: string;
  completeCount: number;
  entryCount: number;
  incompleteOrInvalidCount: number;
  progressLabel: string;
};

export class ReportPeriodService {
  static async create(
    userId: string,
    input: ReportPeriodCreateInput,
    clientSuppliedOwnerId?: unknown,
  ): Promise<ReportWithEntries> {
    return createOwnReportPeriod(userId, input, clientSuppliedOwnerId);
  }

  static async list(
    userId: string,
    options?: { limit?: number },
  ): Promise<ReportListItem[]> {
    const rows = await listOwnReports(userId, options);
    return rows.map(({ report, entries }) => summarize(report, entries));
  }

  static async findActiveSummary(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<ReportListItem | null> {
    const loaded = await findActiveReportWithEntriesByRange(userId, startDate, endDate);
    if (!loaded) return null;
    return summarize(loaded.report, loaded.entries);
  }

  static async get(userId: string, reportId: string) {
    const loaded = await getOwnReportWithEntries(userId, reportId);
    if (!loaded) throw new AppError("Report not found.", "NOT_FOUND");
    return loaded;
  }

  static async validate(
    userId: string,
    reportId: string,
  ): Promise<ReportValidationResult> {
    const loaded = await this.get(userId, reportId);
    return this.validateLoaded(userId, loaded.report, loaded.entries);
  }

  static async validateLoaded(
    userId: string,
    report: ReportPeriodRow,
    entries: DailyEntryRow[],
  ): Promise<ReportValidationResult> {
    const templates = await getTemplateAvailability();
    const profile = await getOwnProfile(userId);
    const scheduleSnap = parseScheduleSnapshot(report.scheduleSnapshot);

    return validateReport({
      report: {
        id: report.id,
        startDate: report.startDate,
        endDate: report.endDate,
        status: report.status,
        createdAt: report.createdAt,
        snapshotsRefreshedAt: report.snapshotsRefreshedAt,
        profileSnapshot: getProfileSnapshot(report),
        scheduleSnapshot: scheduleSnap,
        signatorySnapshot: getSignatorySnapshot(report),
      },
      entries: entries.map((e) => ({
        id: e.id,
        workDate: e.workDate,
        classification: e.classification as DayClassification,
        classificationLabel: e.classificationLabel,
        amArrival: pgTimeToHhmm(e.amArrival),
        amDeparture: pgTimeToHhmm(e.amDeparture),
        pmArrival: pgTimeToHhmm(e.pmArrival),
        pmDeparture: pgTimeToHhmm(e.pmDeparture),
        workedMinutes: e.workedMinutes,
        calculatedUndertimeMinutes: e.calculatedUndertimeMinutes,
        undertimeOverrideMinutes: e.undertimeOverrideMinutes,
        accomplishments: e.accomplishments ?? [],
        remarks: e.remarks,
        isComplete: e.isComplete,
      })),
      templates: templates.items,
      settingsUpdatedAt: profile?.updatedAt ?? null,
    });
  }

  /** Recalculate draft/ready status from authoritative validation. */
  static async syncReadiness(
    userId: string,
    reportId: string,
  ): Promise<{ report: ReportPeriodRow; validation: ReportValidationResult }> {
    const loaded = await this.get(userId, reportId);
    if (loaded.report.status === "finalized" || loaded.report.status === "archived") {
      const validation = await this.validateLoaded(userId, loaded.report, loaded.entries);
      return { report: loaded.report, validation };
    }

    const validation = await this.validateLoaded(userId, loaded.report, loaded.entries);
    const nextStatus = validation.ready ? "ready" : "draft";
    if (loaded.report.status !== nextStatus) {
      const report = await updateOwnReportStatus(userId, reportId, nextStatus);
      return { report, validation };
    }
    return { report: loaded.report, validation };
  }

  static async refreshSnapshots(
    userId: string,
    reportId: string,
    clientSuppliedOwnerId?: unknown,
  ) {
    await refreshOwnReportSnapshots(userId, reportId, clientSuppliedOwnerId);
    return this.syncReadiness(userId, reportId);
  }

  static async finalize(userId: string, reportId: string) {
    const loaded = await this.get(userId, reportId);
    if (loaded.report.status === "finalized") {
      return {
        report: loaded.report,
        validation: await this.validateLoaded(userId, loaded.report, loaded.entries),
      };
    }
    if (loaded.report.status === "archived") {
      throw new AppError("Archived reports cannot be finalized.", "NOT_EDITABLE");
    }

    const validation = await this.validateLoaded(userId, loaded.report, loaded.entries);
    if (!validation.ready) {
      throw new AppError(
        "Report has blocking validation errors and cannot be finalized.",
        "NOT_READY",
      );
    }

    const now = new Date().toISOString();
    const report = await updateOwnReportStatus(userId, reportId, "finalized", {
      finalizedAt: now,
    });
    return { report, validation };
  }

  static async reopen(userId: string, reportId: string) {
    const loaded = await this.get(userId, reportId);
    if (loaded.report.status !== "finalized") {
      throw new AppError("Only finalized reports can be reopened.", "PRECONDITION");
    }

    await updateOwnReportStatus(userId, reportId, "draft", {
      finalizedAt: null,
      invalidateExports: true,
    });
    return this.syncReadiness(userId, reportId);
  }
}

function summarize(report: ReportPeriodRow, entries: DailyEntryRow[]): ReportListItem {
  const totalWorkedMinutes = sumWorkedMinutes(entries);
  const completeCount = entries.filter((e) => e.isComplete).length;
  const incompleteOrInvalidCount = entries.filter((e) => !e.isComplete).length;
  return {
    report,
    totalWorkedMinutes,
    totalWorkedLabel: formatTotalHoursLabel(totalWorkedMinutes),
    completeCount,
    entryCount: entries.length,
    incompleteOrInvalidCount,
    progressLabel: `${completeCount}/${entries.length}`,
  };
}
