const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GENERATED_REPORTS_BUCKET = "generated-reports";

export type GeneratedStoragePathParts = {
  ownerId: string;
  reportPeriodId: string;
  exportId: string;
  fileName: string;
};

/**
 * Canonical object path: {internalProfileUuid}/{reportPeriodId}/{exportId}/{fileName}
 * Uses the internal profile UUID, never a Clerk user_… id.
 */
export function buildGeneratedStoragePath(parts: GeneratedStoragePathParts): string {
  assertUuid(parts.ownerId, "ownerId");
  assertUuid(parts.reportPeriodId, "reportPeriodId");
  assertUuid(parts.exportId, "exportId");
  const fileName = assertSafeFlatFileName(parts.fileName);
  return `${parts.ownerId}/${parts.reportPeriodId}/${parts.exportId}/${fileName}`;
}

export function parseGeneratedStoragePath(
  storagePath: string,
): GeneratedStoragePathParts | null {
  if (!storagePath || storagePath.includes("\\") || storagePath.includes("\0")) {
    return null;
  }
  if (storagePath.startsWith("/") || storagePath.includes("..")) {
    return null;
  }
  const segments = storagePath.split("/");
  if (segments.length !== 4) return null;
  const [ownerId, reportPeriodId, exportId, fileName] = segments;
  if (!ownerId || !reportPeriodId || !exportId || !fileName) return null;
  if (
    !UUID_RE.test(ownerId) ||
    !UUID_RE.test(reportPeriodId) ||
    !UUID_RE.test(exportId)
  ) {
    return null;
  }
  try {
    assertSafeFlatFileName(fileName);
  } catch {
    return null;
  }
  return { ownerId, reportPeriodId, exportId, fileName };
}

export function assertStoragePathOwnership(
  storagePath: string,
  expected: { ownerId: string; reportPeriodId: string; exportId: string },
): GeneratedStoragePathParts {
  const parsed = parseGeneratedStoragePath(storagePath);
  if (!parsed) {
    throw new Error("Invalid generated-report storage path.");
  }
  if (parsed.ownerId !== expected.ownerId) {
    throw new Error("Storage path owner mismatch.");
  }
  if (parsed.reportPeriodId !== expected.reportPeriodId) {
    throw new Error("Storage path report mismatch.");
  }
  if (parsed.exportId !== expected.exportId) {
    throw new Error("Storage path export mismatch.");
  }
  return parsed;
}

export function assertSafeFlatFileName(fileName: string): string {
  if (!fileName || fileName.includes("\0")) {
    throw new Error("Invalid export filename.");
  }
  if (fileName.includes("/") || fileName.includes("\\")) {
    throw new Error("Export filename must be a flat name.");
  }
  if (fileName.includes("..") || fileName.startsWith(".")) {
    throw new Error("Unsafe export filename.");
  }
  if (/[<>:"|?*\u0000-\u001f]/.test(fileName)) {
    throw new Error("Export filename contains invalid characters.");
  }
  if (fileName.length > 180) {
    throw new Error("Export filename is too long.");
  }
  return fileName;
}

function assertUuid(value: string, label: string): void {
  if (!UUID_RE.test(value)) {
    throw new Error(`Invalid ${label} for storage path.`);
  }
}
