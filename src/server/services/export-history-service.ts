import "server-only";

import { getOwnReportWithEntries } from "@/db/dal/reports";
import {
  listOwnExportsForReport,
  listOwnRecentExports,
  type ReportExportRow,
} from "@/db/dal/exports";
import { getDb } from "@/db";
import { templateVersions } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { formatFileSizeBytes } from "@/lib/exports/file-size";
import { downloadUrlForExport } from "@/lib/exports/results";
import { formatExportTimestamp } from "@/lib/exports/timezone";
import { isZipBundleManifest } from "@/lib/exports/zip-manifest";
import type { ProfileSnapshot } from "@/db/dal/snapshots";
import { ReportMappingService } from "@/server/services/report-mapping-service";
import { TemplateService } from "@/server/services/template-service";
import { ExportFreshnessService } from "@/server/services/export-freshness-service";
import { pgTimeToHhmm } from "@/lib/reports/pg-time";
import type { DayClassification } from "@/lib/reports/classify";
import type { GeneratedStorage } from "@/server/storage/generated-reports-storage";

export type HistoryTemplateLabel = {
  key: string;
  version: number | null;
};

export type ExportHistoryItem = {
  id: string;
  reportId: string;
  format: "docx" | "xlsx" | "zip";
  fileName: string;
  fileSizeBytes: number;
  fileSizeLabel: string;
  createdAt: string;
  createdAtLabel: string;
  presentationStatus: "current" | "outdated";
  downloadable: boolean;
  downloadUrl: string;
  templates: HistoryTemplateLabel[];
};

function mappingInputFromLoaded(
  loaded: NonNullable<Awaited<ReturnType<typeof getOwnReportWithEntries>>>,
) {
  return {
    reportId: loaded.report.id,
    startDate: loaded.report.startDate,
    endDate: loaded.report.endDate,
    profileSnapshot: loaded.report.profileSnapshot as ProfileSnapshot,
    signatorySnapshot: loaded.report.signatorySnapshot as never,
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

async function loadTemplateLabels(
  ids: string[],
): Promise<Map<string, HistoryTemplateLabel>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, HistoryTemplateLabel>();
  if (unique.length === 0) return map;
  const db = getDb();
  const rows = await db
    .select({
      id: templateVersions.id,
      templateKey: templateVersions.templateKey,
      version: templateVersions.version,
    })
    .from(templateVersions)
    .where(inArray(templateVersions.id, unique));
  for (const row of rows) {
    map.set(row.id, { key: row.templateKey, version: row.version });
  }
  return map;
}

function templateIdsForRow(row: ReportExportRow): string[] {
  if (row.format === "zip") {
    if (!isZipBundleManifest(row.bundleManifest)) return [];
    return row.bundleManifest.members.map((member) => member.templateVersionId);
  }
  return row.templateVersionId ? [row.templateVersionId] : [];
}

export class ExportHistoryService {
  static async listForReport(
    userId: string,
    reportId: string,
    options?: { limit?: number; offset?: number; storage?: GeneratedStorage },
  ): Promise<ExportHistoryItem[]> {
    const loaded = await getOwnReportWithEntries(userId, reportId);
    if (!loaded) return [];
    const rows = await listOwnExportsForReport(userId, reportId, options);
    return this.presentRows(loaded, rows, options);
  }

  static async listRecent(
    userId: string,
    options?: { limit?: number; storage?: GeneratedStorage },
  ): Promise<ExportHistoryItem[]> {
    const rows = await listOwnRecentExports(userId, options);
    if (rows.length === 0) return [];
    const byReport = new Map<string, ReportExportRow[]>();
    for (const row of rows) {
      const list = byReport.get(row.reportPeriodId) ?? [];
      list.push(row);
      byReport.set(row.reportPeriodId, list);
    }
    const presented: ExportHistoryItem[] = [];
    for (const [reportId, group] of byReport) {
      const loaded = await getOwnReportWithEntries(userId, reportId);
      if (!loaded) continue;
      presented.push(...(await this.presentRows(loaded, group, options)));
    }
    presented.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return presented.slice(0, options?.limit ?? 8);
  }

  private static async presentRows(
    loaded: NonNullable<Awaited<ReturnType<typeof getOwnReportWithEntries>>>,
    rows: ReportExportRow[],
    options?: { storage?: GeneratedStorage },
  ): Promise<ExportHistoryItem[]> {
    const payload = ReportMappingService.buildPayload(mappingInputFromLoaded(loaded));
    const accomplishment = await TemplateService.getActiveAccomplishmentTemplate();
    const dtr = await TemplateService.getActiveDtrTemplate();
    const hashes = {
      accomplishmentSha256: accomplishment?.sha256 ?? "",
      dtrSha256: dtr?.sha256 ?? "",
    };
    const expected = {
      docx: ExportFreshnessService.expectedRevision("docx", payload, hashes),
      xlsx: ExportFreshnessService.expectedRevision("xlsx", payload, hashes),
      zip: ExportFreshnessService.expectedRevision("zip", payload, hashes),
    };
    const profile = loaded.report.profileSnapshot as ProfileSnapshot;
    const timezone = profile.timezone || "Asia/Manila";
    const templateIds = rows.flatMap(templateIdsForRow);
    const labels = await loadTemplateLabels(templateIds);

    const items: ExportHistoryItem[] = [];
    for (const row of rows) {
      const format = row.format as "docx" | "xlsx" | "zip";
      const freshness = await ExportFreshnessService.present(
        row,
        expected[format],
        options,
      );
      items.push({
        id: row.id,
        reportId: row.reportPeriodId,
        format,
        fileName: row.fileName,
        fileSizeBytes: row.fileSizeBytes,
        fileSizeLabel: formatFileSizeBytes(row.fileSizeBytes),
        createdAt: row.createdAt,
        createdAtLabel: formatExportTimestamp(row.createdAt, timezone),
        presentationStatus: freshness.status,
        downloadable: freshness.downloadable,
        downloadUrl: downloadUrlForExport(row.id),
        templates: templateIdsForRow(row).map(
          (id) => labels.get(id) ?? { key: "unknown", version: null },
        ),
      });
    }
    return items;
  }
}
