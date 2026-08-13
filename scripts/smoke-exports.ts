import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { config } from "dotenv";
import JSZip from "jszip";
import {
  computeDocxSourceRevision,
  computeXlsxSourceRevision,
  computeZipSourceRevision,
  stableCanonicalJson,
} from "../src/lib/exports/source-revision";
import {
  buildGeneratedStoragePath,
  parseGeneratedStoragePath,
} from "../src/lib/exports/storage-path";
import { predictedExportFilenames } from "../src/lib/exports/filenames";
import { aggregateOverallStatus } from "../src/lib/exports/results";
import { derivePresentationStatus } from "../src/lib/exports/freshness";
import { isZipBundleManifest } from "../src/lib/exports/zip-manifest";
import { normalizeRequestedFormats } from "../src/lib/validation/exports";

config({ path: ".env.local" });
config();

const require = createRequire(import.meta.url);

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function main() {
  const Module = require("module") as {
    _load: (request: string, parent: unknown, isMain: boolean) => unknown;
  };
  const originalLoad = Module._load.bind(Module);
  Module._load = (request: string, parent: unknown, isMain: boolean) => {
    if (request === "server-only") return {};
    return originalLoad(request, parent, isMain);
  };

  const { ZipExportService } = await import("../src/server/services/zip-export-service");
  const payload = { reportId: "r1", employee: { name: "Smoke" } };
  const a = computeDocxSourceRevision(payload, "a".repeat(64));
  const b = computeDocxSourceRevision(payload, "a".repeat(64));
  if (a !== b) throw new Error("DOCX revision is not stable.");
  const x = computeXlsxSourceRevision(payload, "b".repeat(64));
  const z = computeZipSourceRevision(payload, "a".repeat(64), "b".repeat(64));
  if (a === x || a === z || x === z) throw new Error("Format revisions collided.");
  if (!stableCanonicalJson({ b: 1, a: 2 }).includes('"a":2')) {
    throw new Error("Canonical JSON key order failed.");
  }

  const names = predictedExportFilenames({
    employeeName: "Smoke Employee",
    startDate: "2026-08-01",
    endDate: "2026-08-15",
  });
  if (!names.zip.endsWith("_Report-Package.zip")) throw new Error("ZIP filename failed.");

  const ownerId = randomUUID();
  const reportId = randomUUID();
  const exportId = randomUUID();
  const path = buildGeneratedStoragePath({
    ownerId,
    reportPeriodId: reportId,
    exportId,
    fileName: names.docx,
  });
  const parsed = parseGeneratedStoragePath(path);
  if (!parsed || parsed.ownerId !== ownerId)
    throw new Error("Storage path parse failed.");

  const zipReject = normalizeRequestedFormats(["zip"]);
  if (zipReject.ok) throw new Error("ZIP without members should be rejected.");

  const realDocx = Buffer.from(
    await new JSZip().file("w", "d").generateAsync({ type: "nodebuffer" }),
  );
  const realXlsx = Buffer.from(
    await new JSZip().file("s", "x").generateAsync({ type: "nodebuffer" }),
  );
  const packaged = await ZipExportService.packageReport({
    employeeName: "Smoke Employee",
    startDate: "2026-08-01",
    endDate: "2026-08-15",
    docx: {
      exportId: randomUUID(),
      fileName: names.docx,
      buffer: realDocx,
      sha256: sha256(realDocx),
      fileSizeBytes: realDocx.byteLength,
      templateVersionId: randomUUID(),
      templateSha256: "a".repeat(64),
    },
    xlsx: {
      exportId: randomUUID(),
      fileName: names.xlsx,
      buffer: realXlsx,
      sha256: sha256(realXlsx),
      fileSizeBytes: realXlsx.byteLength,
      templateVersionId: randomUUID(),
      templateSha256: "b".repeat(64),
    },
  });
  if (!isZipBundleManifest(packaged.bundleManifest)) {
    throw new Error("ZIP manifest incomplete.");
  }

  const overall = aggregateOverallStatus([{ status: "created" }, { status: "failed" }]);
  if (overall !== "partial") throw new Error("Partial aggregation failed.");

  const current = derivePresentationStatus({
    isCurrentFlag: true,
    storedSourceRevision: a,
    expectedSourceRevision: a,
    storagePresent: true,
    storageMatchesMetadata: true,
  });
  if (current !== "current") throw new Error("Freshness current derivation failed.");

  console.log("OK: exports:smoke (unit ZIP/revision/path checks; no live Storage).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "exports:smoke failed");
  process.exit(1);
});
