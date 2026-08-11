import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import {
  ACCOMPLISHMENT_MAX_ROWS,
  ACCOMPLISHMENT_RUNTIME_FILE,
  ACCOMPLISHMENT_SOURCE_FILE,
  ACCOMPLISHMENT_SOURCE_SHA256,
  ACCOMPLISHMENT_TEMPLATE_ID,
  allRequiredTokens,
  tag,
} from "../src/lib/templates/accomplishment-tokens";

const ROOT = path.resolve(__dirname, "..");

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function plainText(xml: string): string {
  return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
}

function main() {
  const sourcePath = path.join(ROOT, "templates", "source", ACCOMPLISHMENT_SOURCE_FILE);
  const runtimePath = path.join(
    ROOT,
    "templates",
    "runtime",
    ACCOMPLISHMENT_RUNTIME_FILE,
  );
  const manifestPath = path.join(
    ROOT,
    "templates",
    "manifests",
    `${ACCOMPLISHMENT_TEMPLATE_ID}.json`,
  );

  if (!existsSync(sourcePath)) throw new Error("Missing source DOCX");
  if (!existsSync(runtimePath))
    throw new Error("Missing runtime DOCX — run pnpm docx:prepare");
  if (!existsSync(manifestPath)) throw new Error("Missing manifest");

  const sourceBuf = readFileSync(sourcePath);
  const sourceHash = sha256(sourceBuf);
  if (sourceHash !== ACCOMPLISHMENT_SOURCE_SHA256) {
    throw new Error(`Source hash drift: ${sourceHash}`);
  }

  const runtimeBuf = readFileSync(runtimePath);
  const runtimeHash = sha256(runtimeBuf);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    runtimeSha256?: string;
    sourceSha256?: string;
    requiredTokens?: string[];
    maxRows?: number;
  };

  if (manifest.sourceSha256 !== sourceHash) {
    throw new Error("Manifest sourceSha256 does not match source file");
  }
  if (manifest.runtimeSha256 !== runtimeHash) {
    throw new Error("Manifest runtimeSha256 does not match runtime file");
  }
  if (manifest.maxRows !== ACCOMPLISHMENT_MAX_ROWS) {
    throw new Error(`Manifest maxRows must be ${ACCOMPLISHMENT_MAX_ROWS}`);
  }

  const zip = new PizZip(runtimeBuf);
  if (!zip.file("[Content_Types].xml")) throw new Error("Missing [Content_Types].xml");
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("Missing word/document.xml");
  const xml = doc.asText();
  const text = plainText(xml);

  const required = allRequiredTokens();
  const manifestTokens = manifest.requiredTokens ?? [];
  if (manifestTokens.length !== required.length) {
    throw new Error(
      `Manifest token count ${manifestTokens.length} != contract ${required.length}`,
    );
  }
  for (const token of required) {
    if (!manifestTokens.includes(token)) {
      throw new Error(`Manifest missing token ${token}`);
    }
    if (!xml.includes(tag(token))) {
      throw new Error(`Runtime XML missing ${tag(token)}`);
    }
  }

  if ((text.match(/\{report_title\}/g) || []).length !== 1) {
    throw new Error("Expected exactly one {report_title} in runtime text");
  }
  if ((xml.match(/<w:tbl[\s>]/g) || []).length !== 2) {
    throw new Error("Expected exactly two tables (daily + signatories)");
  }
  const dayTbl = xml.match(/<w:tbl[\s>][\s\S]*?<\/w:tbl>/)?.[0] ?? "";
  const dayRows = (dayTbl.match(/<w:tr[\s>]/g) || []).length;
  if (dayRows !== 18) {
    throw new Error(
      `Expected 18 daily-table rows (2 header + 16 days), found ${dayRows}`,
    );
  }

  for (const sample of [
    "RODGE ANDRU P. VILORIA",
    "JOEL A. PUZON",
    "80HRS",
    "ASSISTS VISITORS AT THE OFFICE OF THE VICE MAYOR",
  ]) {
    if (xml.includes(sample)) {
      throw new Error(`Sample leak: ${sample}`);
    }
  }

  console.log("docx:audit OK");
  console.log(`sourceSha256=${sourceHash}`);
  console.log(`runtimeSha256=${runtimeHash}`);
  console.log(`tokens=${required.length}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`docx:audit FAILED: ${message}`);
  process.exit(1);
}
