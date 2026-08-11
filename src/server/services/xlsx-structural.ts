import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import {
  DTR_MERGE_RANGES,
  DTR_PAGE_SETUP,
  DTR_REQUIRED_PACKAGE_PARTS,
  DTR_SAMPLE_EMPLOYEE,
  DTR_SAMPLE_PERIOD,
  DTR_SHEET_NAME,
  DTR_TOTAL_FORMULAS,
  DTR_WORKSHEET_PATH,
  DTR_MIRROR_FORMULAS,
} from "@/lib/templates/dtr-cell-map";
import {
  listMergeRanges,
  parseSharedStringsXml,
  readCellFormula,
  readCellLogicalValue,
  readCellStyleId,
} from "@/server/services/xlsx-ooxml";
import {
  MAX_XLSX_OUTPUT_BYTES,
  MAX_XLSX_TEMPLATE_BYTES,
  assertZipEntrySize,
  validateZipEntryNames,
  type ZipSafetyIssue,
} from "@/server/services/xlsx-zip-safety";
import { ExportError } from "@/lib/exports/errors";

export type XlsxStructuralIssue = {
  code: string;
  message: string;
};

async function loadZip(
  buffer: Buffer,
  maxBytes: number,
): Promise<{ zip: JSZip; issues: XlsxStructuralIssue[] }> {
  const issues: XlsxStructuralIssue[] = [];
  if (buffer.byteLength <= 0) {
    return {
      zip: new JSZip(),
      issues: [{ code: "EMPTY", message: "XLSX buffer is empty." }],
    };
  }
  if (buffer.byteLength > maxBytes) {
    issues.push({
      code: "TOO_LARGE",
      message: `XLSX exceeds maximum size of ${maxBytes} bytes.`,
    });
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    issues.push({
      code: "INVALID_ZIP",
      message: "Not a valid ZIP/XLSX package.",
    });
    return { zip: new JSZip(), issues };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return {
      zip: new JSZip(),
      issues: [{ code: "INVALID_ZIP", message: "Not a valid ZIP/XLSX package." }],
    };
  }

  const names = Object.keys(zip.files);
  const safety = validateZipEntryNames(names);
  for (const s of safety) {
    issues.push({ code: s.code, message: s.message });
  }

  for (const name of names) {
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    try {
      const data = await entry.async("uint8array");
      assertZipEntrySize(data.byteLength, name);
    } catch (error) {
      issues.push({
        code: "ENTRY_TOO_LARGE",
        message: error instanceof Error ? error.message : "ZIP entry too large.",
      });
    }
  }

  return { zip, issues };
}

function resolveSheet1Path(workbookXml: string, relsXml: string): string | null {
  const wbDoc = new DOMParser().parseFromString(workbookXml, "text/xml");
  const sheets = wbDoc.getElementsByTagName("sheet");
  let rId: string | null = null;
  for (let i = 0; i < sheets.length; i += 1) {
    const sheet = sheets.item(i)!;
    if (sheet.getAttribute("name") === DTR_SHEET_NAME) {
      rId = sheet.getAttribute("r:id") ?? sheet.getAttribute("id");
      // OOXML uses r:id in relationship namespace
      if (!rId) {
        for (let a = 0; a < sheet.attributes.length; a += 1) {
          const attr = sheet.attributes.item(a);
          if (attr && (attr.name === "r:id" || attr.localName === "id")) {
            rId = attr.value;
            break;
          }
        }
      }
      break;
    }
  }
  if (!rId) return null;

  const relDoc = new DOMParser().parseFromString(relsXml, "text/xml");
  const rels = relDoc.getElementsByTagName("Relationship");
  for (let i = 0; i < rels.length; i += 1) {
    const rel = rels.item(i)!;
    if (rel.getAttribute("Id") === rId) {
      const target = rel.getAttribute("Target");
      if (!target) return null;
      if (target.startsWith("/")) return target.slice(1);
      return `xl/${target.replace(/^\.\.\//, "")}`.replace(/^xl\/xl\//, "xl/");
    }
  }
  return null;
}

function sheetIsBlank(sheetXml: string): boolean {
  // Blank sheets in source have dimension A1 and essentially no cell values
  const hasValue = /<v>/.test(sheetXml) || /<is>/.test(sheetXml) || /<f>/.test(sheetXml);
  return !hasValue;
}

export async function validateXlsxZipStructure(
  buffer: Buffer,
  options?: { maxBytes?: number; requireDrawing?: boolean },
): Promise<XlsxStructuralIssue[]> {
  const maxBytes = options?.maxBytes ?? MAX_XLSX_TEMPLATE_BYTES;
  const { zip, issues } = await loadZip(buffer, maxBytes);
  if (issues.some((i) => i.code === "INVALID_ZIP" || i.code === "EMPTY")) {
    return issues;
  }

  for (const part of DTR_REQUIRED_PACKAGE_PARTS) {
    if (options?.requireDrawing === false && part.includes("drawing")) continue;
    if (!zip.file(part)) {
      issues.push({
        code: "MISSING_PART",
        message: `Missing required package part: ${part}`,
      });
    }
  }

  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!workbookXml || !relsXml) {
    issues.push({
      code: "MISSING_WORKBOOK",
      message: "Missing workbook or workbook relationships.",
    });
    return issues;
  }

  const sheetPath = resolveSheet1Path(workbookXml, relsXml);
  if (!sheetPath) {
    issues.push({
      code: "SHEET1_UNRESOLVED",
      message: "Could not resolve Sheet1 through workbook relationships.",
    });
  } else if (sheetPath !== DTR_WORKSHEET_PATH && !sheetPath.endsWith("sheet1.xml")) {
    issues.push({
      code: "SHEET1_PATH",
      message: `Unexpected Sheet1 path: ${sheetPath}`,
    });
  }

  const wbDoc = new DOMParser().parseFromString(workbookXml, "text/xml");
  const sheets = wbDoc.getElementsByTagName("sheet");
  if (sheets.length !== 3) {
    issues.push({
      code: "SHEET_COUNT",
      message: `Expected 3 sheets, found ${sheets.length}.`,
    });
  }

  const sheet2 = await zip.file("xl/worksheets/sheet2.xml")?.async("string");
  const sheet3 = await zip.file("xl/worksheets/sheet3.xml")?.async("string");
  if (sheet2 && !sheetIsBlank(sheet2)) {
    issues.push({ code: "SHEET2_NOT_BLANK", message: "Sheet2 is not blank." });
  }
  if (sheet3 && !sheetIsBlank(sheet3)) {
    issues.push({ code: "SHEET3_NOT_BLANK", message: "Sheet3 is not blank." });
  }

  const sheet1 =
    (await zip.file(DTR_WORKSHEET_PATH)?.async("string")) ??
    (sheetPath ? await zip.file(sheetPath)?.async("string") : undefined);
  if (!sheet1) {
    issues.push({ code: "MISSING_SHEET1", message: "Sheet1 worksheet XML missing." });
    return issues;
  }

  // Page setup
  if (!sheet1.includes(`paperSize="${DTR_PAGE_SETUP.paperSize}"`)) {
    issues.push({ code: "PAGE_SIZE", message: "Legal paperSize 14 missing." });
  }
  if (!sheet1.includes(`orientation="${DTR_PAGE_SETUP.orientation}"`)) {
    issues.push({ code: "ORIENTATION", message: "Landscape orientation missing." });
  }
  if (!sheet1.includes(`scale="${DTR_PAGE_SETUP.scale}"`)) {
    issues.push({ code: "SCALE", message: "Scale 73 missing." });
  }
  if (!sheet1.includes(`horizontalCentered="${DTR_PAGE_SETUP.horizontalCentered}"`)) {
    issues.push({
      code: "CENTERING",
      message: "Horizontal centering missing.",
    });
  }
  for (const side of ["left", "right", "top", "bottom"] as const) {
    if (!sheet1.includes(`${side}="${DTR_PAGE_SETUP.margin}"`)) {
      issues.push({
        code: "MARGINS",
        message: `Margin ${side}=0.25 missing.`,
      });
      break;
    }
  }

  // Merges
  const merges = listMergeRanges(sheet1);
  if (merges.length !== DTR_MERGE_RANGES.length) {
    issues.push({
      code: "MERGE_COUNT",
      message: `Expected ${DTR_MERGE_RANGES.length} merges, found ${merges.length}.`,
    });
  } else {
    const expected = [...DTR_MERGE_RANGES].sort().join("|");
    const actual = [...merges].sort().join("|");
    if (expected !== actual) {
      issues.push({
        code: "MERGE_RANGES",
        message: "Merge ranges do not match the audited contract.",
      });
    }
  }

  // Formulas
  for (const total of Object.values(DTR_TOTAL_FORMULAS)) {
    const f = readCellFormula(sheet1, total.cell);
    if ((f ?? "").replace(/^=/, "") !== total.formula) {
      issues.push({
        code: "FORMULA",
        message: `${total.cell} must retain ${total.formula}.`,
      });
    }
  }

  for (const mirror of Object.values(DTR_MIRROR_FORMULAS)) {
    const f = readCellFormula(sheet1, mirror.cell);
    if ((f ?? "").replace(/^=/, "") !== mirror.formula) {
      issues.push({
        code: "MIRROR_FORMULA",
        message: `${mirror.cell} must retain formula ${mirror.formula}.`,
      });
    }
  }

  // Printer settings part referenced
  if (!zip.file("xl/printerSettings/printerSettings1.bin")) {
    issues.push({
      code: "PRINTER_SETTINGS",
      message: "Printer settings part missing.",
    });
  }

  const sheetRels = await zip
    .file("xl/worksheets/_rels/sheet1.xml.rels")
    ?.async("string");
  if (sheetRels) {
    if (!sheetRels.includes("drawing1.xml") && !sheetRels.includes("drawings/drawing")) {
      issues.push({
        code: "DRAWING_REL",
        message: "Sheet1 drawing relationship missing.",
      });
    }
    if (!sheetRels.includes("vmlDrawing")) {
      issues.push({
        code: "VML_REL",
        message: "Sheet1 VML relationship missing.",
      });
    }
  }

  return issues;
}

export async function validateGeneratedDtrXlsx(
  buffer: Buffer,
  expected: {
    employeeName: string;
    periodLabel: string;
    /** Style IDs captured from runtime template for key owned cells. */
    styleIds?: Record<string, string | null>;
  },
  options?: { maxBytes?: number },
): Promise<XlsxStructuralIssue[]> {
  const maxBytes = options?.maxBytes ?? MAX_XLSX_OUTPUT_BYTES;
  const issues = await validateXlsxZipStructure(buffer, {
    maxBytes,
    requireDrawing: true,
  });
  if (issues.some((i) => i.code === "INVALID_ZIP" || i.code === "EMPTY")) {
    return issues;
  }

  const zip = await JSZip.loadAsync(buffer);
  const sheet1 = await zip.file(DTR_WORKSHEET_PATH)!.async("string");
  const sharedXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  const shared = sharedXml ? parseSharedStringsXml(sharedXml) : [];

  const leftName = readCellLogicalValue(sheet1, "A6", shared);
  if (String(leftName ?? "").toUpperCase() !== expected.employeeName.toUpperCase()) {
    issues.push({
      code: "EMPLOYEE",
      message: "Generated employee name mismatch.",
    });
  }
  const leftPeriod = readCellLogicalValue(sheet1, "D8", shared);
  if (String(leftPeriod ?? "") !== expected.periodLabel) {
    issues.push({
      code: "PERIOD",
      message: "Generated period label mismatch.",
    });
  }

  // No stale sample identity when payload differs
  const sheetPlain = sheet1;
  if (
    expected.employeeName.toUpperCase() !== DTR_SAMPLE_EMPLOYEE &&
    sheetPlain.includes(DTR_SAMPLE_EMPLOYEE)
  ) {
    issues.push({
      code: "SAMPLE_LEAK",
      message: "Stale sample employee name remains in worksheet.",
    });
  }
  if (
    expected.periodLabel !== DTR_SAMPLE_PERIOD &&
    sheetPlain.includes(`>${DTR_SAMPLE_PERIOD}<`)
  ) {
    issues.push({
      code: "SAMPLE_LEAK",
      message: "Stale sample period remains in worksheet.",
    });
  }

  if (expected.styleIds) {
    for (const [ref, expectedStyle] of Object.entries(expected.styleIds)) {
      if (expectedStyle == null) continue;
      const actual = readCellStyleId(sheet1, ref);
      if (actual !== expectedStyle) {
        issues.push({
          code: "STYLE_ID",
          message: `Style ID changed on ${ref}.`,
        });
      }
    }
  }

  return issues;
}

export function assertNoXlsxStructuralIssues(issues: XlsxStructuralIssue[]): void {
  if (issues.length === 0) return;
  throw new ExportError(
    "XLSX_GENERATION_FAILED",
    "Generated XLSX failed structural validation.",
  );
}

export type { ZipSafetyIssue };
