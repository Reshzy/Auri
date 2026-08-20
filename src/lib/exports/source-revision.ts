import { createHash } from "node:crypto";

export const SOURCE_REVISION_VERSION = "auri-src-rev-v1";
/** Bump when DOCX clock/display formatting changes so stale exports are not reused. */
export const DOCX_DISPLAY_CLOCK_VERSION = "12h-v1";

export type ExportFormat = "docx" | "xlsx" | "zip";

/**
 * Stable canonical JSON: object keys sorted recursively so revision hashes
 * are repeatable regardless of insertion order.
 */
export function stableCanonicalJson(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const obj = v as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(obj).sort()) {
        sorted[key] = obj[key];
      }
      return sorted;
    }
    return v;
  });
}

function sha256Utf8(material: string): string {
  return createHash("sha256").update(material, "utf8").digest("hex");
}

/**
 * Explicit labeled fields + version marker so unrelated concatenations cannot collide.
 */
function revisionMaterial(parts: {
  format: ExportFormat;
  payloadJson: string;
  accomplishmentHash?: string;
  dtrHash?: string;
}): string {
  const lines = [
    SOURCE_REVISION_VERSION,
    `format=${parts.format}`,
    `payload=${parts.payloadJson}`,
  ];
  if (parts.format === "docx") {
    lines.push(`template.accomplishment=${parts.accomplishmentHash ?? ""}`);
    lines.push(`docx.clock=${DOCX_DISPLAY_CLOCK_VERSION}`);
  } else if (parts.format === "xlsx") {
    lines.push(`template.dtr=${parts.dtrHash ?? ""}`);
  } else {
    lines.push(`template.accomplishment=${parts.accomplishmentHash ?? ""}`);
    lines.push(`template.dtr=${parts.dtrHash ?? ""}`);
    lines.push(`docx.clock=${DOCX_DISPLAY_CLOCK_VERSION}`);
  }
  return lines.join("\n");
}

export function computeDocxSourceRevision(
  payload: unknown,
  accomplishmentTemplateSha256: string,
): string {
  return sha256Utf8(
    revisionMaterial({
      format: "docx",
      payloadJson: stableCanonicalJson(payload),
      accomplishmentHash: accomplishmentTemplateSha256,
    }),
  );
}

export function computeXlsxSourceRevision(
  payload: unknown,
  dtrTemplateSha256: string,
): string {
  return sha256Utf8(
    revisionMaterial({
      format: "xlsx",
      payloadJson: stableCanonicalJson(payload),
      dtrHash: dtrTemplateSha256,
    }),
  );
}

export function computeZipSourceRevision(
  payload: unknown,
  accomplishmentTemplateSha256: string,
  dtrTemplateSha256: string,
): string {
  return sha256Utf8(
    revisionMaterial({
      format: "zip",
      payloadJson: stableCanonicalJson(payload),
      accomplishmentHash: accomplishmentTemplateSha256,
      dtrHash: dtrTemplateSha256,
    }),
  );
}

export function computeFormatSourceRevision(
  format: ExportFormat,
  payload: unknown,
  hashes: { accomplishmentSha256: string; dtrSha256: string },
): string {
  if (format === "docx") {
    return computeDocxSourceRevision(payload, hashes.accomplishmentSha256);
  }
  if (format === "xlsx") {
    return computeXlsxSourceRevision(payload, hashes.dtrSha256);
  }
  return computeZipSourceRevision(payload, hashes.accomplishmentSha256, hashes.dtrSha256);
}
