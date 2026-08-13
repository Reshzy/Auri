import { describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import {
  computeDocxSourceRevision,
  computeXlsxSourceRevision,
  computeZipSourceRevision,
  stableCanonicalJson,
} from "@/lib/exports/source-revision";
import {
  assertStoragePathOwnership,
  buildGeneratedStoragePath,
  parseGeneratedStoragePath,
} from "@/lib/exports/storage-path";
import { mimeTypeForFormat, filenameMatchesFormat } from "@/lib/exports/mime";
import {
  predictedExportFilenames,
  buildReportPackageFilename,
} from "@/lib/exports/filenames";
import { aggregateOverallStatus } from "@/lib/exports/results";
import { derivePresentationStatus, isDownloadable } from "@/lib/exports/freshness";
import { isRateLimited } from "@/lib/exports/rate-limit";
import { formatFileSizeBytes } from "@/lib/exports/file-size";
import { formatExportTimestamp } from "@/lib/exports/timezone";
import {
  acknowledgementsAreComplete,
  clearAcknowledgementsOnDataChange,
  zipSelectionRequiresMembers,
} from "@/lib/exports/review-state";
import {
  toSafeExportErrorBody,
  toSafeExportUserMessage,
  ExportError,
} from "@/lib/exports/errors";
import { buildZipBundleManifest, isZipBundleManifest } from "@/lib/exports/zip-manifest";
import {
  isUnsafeFlatZipEntryName,
  validateFlatZipEntryNames,
} from "@/lib/exports/zip-safety";
import { normalizeRequestedFormats } from "@/lib/validation/exports";
import { PREVIEW_DISCLAIMER } from "@/lib/exports/preview-copy";

const payload = {
  reportId: "r1",
  employee: { name: "Ada" },
  entries: [{ date: "2026-08-03" }, { date: "2026-08-01" }],
};

describe("format-specific source revisions", () => {
  it("is stable for the same canonical payload and template hash", () => {
    const a = computeDocxSourceRevision(payload, "aa".repeat(32));
    const b = computeDocxSourceRevision(payload, "aa".repeat(32));
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes after report edits", () => {
    const before = computeDocxSourceRevision(payload, "aa".repeat(32));
    const after = computeDocxSourceRevision(
      { ...payload, employee: { name: "Bea" } },
      "aa".repeat(32),
    );
    expect(after).not.toBe(before);
  });

  it("changes after template hash changes", () => {
    const before = computeXlsxSourceRevision(payload, "aa".repeat(32));
    const after = computeXlsxSourceRevision(payload, "bb".repeat(32));
    expect(after).not.toBe(before);
  });

  it("keeps DOCX, XLSX, and ZIP revisions distinct", () => {
    const docx = computeDocxSourceRevision(payload, "aa".repeat(32));
    const xlsx = computeXlsxSourceRevision(payload, "aa".repeat(32));
    const zip = computeZipSourceRevision(payload, "aa".repeat(32), "bb".repeat(32));
    expect(new Set([docx, xlsx, zip]).size).toBe(3);
  });

  it("uses stable canonical JSON key order", () => {
    expect(stableCanonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});

describe("current/outdated derivation", () => {
  it("requires flag, matching revision, and verified storage", () => {
    const base = {
      isCurrentFlag: true,
      storedSourceRevision: "rev",
      expectedSourceRevision: "rev",
      storagePresent: true,
      storageMatchesMetadata: true,
    };
    expect(derivePresentationStatus(base)).toBe("current");
    expect(derivePresentationStatus({ ...base, isCurrentFlag: false })).toBe("outdated");
    expect(derivePresentationStatus({ ...base, expectedSourceRevision: "other" })).toBe(
      "outdated",
    );
    expect(derivePresentationStatus({ ...base, storagePresent: false })).toBe("outdated");
  });

  it("hides download when the Storage object is missing or mismatched", () => {
    expect(isDownloadable({ storagePresent: false, storageMatchesMetadata: false })).toBe(
      false,
    );
    expect(isDownloadable({ storagePresent: true, storageMatchesMetadata: false })).toBe(
      false,
    );
    expect(isDownloadable({ storagePresent: true, storageMatchesMetadata: true })).toBe(
      true,
    );
  });
});

describe("filenames and storage paths", () => {
  it("builds sanitized filenames including ZIP", () => {
    const names = predictedExportFilenames({
      employeeName: "Rodge Andru P. Viloria",
      startDate: "2026-08-01",
      endDate: "2026-08-15",
    });
    expect(names.docx).toContain("Accomplishment.docx");
    expect(names.xlsx).toContain("DTR.xlsx");
    expect(names.zip).toBe(
      buildReportPackageFilename({
        employeeName: "Rodge Andru P. Viloria",
        startDate: "2026-08-01",
        endDate: "2026-08-15",
      }),
    );
    expect(names.zip).toContain("Report-Package.zip");
  });

  it("builds and validates owner-scoped storage paths", () => {
    const ownerId = randomUUID();
    const reportPeriodId = randomUUID();
    const exportId = randomUUID();
    const path = buildGeneratedStoragePath({
      ownerId,
      reportPeriodId,
      exportId,
      fileName: "Auri_Ada_2026-08-01_to_2026-08-15_Accomplishment.docx",
    });
    expect(parseGeneratedStoragePath(path)?.ownerId).toBe(ownerId);
    expect(() =>
      assertStoragePathOwnership(path, { ownerId, reportPeriodId, exportId }),
    ).not.toThrow();
    expect(() =>
      assertStoragePathOwnership(path, {
        ownerId: randomUUID(),
        reportPeriodId,
        exportId,
      }),
    ).toThrow(/owner/);
  });

  it("rejects path-prefix tampering", () => {
    expect(parseGeneratedStoragePath("../secret/file.docx")).toBeNull();
    expect(parseGeneratedStoragePath("a/b/c/d/e.docx")).toBeNull();
  });
});

describe("MIME and ZIP contract", () => {
  it("selects Office and ZIP MIME types", () => {
    expect(mimeTypeForFormat("docx")).toContain("wordprocessingml");
    expect(mimeTypeForFormat("xlsx")).toContain("spreadsheetml");
    expect(mimeTypeForFormat("zip")).toBe("application/zip");
    expect(filenameMatchesFormat("a.docx", "docx")).toBe(true);
  });

  it("rejects ZIP without both members", () => {
    expect(normalizeRequestedFormats(["zip"]).ok).toBe(false);
    expect(normalizeRequestedFormats(["docx", "zip"]).ok).toBe(false);
    expect(normalizeRequestedFormats(["docx", "xlsx", "zip"]).ok).toBe(true);
  });

  it("rejects unsafe or duplicate flat ZIP entries", () => {
    expect(isUnsafeFlatZipEntryName("../x.docx")).toBe(true);
    expect(isUnsafeFlatZipEntryName("dir/file.docx")).toBe(true);
    expect(validateFlatZipEntryNames(["a.docx", "a.docx"]).length).toBeGreaterThan(0);
  });

  it("requires a complete ZIP bundle manifest", () => {
    const docxId = randomUUID();
    const xlsxId = randomUUID();
    const manifest = buildZipBundleManifest({
      docx: {
        format: "docx",
        exportId: docxId,
        fileName: "a.docx",
        sha256: "ab".repeat(32),
        fileSizeBytes: 10,
        templateVersionId: randomUUID(),
        templateSha256: "cd".repeat(32),
      },
      xlsx: {
        format: "xlsx",
        exportId: xlsxId,
        fileName: "a.xlsx",
        sha256: "ef".repeat(32),
        fileSizeBytes: 11,
        templateVersionId: randomUUID(),
        templateSha256: "11".repeat(32),
      },
    });
    expect(isZipBundleManifest(manifest)).toBe(true);
    expect(isZipBundleManifest({ version: 1, members: [] })).toBe(false);
  });
});

describe("result aggregation and review state", () => {
  it("distinguishes complete, partial, and failed", () => {
    expect(aggregateOverallStatus([{ status: "created" }, { status: "reused" }])).toBe(
      "complete",
    );
    expect(aggregateOverallStatus([{ status: "created" }, { status: "failed" }])).toBe(
      "partial",
    );
    expect(aggregateOverallStatus([{ status: "failed" }])).toBe("failed");
  });

  it("requires warning acknowledgement and clears it on data change", () => {
    const state = {
      warningCodes: ["MANUAL_UNDERTIME_OVERRIDE"],
      acknowledged: ["MANUAL_UNDERTIME_OVERRIDE"],
      dataRevision: "r1",
      acknowledgedForRevision: "r1",
    };
    expect(acknowledgementsAreComplete(state)).toBe(true);
    const cleared = clearAcknowledgementsOnDataChange(state, "r2");
    expect(acknowledgementsAreComplete(cleared)).toBe(false);
  });

  it("auto-selects DOCX and XLSX when ZIP is selected", () => {
    expect(zipSelectionRequiresMembers({ docx: false, xlsx: false, zip: true })).toEqual({
      docx: true,
      xlsx: true,
      zip: true,
    });
  });
});

describe("safe errors, rate limit, size, timezone, preview copy", () => {
  it("maps export errors without leaking internals", () => {
    const body = toSafeExportErrorBody(
      new ExportError("EXPORT_STORAGE_FAILED", "secret-path"),
    );
    expect(body.error.code).toBe("EXPORT_STORAGE_FAILED");
    expect(body.error.message).not.toContain("secret-path");
    expect(toSafeExportUserMessage("DOCX_GENERATION_FAILED")).toBe(
      "Document generation failed.",
    );
    expect(toSafeExportUserMessage("STACK_TRACE_HERE", "Try again.")).toBe("Try again.");
  });

  it("rate-limits after the configured count", () => {
    expect(isRateLimited(11)).toBe(false);
    expect(isRateLimited(12)).toBe(true);
  });

  it("formats file sizes", () => {
    expect(formatFileSizeBytes(512)).toBe("512 B");
    expect(formatFileSizeBytes(2048)).toBe("2.0 KB");
  });

  it("formats timestamps in Asia/Manila", () => {
    const label = formatExportTimestamp("2026-08-01T04:00:00.000Z", "Asia/Manila");
    expect(label).toMatch(/2026/);
  });

  it("keeps the exact preview disclaimer", () => {
    expect(PREVIEW_DISCLAIMER).toBe(
      "Preview verifies your content. The downloaded Word and Excel templates are the official print layouts.",
    );
  });
});

describe("hash helper used by ZIP members", () => {
  it("sha256 is hex", () => {
    expect(createHash("sha256").update("x").digest("hex")).toHaveLength(64);
  });
});
