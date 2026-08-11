/** Safe ZIP entry validation for XLSX OOXML packages. */

export const MAX_XLSX_TEMPLATE_BYTES = 5 * 1024 * 1024;
export const MAX_XLSX_OUTPUT_BYTES = 15 * 1024 * 1024;
export const MAX_XLSX_ENTRY_BYTES = 8 * 1024 * 1024;
export const MAX_XLSX_ENTRY_COUNT = 256;

export type ZipSafetyIssue = {
  code: string;
  message: string;
};

export function isUnsafeZipEntryName(name: string): boolean {
  if (!name || name.includes("\0")) return true;
  if (name.startsWith("/") || name.startsWith("\\")) return true;
  if (/^[a-zA-Z]:[\\/]/.test(name)) return true;
  if (name.includes("\\")) return true;
  const parts = name.split("/");
  if (parts.some((p) => p === ".." || p === "")) {
    // Allow trailing empty from directory markers ending in /
    if (!(name.endsWith("/") && parts[parts.length - 1] === "")) return true;
    if (parts.slice(0, -1).some((p) => p === ".." || p === "")) return true;
  }
  if (/(^|\/)\.\.(\/|$)/.test(name)) return true;
  return false;
}

export function validateZipEntryNames(names: string[]): ZipSafetyIssue[] {
  const issues: ZipSafetyIssue[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    if (isUnsafeZipEntryName(name)) {
      issues.push({
        code: "ZIP_SLIP",
        message: `Unsafe ZIP entry name: ${name}`,
      });
      continue;
    }
    const normalized = name.replace(/\/+$/, "");
    if (normalized && seen.has(normalized.toLowerCase())) {
      issues.push({
        code: "ZIP_DUPLICATE",
        message: `Duplicate ZIP entry path: ${name}`,
      });
    }
    if (normalized) seen.add(normalized.toLowerCase());
  }
  if (names.length > MAX_XLSX_ENTRY_COUNT) {
    issues.push({
      code: "ZIP_TOO_MANY_ENTRIES",
      message: `ZIP has ${names.length} entries; max ${MAX_XLSX_ENTRY_COUNT}.`,
    });
  }
  return issues;
}

export function assertZipEntrySize(byteLength: number, entryName: string): void {
  if (byteLength > MAX_XLSX_ENTRY_BYTES) {
    throw new Error(
      `ZIP entry ${entryName} exceeds maximum size of ${MAX_XLSX_ENTRY_BYTES} bytes.`,
    );
  }
}
