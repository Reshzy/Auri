/**
 * Prepare scrubbed DTR runtime XLSX from the immutable source workbook.
 * Never overwrites templates/source/DTR RODGE.xlsx.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import {
  DTR_MIRROR_FORMULAS,
  DTR_OWNED_LEFT,
  DTR_PREPARE_TOOL_VERSION,
  DTR_REQUIRED_PACKAGE_PARTS,
  DTR_RUNTIME_FILE,
  DTR_SOURCE_FILE,
  DTR_SOURCE_SHA256,
  DTR_TEMPLATE_ID,
  DTR_TOTAL_FORMULAS,
  DTR_MERGE_RANGES,
  DTR_PAGE_SETUP,
  DTR_WORKSHEET_PATH,
  DTR_MAX_DAYS,
  DTR_DAY_COLUMNS,
} from "../src/lib/templates/dtr-cell-map";
import {
  blankSharedStringEntries,
  clearCellValue,
  preserveFormula,
  readCellStyleId,
} from "../src/server/services/xlsx-ooxml";
import { validateXlsxZipStructure } from "../src/server/services/xlsx-structural";

const ROOT = path.resolve(__dirname, "..");
const SOURCE_PATH = path.join(ROOT, "templates", "source", DTR_SOURCE_FILE);
const RUNTIME_DIR = path.join(ROOT, "templates", "runtime");
const RUNTIME_PATH = path.join(RUNTIME_DIR, DTR_RUNTIME_FILE);
const MANIFEST_PATH = path.join(
  ROOT,
  "templates",
  "manifests",
  `${DTR_TEMPLATE_ID}.json`,
);

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function main() {
  if (!existsSync(SOURCE_PATH)) {
    throw new Error(`Source workbook missing: ${SOURCE_PATH}`);
  }

  const sourceBuf = readFileSync(SOURCE_PATH);
  const sourceHash = sha256(sourceBuf);
  if (sourceHash !== DTR_SOURCE_SHA256) {
    throw new Error(
      `Source SHA-256 mismatch.\nExpected: ${DTR_SOURCE_SHA256}\nActual:   ${sourceHash}\nRefusing to prepare. Do not overwrite the source.`,
    );
  }

  const zip = await JSZip.loadAsync(sourceBuf);
  for (const part of DTR_REQUIRED_PACKAGE_PARTS) {
    if (!zip.file(part)) {
      throw new Error(`Source package missing required part: ${part}`);
    }
  }

  let sheetXml = await zip.file(DTR_WORKSHEET_PATH)!.async("string");

  // Capture styles before clearing
  const styleSnapshot: Record<string, string | null> = {
    [DTR_OWNED_LEFT.employeeName]: readCellStyleId(sheetXml, DTR_OWNED_LEFT.employeeName),
    [DTR_OWNED_LEFT.periodLabel]: readCellStyleId(sheetXml, DTR_OWNED_LEFT.periodLabel),
    F14: readCellStyleId(sheetXml, "F14"),
    G14: readCellStyleId(sheetXml, "G14"),
  };

  // Clear sample identity/period owned cells
  sheetXml = clearCellValue(sheetXml, DTR_OWNED_LEFT.employeeName);
  sheetXml = clearCellValue(sheetXml, DTR_OWNED_LEFT.periodLabel);

  // Clear stale cached formula values on mirrors; keep formulas
  for (const mirror of Object.values(DTR_MIRROR_FORMULAS)) {
    sheetXml = preserveFormula(sheetXml, mirror.cell, mirror.formula, {
      clearCachedValue: true,
    });
  }

  // Ensure totals still present
  sheetXml = preserveFormula(
    sheetXml,
    DTR_TOTAL_FORMULAS.leftHours.cell,
    DTR_TOTAL_FORMULAS.leftHours.formula,
  );
  sheetXml = preserveFormula(
    sheetXml,
    DTR_TOTAL_FORMULAS.rightHours.cell,
    DTR_TOTAL_FORMULAS.rightHours.formula,
  );

  zip.file(DTR_WORKSHEET_PATH, sheetXml);

  // Blank shared-string sample identity/period entries (indices 19 and 20) without reordering
  const sharedEntry = zip.file("xl/sharedStrings.xml");
  if (sharedEntry) {
    const sharedXml = await sharedEntry.async("string");
    const scrubbed = blankSharedStringEntries(sharedXml, [19, 20]);
    zip.file("xl/sharedStrings.xml", scrubbed);
  }

  // Stabilize ZIP entry metadata so repeated prepares do not drift SHA-256.
  const fixedDate = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
  for (const entry of Object.values(zip.files)) {
    entry.date = fixedDate;
  }

  const runtimeBuf = Buffer.from(
    await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    }),
  );

  const structural = await validateXlsxZipStructure(runtimeBuf);
  if (structural.length > 0) {
    throw new Error(
      `Runtime structural validation failed:\n${structural.map((i) => `- ${i.code}: ${i.message}`).join("\n")}`,
    );
  }

  // Confirm sample cleared from sheet cell values (not static labels)
  if (sheetXml.includes("RODGE ANDRU P. VILORIA") || sheetXml.includes("AUGUST 1-15")) {
    throw new Error("Sample employee/period still present in Sheet1 cell values.");
  }
  const a6Cell =
    sheetXml.match(/<c r="A6"[^/]*\/>|<c r="A6"[^>]*>[\s\S]*?<\/c>/)?.[0] ?? "";
  const d8Cell =
    sheetXml.match(/<c r="D8"[^/]*\/>|<c r="D8"[^>]*>[\s\S]*?<\/c>/)?.[0] ?? "";
  if (a6Cell.includes("<v>") || d8Cell.includes("<v>") || a6Cell.includes("<is>")) {
    throw new Error(
      "Owned A6/D8 cells must be cleared of values in the runtime template.",
    );
  }

  mkdirSync(RUNTIME_DIR, { recursive: true });
  writeFileSync(RUNTIME_PATH, runtimeBuf);
  const runtimeHash = sha256(runtimeBuf);

  const leftMap: Record<string, string> = {};
  const rightMap: Record<string, string> = {};
  for (const [key, cols] of Object.entries(DTR_DAY_COLUMNS)) {
    leftMap[key] = `${cols.left}14:${cols.left}44`;
    rightMap[key] = `${cols.right}14:${cols.right}44`;
  }

  const manifest = {
    id: DTR_TEMPLATE_ID,
    type: "xlsx",
    version: 1,
    templateKey: "dtr",
    sourceFile: DTR_SOURCE_FILE,
    runtimeFile: DTR_RUNTIME_FILE,
    sourceSha256: DTR_SOURCE_SHA256,
    runtimeSha256: runtimeHash,
    pageSize: "legal",
    orientation: "landscape",
    paperSizeCode: DTR_PAGE_SETUP.paperSize,
    scale: DTR_PAGE_SETUP.scale,
    maxDayCount: DTR_MAX_DAYS,
    sheetName: "Sheet1",
    worksheetPath: DTR_WORKSHEET_PATH,
    leftCellMap: {
      employeeName: DTR_OWNED_LEFT.employeeName,
      periodLabel: DTR_OWNED_LEFT.periodLabel,
      ...leftMap,
      totalUndertimeHours: DTR_TOTAL_FORMULAS.leftHours.cell,
      signatureName: DTR_MIRROR_FORMULAS.signatureLeft.cell,
    },
    rightCellMap: {
      employeeName: DTR_MIRROR_FORMULAS.employeeNameRight.cell,
      periodLabel: DTR_MIRROR_FORMULAS.periodLabelRight.cell,
      ...rightMap,
      totalUndertimeHours: DTR_TOTAL_FORMULAS.rightHours.cell,
      signatureName: DTR_MIRROR_FORMULAS.signatureRight.cell,
    },
    requiredFormulas: {
      [DTR_TOTAL_FORMULAS.leftHours.cell]: DTR_TOTAL_FORMULAS.leftHours.formula,
      [DTR_TOTAL_FORMULAS.rightHours.cell]: DTR_TOTAL_FORMULAS.rightHours.formula,
      [DTR_MIRROR_FORMULAS.employeeNameRight.cell]:
        DTR_MIRROR_FORMULAS.employeeNameRight.formula,
      [DTR_MIRROR_FORMULAS.periodLabelRight.cell]:
        DTR_MIRROR_FORMULAS.periodLabelRight.formula,
      [DTR_MIRROR_FORMULAS.signatureLeft.cell]: DTR_MIRROR_FORMULAS.signatureLeft.formula,
      [DTR_MIRROR_FORMULAS.signatureRight.cell]:
        DTR_MIRROR_FORMULAS.signatureRight.formula,
    },
    mergeRanges: [...DTR_MERGE_RANGES],
    requiredDrawingParts: ["xl/drawings/drawing1.xml", "xl/drawings/vmlDrawing1.vml"],
    expectedWorksheetRelationships: ["printerSettings", "drawing", "vmlDrawing"],
    styleSnapshot,
    prepareToolVersion: DTR_PREPARE_TOOL_VERSION,
    active: true,
    readiness: "runtime_prepared",
    notes:
      "Runtime scrubbed of sample A6/D8 and formula caches. Source remains byte-identical. Dual-copy day cells written at export time.",
  };

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  // Keep Prettier-compatible trailing newline (already present).
  console.log("xlsx:prepare OK");
  console.log(`sourceSha256=${sourceHash}`);
  console.log(`runtimeSha256=${runtimeHash}`);
  console.log(`runtime=${RUNTIME_PATH}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`xlsx:prepare FAILED: ${message}`);
  process.exit(1);
});
