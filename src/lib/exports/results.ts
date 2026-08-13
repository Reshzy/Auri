export type ExportFormat = "docx" | "xlsx" | "zip";

export type FormatResultStatus = "created" | "reused" | "failed";

export type OverallExportStatus = "complete" | "partial" | "failed";

export type ExportResultItem = {
  format: ExportFormat;
  status: FormatResultStatus;
  export?: {
    id: string;
    fileName: string;
    fileSizeBytes: number;
    sha256: string;
    isCurrent: boolean;
    createdAt: string;
    downloadUrl: string;
  };
  error?: {
    code: string;
    correlationId?: string;
  };
};

export function aggregateOverallStatus(
  results: Array<{ status: FormatResultStatus }>,
): OverallExportStatus {
  if (results.length === 0) return "failed";
  const failed = results.filter((item) => item.status === "failed").length;
  if (failed === results.length) return "failed";
  if (failed > 0) return "partial";
  return "complete";
}

export function downloadUrlForExport(exportId: string): string {
  return `/api/exports/${exportId}/download`;
}
