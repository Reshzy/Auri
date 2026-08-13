import type { ReportValidationResult } from "@/server/services/report-validation";

export type ExportFormat = "docx" | "xlsx" | "zip";

export type ExportResultStatus = "created" | "reused" | "failed";

export type ExportGenerationResultItem = {
  format: ExportFormat;
  status: ExportResultStatus;
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

export type ExportGenerationResponse = {
  overallStatus: "complete" | "partial" | "failed";
  reportId: string;
  results: ExportGenerationResultItem[];
};

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

export type HistoryTemplateLabel = {
  key: string;
  version: number | null;
};

export type ExportHistoryItem = {
  id: string;
  reportId: string;
  format: ExportFormat;
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
