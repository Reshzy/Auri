import "server-only";

import { invalidateOwnReportExports } from "@/db/dal/exports";
import {
  derivePresentationStatus,
  isDownloadable,
  type PresentationStatus,
} from "@/lib/exports/freshness";
import { computeFormatSourceRevision } from "@/lib/exports/source-revision";
import type { ExportPayload } from "@/server/services/report-mapping-service";
import type { ReportExportRow } from "@/db/dal/exports";
import { ExportPersistenceService } from "@/server/services/export-persistence-service";
import type { GeneratedStorage } from "@/server/storage/generated-reports-storage";

export class ExportFreshnessService {
  static expectedRevision(
    format: "docx" | "xlsx" | "zip",
    payload: ExportPayload,
    hashes: { accomplishmentSha256: string; dtrSha256: string },
    options?: { hoursOnly?: boolean; capitalizeAccomplishments?: boolean },
  ): string {
    return computeFormatSourceRevision(format, payload, hashes, options);
  }

  /** DOCX/ZIP option combos all match the same report data. */
  static expectedRevisions(
    format: "docx" | "xlsx" | "zip",
    payload: ExportPayload,
    hashes: { accomplishmentSha256: string; dtrSha256: string },
  ): string[] {
    if (format === "xlsx") {
      return [this.expectedRevision(format, payload, hashes)];
    }
    return [
      this.expectedRevision(format, payload, hashes, {
        hoursOnly: false,
        capitalizeAccomplishments: false,
      }),
      this.expectedRevision(format, payload, hashes, {
        hoursOnly: true,
        capitalizeAccomplishments: false,
      }),
      this.expectedRevision(format, payload, hashes, {
        hoursOnly: false,
        capitalizeAccomplishments: true,
      }),
      this.expectedRevision(format, payload, hashes, {
        hoursOnly: true,
        capitalizeAccomplishments: true,
      }),
    ];
  }

  static async present(
    row: ReportExportRow,
    expectedSourceRevision: string | readonly string[],
    options?: { storage?: GeneratedStorage },
  ): Promise<{
    status: PresentationStatus;
    downloadable: boolean;
    storagePresent: boolean;
    storageMatchesMetadata: boolean;
  }> {
    const verified = await ExportPersistenceService.verifyStoredObject(row, options);
    const status = derivePresentationStatus({
      isCurrentFlag: row.isCurrent,
      storedSourceRevision: row.sourceRevision,
      expectedSourceRevision,
      storagePresent: verified.present,
      storageMatchesMetadata: verified.matches,
    });
    return {
      status,
      downloadable: isDownloadable({
        storagePresent: verified.present,
        storageMatchesMetadata: verified.matches,
      }),
      storagePresent: verified.present,
      storageMatchesMetadata: verified.matches,
    };
  }

  static async invalidateForReport(userId: string, reportId: string): Promise<number> {
    return invalidateOwnReportExports(userId, reportId);
  }
}
