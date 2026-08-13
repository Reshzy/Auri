import {
  buildAccomplishmentFilename,
  buildDtrFilename,
  sanitizeEmployeeNameForFilename,
} from "@/lib/exports/filename";

/**
 * Build: Auri_{Sanitized-Employee-Name}_{YYYY-MM-DD}_to_{YYYY-MM-DD}_Report-Package.zip
 */
export function buildReportPackageFilename(input: {
  employeeName: string;
  startDate: string;
  endDate: string;
  maxLength?: number;
}): string {
  const maxLength = input.maxLength ?? 180;
  const namePart = sanitizeEmployeeNameForFilename(input.employeeName);
  const suffix = `_${input.startDate}_to_${input.endDate}_Report-Package.zip`;
  const prefix = "Auri_";
  const budget = Math.max(8, maxLength - prefix.length - suffix.length);
  const clipped = namePart.slice(0, budget).replace(/-+$/g, "") || "Employee";
  return `${prefix}${clipped}${suffix}`;
}

export function predictedExportFilenames(input: {
  employeeName: string;
  startDate: string;
  endDate: string;
}): { docx: string; xlsx: string; zip: string } {
  return {
    docx: buildAccomplishmentFilename(input),
    xlsx: buildDtrFilename(input),
    zip: buildReportPackageFilename(input),
  };
}

export { buildAccomplishmentFilename, buildDtrFilename, sanitizeEmployeeNameForFilename };
