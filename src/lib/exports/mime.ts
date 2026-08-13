export type ExportFormat = "docx" | "xlsx" | "zip";

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const ZIP_MIME = "application/zip";

export const MAX_DOCX_OUTPUT_BYTES = 15 * 1024 * 1024;
export const MAX_XLSX_OUTPUT_BYTES = 15 * 1024 * 1024;
export const MAX_ZIP_OUTPUT_BYTES = 32 * 1024 * 1024;
export const MAX_ZIP_COMPRESSED_BYTES = 32 * 1024 * 1024;
export const MAX_GENERATED_OBJECT_BYTES = 32 * 1024 * 1024;

const MIME_BY_FORMAT: Record<ExportFormat, string> = {
  docx: DOCX_MIME,
  xlsx: XLSX_MIME,
  zip: ZIP_MIME,
};

const EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
  docx: ".docx",
  xlsx: ".xlsx",
  zip: ".zip",
};

export function mimeTypeForFormat(format: ExportFormat): string {
  return MIME_BY_FORMAT[format];
}

export function extensionForFormat(format: ExportFormat): string {
  return EXTENSION_BY_FORMAT[format];
}

export function maxBytesForFormat(format: ExportFormat): number {
  if (format === "docx") return MAX_DOCX_OUTPUT_BYTES;
  if (format === "xlsx") return MAX_XLSX_OUTPUT_BYTES;
  return MAX_ZIP_OUTPUT_BYTES;
}

export function isAllowedGeneratedMime(format: ExportFormat, mime: string): boolean {
  return mime === mimeTypeForFormat(format);
}

export function filenameMatchesFormat(fileName: string, format: ExportFormat): boolean {
  return fileName.toLowerCase().endsWith(extensionForFormat(format));
}
