export type ExportErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "REPORT_NOT_FOUND"
  | "REPORT_INCOMPLETE"
  | "WARNING_ACKNOWLEDGEMENT_REQUIRED"
  | "UNSUPPORTED_FORMAT"
  | "TEMPLATE_NOT_FOUND"
  | "TEMPLATE_HASH_MISMATCH"
  | "TEMPLATE_INVALID"
  | "DOCX_GENERATION_FAILED"
  | "XLSX_GENERATION_FAILED"
  | "ZIP_GENERATION_FAILED"
  | "EXPORT_RATE_LIMITED"
  | "EXPORT_STORAGE_FAILED"
  | "EXPORT_INTEGRITY_FAILED"
  | "EXPORT_NOT_FOUND"
  | "EXPORT_DELETE_FAILED"
  | "VALIDATION"
  | "OWNERSHIP_REJECTED";

const STATUS_BY_CODE: Partial<Record<ExportErrorCode, number>> = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  OWNERSHIP_REJECTED: 403,
  NOT_FOUND: 404,
  REPORT_NOT_FOUND: 404,
  TEMPLATE_NOT_FOUND: 404,
  EXPORT_NOT_FOUND: 404,
  UNSUPPORTED_FORMAT: 400,
  VALIDATION: 400,
  REPORT_INCOMPLETE: 422,
  WARNING_ACKNOWLEDGEMENT_REQUIRED: 422,
  EXPORT_RATE_LIMITED: 429,
};

export class ExportError extends Error {
  readonly code: ExportErrorCode;
  readonly correlationId: string;
  readonly status: number;

  constructor(
    code: ExportErrorCode,
    message: string,
    options?: { status?: number; correlationId?: string; cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "ExportError";
    this.code = code;
    this.correlationId = options?.correlationId ?? crypto.randomUUID();
    this.status = options?.status ?? STATUS_BY_CODE[code] ?? 500;
  }
}

const SAFE_MESSAGES: Partial<Record<ExportErrorCode, string>> = {
  AUTH_REQUIRED: "Authentication required.",
  FORBIDDEN: "You do not have access to this resource.",
  OWNERSHIP_REJECTED: "Client-supplied ownership identifiers are not allowed.",
  NOT_FOUND: "Report not found.",
  REPORT_NOT_FOUND: "Report not found.",
  EXPORT_NOT_FOUND: "Export not found.",
  REPORT_INCOMPLETE: "Report has blocking validation errors and cannot be exported.",
  WARNING_ACKNOWLEDGEMENT_REQUIRED: "Acknowledge all warnings before generating files.",
  UNSUPPORTED_FORMAT: "Unsupported or invalid export formats.",
  TEMPLATE_NOT_FOUND: "Required template is not available.",
  TEMPLATE_HASH_MISMATCH: "Template hash does not match the trusted record.",
  TEMPLATE_INVALID: "Template failed validation.",
  DOCX_GENERATION_FAILED: "Document generation failed.",
  XLSX_GENERATION_FAILED: "Spreadsheet generation failed.",
  ZIP_GENERATION_FAILED: "Report package generation failed.",
  EXPORT_RATE_LIMITED: "Too many generation requests. Try again shortly.",
  EXPORT_STORAGE_FAILED: "Generated file could not be stored.",
  EXPORT_INTEGRITY_FAILED: "Generated file failed integrity verification.",
  EXPORT_DELETE_FAILED: "Export could not be deleted.",
  VALIDATION: "Invalid export request.",
};

export function toSafeExportErrorBody(
  error: unknown,
  options?: { fallbackCode?: ExportErrorCode },
): {
  error: { code: string; message: string; correlationId?: string };
  status: number;
} {
  if (error instanceof ExportError) {
    return {
      error: {
        code: error.code,
        message: SAFE_MESSAGES[error.code] ?? error.message,
        correlationId: error.correlationId,
      },
      status: error.status,
    };
  }
  if (error instanceof Error && error.message === "AUTH_REQUIRED") {
    return {
      error: { code: "AUTH_REQUIRED", message: "Authentication required." },
      status: 401,
    };
  }
  if (
    error instanceof Error &&
    error.message === "Client-supplied owner id is not allowed."
  ) {
    return {
      error: {
        code: "OWNERSHIP_REJECTED",
        message: "Client-supplied ownership identifiers are not allowed.",
      },
      status: 400,
    };
  }
  const correlationId = crypto.randomUUID();
  const fallbackCode = options?.fallbackCode ?? "DOCX_GENERATION_FAILED";
  return {
    error: {
      code: fallbackCode,
      message: SAFE_MESSAGES[fallbackCode] ?? "Export failed.",
      correlationId,
    },
    status: STATUS_BY_CODE[fallbackCode] ?? 500,
  };
}
