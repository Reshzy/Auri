/** Shared accomplishment DOCX token contract (Phase 6). */

export const ACCOMPLISHMENT_TEMPLATE_ID = "accomplishment-report-v1";
export const ACCOMPLISHMENT_TEMPLATE_KEY = "accomplishment";
export const ACCOMPLISHMENT_SOURCE_FILE = "ACCOMPLISHMENT - RODGE.docx";
export const ACCOMPLISHMENT_RUNTIME_FILE = "accomplishment-report-v1.docx";
export const ACCOMPLISHMENT_SOURCE_SHA256 =
  "d1381a91daf69d13a8a3d836be722dc4fa05544def667b194dce959361e091c5";
export const ACCOMPLISHMENT_MAX_ROWS = 16;

export const HEADER_TOKENS = [
  "municipality_name",
  "office_name",
  "department_name",
  "report_title",
  "employee_name",
  "period_label",
  "total_hours_label",
  "certification_text",
  "signatory_employee_name",
  "signatory_employee_title",
  "signatory_1_name",
  "signatory_1_title",
  "signatory_2_name",
  "signatory_2_title",
  "signatory_3_name",
  "signatory_3_title",
] as const;

export const ROW_FIELD_SUFFIXES = [
  "date",
  "am",
  "pm",
  "time_spent",
  "accomplishment",
  "remarks",
] as const;

export type HeaderToken = (typeof HEADER_TOKENS)[number];
export type RowFieldSuffix = (typeof ROW_FIELD_SUFFIXES)[number];

export function rowToken(rowIndex1Based: number, field: RowFieldSuffix): string {
  const nn = String(rowIndex1Based).padStart(2, "0");
  return `r${nn}_${field}`;
}

export function allRowTokens(maxRows = ACCOMPLISHMENT_MAX_ROWS): string[] {
  const tokens: string[] = [];
  for (let i = 1; i <= maxRows; i += 1) {
    for (const field of ROW_FIELD_SUFFIXES) {
      tokens.push(rowToken(i, field));
    }
  }
  return tokens;
}

export function allRequiredTokens(maxRows = ACCOMPLISHMENT_MAX_ROWS): string[] {
  return [...HEADER_TOKENS, ...allRowTokens(maxRows)];
}

export function tag(token: string): string {
  return `{${token}}`;
}
