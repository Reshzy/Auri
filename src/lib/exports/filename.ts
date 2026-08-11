import { ACCOMPLISHMENT_MAX_ROWS } from "@/lib/templates/accomplishment-tokens";

const INVALID_FS = /[<>:"/\\|?*\u0000-\u001f]/g;

/**
 * Build: Auri_{Sanitized-Employee-Name}_{YYYY-MM-DD}_to_{YYYY-MM-DD}_Accomplishment.docx
 */
export function buildAccomplishmentFilename(input: {
  employeeName: string;
  startDate: string;
  endDate: string;
  maxLength?: number;
}): string {
  const maxLength = input.maxLength ?? 180;
  const namePart = sanitizeEmployeeNameForFilename(input.employeeName);
  const suffix = `_${input.startDate}_to_${input.endDate}_Accomplishment.docx`;
  const prefix = "Auri_";
  const budget = Math.max(8, maxLength - prefix.length - suffix.length);
  const clipped = namePart.slice(0, budget).replace(/-+$/g, "") || "Employee";
  return `${prefix}${clipped}${suffix}`;
}

/**
 * Build: Auri_{Sanitized-Employee-Name}_{YYYY-MM-DD}_to_{YYYY-MM-DD}_DTR.xlsx
 */
export function buildDtrFilename(input: {
  employeeName: string;
  startDate: string;
  endDate: string;
  maxLength?: number;
}): string {
  const maxLength = input.maxLength ?? 180;
  const namePart = sanitizeEmployeeNameForFilename(input.employeeName);
  const suffix = `_${input.startDate}_to_${input.endDate}_DTR.xlsx`;
  const prefix = "Auri_";
  const budget = Math.max(8, maxLength - prefix.length - suffix.length);
  const clipped = namePart.slice(0, budget).replace(/-+$/g, "") || "Employee";
  return `${prefix}${clipped}${suffix}`;
}

export function sanitizeEmployeeNameForFilename(name: string): string {
  return name
    .normalize("NFKC")
    .trim()
    .replace(INVALID_FS, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 80);
}

export function assertMaxRows(count: number): void {
  if (count > ACCOMPLISHMENT_MAX_ROWS) {
    throw new Error(
      `Report has ${count} days; DOCX supports at most ${ACCOMPLISHMENT_MAX_ROWS}.`,
    );
  }
}
