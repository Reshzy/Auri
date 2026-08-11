/**
 * Audit source immutability and runtime DTR template invariants.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import {
  DTR_RUNTIME_FILE,
  DTR_SOURCE_FILE,
  DTR_SOURCE_SHA256,
  DTR_TEMPLATE_ID,
  DTR_WORKSHEET_PATH,
} from "../src/lib/templates/dtr-cell-map";
import { validateXlsxZipStructure } from "../src/server/services/xlsx-structural";

const ROOT = path.resolve(__dirname, "..");

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function main() {
  const sourcePath = path.join(ROOT, "templates", "source", DTR_SOURCE_FILE);
  const runtimePath = path.join(ROOT, "templates", "runtime", DTR_RUNTIME_FILE);
  const manifestPath = path.join(
    ROOT,
    "templates",
    "manifests",
    `${DTR_TEMPLATE_ID}.json`,
  );

  if (!existsSync(sourcePath)) throw new Error("Source XLSX missing.");
  if (!existsSync(runtimePath))
    throw new Error("Runtime XLSX missing. Run pnpm xlsx:prepare.");
  if (!existsSync(manifestPath)) throw new Error("Manifest missing.");

  const sourceBuf = readFileSync(sourcePath);
  const sourceHash = sha256(sourceBuf);
  if (sourceHash !== DTR_SOURCE_SHA256) {
    throw new Error(`Source SHA-256 mismatch: ${sourceHash}`);
  }

  const runtimeBuf = readFileSync(runtimePath);
  const runtimeHash = sha256(runtimeBuf);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    sourceSha256: string;
    runtimeSha256: string;
  };
  if (manifest.sourceSha256 !== DTR_SOURCE_SHA256) {
    throw new Error("Manifest sourceSha256 does not match constant.");
  }
  if (manifest.runtimeSha256 !== runtimeHash) {
    throw new Error(
      `Manifest runtimeSha256 ${manifest.runtimeSha256} != file ${runtimeHash}`,
    );
  }

  const issues = await validateXlsxZipStructure(runtimeBuf);
  if (issues.length > 0) {
    throw new Error(
      `Runtime structural issues:\n${issues.map((i) => `- ${i.code}: ${i.message}`).join("\n")}`,
    );
  }

  const zip = await JSZip.loadAsync(runtimeBuf);
  const sheet = await zip.file(DTR_WORKSHEET_PATH)!.async("string");
  if (sheet.includes("RODGE ANDRU P. VILORIA") || sheet.includes("AUGUST 1-15")) {
    throw new Error("Runtime Sheet1 still contains sample employee/period text.");
  }

  const shared = await zip.file("xl/sharedStrings.xml")?.async("string");
  if (shared?.includes("RODGE ANDRU P. VILORIA") || shared?.includes("AUGUST 1-15")) {
    throw new Error("Runtime sharedStrings still contain sample identity/period.");
  }

  console.log("xlsx:audit OK");
  console.log(`sourceSha256=${sourceHash}`);
  console.log(`runtimeSha256=${runtimeHash}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`xlsx:audit FAILED: ${message}`);
  process.exit(1);
});
