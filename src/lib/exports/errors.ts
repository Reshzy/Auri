export type ExportErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "REPORT_INCOMPLETE"
  | "UNSUPPORTED_FORMAT"
  | "TEMPLATE_NOT_FOUND"
  | "TEMPLATE_HASH_MISMATCH"
  | "TEMPLATE_INVALID"
  | "DOCX_GENERATION_FAILED"
  | "XLSX_GENERATION_FAILED"
  | "VALIDATION"
  | "OWNERSHIP_REJECTED";

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
    this.status =
      options?.status ??
      (code === "AUTH_REQUIRED"
        ? 401
        : code === "FORBIDDEN" || code === "OWNERSHIP_REJECTED"
          ? 403
          : code === "NOT_FOUND" || code === "TEMPLATE_NOT_FOUND"
            ? 404
            : code === "UNSUPPORTED_FORMAT"
              ? 400
              : code === "REPORT_INCOMPLETE" || code === "VALIDATION"
                ? 422
                : 500);
  }
}

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
        message: error.message,
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
  const correlationId = crypto.randomUUID();
  const fallbackCode = options?.fallbackCode ?? "DOCX_GENERATION_FAILED";
  const message =
    fallbackCode === "XLSX_GENERATION_FAILED"
      ? "Spreadsheet generation failed."
      : "Document generation failed.";
  return {
    error: {
      code: fallbackCode,
      message,
      correlationId,
    },
    status: 500,
  };
}
