import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import {
  ACCOMPLISHMENT_MAX_ROWS,
  ACCOMPLISHMENT_RUNTIME_FILE,
  ACCOMPLISHMENT_SOURCE_FILE,
  ACCOMPLISHMENT_SOURCE_SHA256,
  ACCOMPLISHMENT_TEMPLATE_ID,
  allRequiredTokens,
  rowToken,
  tag,
} from "../src/lib/templates/accomplishment-tokens";

const ROOT = path.resolve(__dirname, "..");
const SOURCE_PATH = path.join(ROOT, "templates", "source", ACCOMPLISHMENT_SOURCE_FILE);
const RUNTIME_DIR = path.join(ROOT, "templates", "runtime");
const RUNTIME_PATH = path.join(RUNTIME_DIR, ACCOMPLISHMENT_RUNTIME_FILE);
const MANIFEST_PATH = path.join(
  ROOT,
  "templates",
  "manifests",
  `${ACCOMPLISHMENT_TEMPLATE_ID}.json`,
);

const CERTIFICATION_SAMPLE =
  "I HEREBY CERTIFY under penalty of perjury that the tasks accomplished as indicated in this Report are true and accurate report of the task accomplished for the day above written.";

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainText(xml: string): string {
  return [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
}

function splitBodyParts(body: string): string[] {
  const parts: string[] = [];
  const re =
    /<w:tbl[\s>][\s\S]*?<\/w:tbl>|<w:p[\s>][\s\S]*?<\/w:p>|<w:sectPr[\s>][\s\S]*?<\/w:sectPr>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    parts.push(m[0]);
  }
  return parts;
}

function setRunsText(xmlChunk: string, text: string): string {
  const runs = [...xmlChunk.matchAll(/<w:t([^>]*)>([^<]*)<\/w:t>/g)];
  if (runs.length === 0) {
    // Inject a minimal run before closing paragraph if possible
    if (xmlChunk.includes("</w:p>")) {
      return xmlChunk.replace(
        "</w:p>",
        `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`,
      );
    }
    return xmlChunk;
  }
  let first = true;
  return xmlChunk.replace(/<w:t([^>]*)>([^<]*)<\/w:t>/g, (_full, attrs: string) => {
    if (first) {
      first = false;
      const nextAttrs = /\bxml:space=/.test(attrs)
        ? attrs
        : `${attrs} xml:space="preserve"`;
      return `<w:t${nextAttrs}>${escapeXml(text)}</w:t>`;
    }
    return `<w:t${attrs}></w:t>`;
  });
}

function replaceExactTextNode(xmlChunk: string, from: string, to: string): string {
  const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(<w:t[^>]*>)${escapedFrom}(</w:t>)`, "g");
  return xmlChunk.replace(re, `$1${escapeXml(to)}$2`);
}

function replaceCellTexts(rowXml: string, values: string[]): string {
  const cells = [...rowXml.matchAll(/<w:tc[\s>][\s\S]*?<\/w:tc>/g)].map((m) => m[0]);
  if (cells.length < values.length) {
    throw new Error(`Expected at least ${values.length} cells, found ${cells.length}`);
  }
  let out = rowXml;
  for (let i = 0; i < values.length; i += 1) {
    const updated = setRunsText(cells[i]!, values[i]!);
    out = out.replace(cells[i]!, updated);
  }
  return out;
}

function tagDailyTable(tblXml: string): string {
  const rows = [...tblXml.matchAll(/<w:tr[\s>][\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
  if (rows.length !== 17) {
    throw new Error(`Expected 17 table rows (2 header + 15 days), found ${rows.length}`);
  }

  const header = rows.slice(0, 2);
  const dayRows = rows.slice(2);
  const taggedDays: string[] = [];

  for (let i = 0; i < dayRows.length; i += 1) {
    const n = i + 1;
    taggedDays.push(
      replaceCellTexts(dayRows[i]!, [
        tag(rowToken(n, "date")),
        tag(rowToken(n, "am")),
        tag(rowToken(n, "pm")),
        tag(rowToken(n, "time_spent")),
        tag(rowToken(n, "accomplishment")),
        tag(rowToken(n, "remarks")),
      ]),
    );
  }

  // Clone last structural row for day 16 (clear rsid noise is fine; reuse XML).
  const row16 = replaceCellTexts(dayRows[dayRows.length - 1]!, [
    tag(rowToken(16, "date")),
    tag(rowToken(16, "am")),
    tag(rowToken(16, "pm")),
    tag(rowToken(16, "time_spent")),
    tag(rowToken(16, "accomplishment")),
    tag(rowToken(16, "remarks")),
  ]);
  taggedDays.push(row16);

  let out = tblXml;
  // Replace from last day upward so indices stay stable for unique row strings
  for (let i = dayRows.length - 1; i >= 0; i -= 1) {
    out = out.replace(dayRows[i]!, taggedDays[i]!);
  }
  // Insert row 16 before </w:tbl>
  out = out.replace(/<\/w:tbl>/, `${taggedDays[15]}</w:tbl>`);
  // Keep headers unchanged
  void header;
  return out;
}

function tagSignatoryTable(tblXml: string): string {
  const rows = [...tblXml.matchAll(/<w:tr[\s>][\s\S]*?<\/w:tr>/g)].map((m) => m[0]);
  if (rows.length < 1) {
    throw new Error("Signatory table missing rows");
  }
  const row = rows[0]!;
  const cells = [...row.matchAll(/<w:tc[\s>][\s\S]*?<\/w:tc>/g)].map((m) => m[0]);
  if (cells.length !== 4) {
    throw new Error(`Expected 4 signatory columns, found ${cells.length}`);
  }

  const slotTokens = [
    ["signatory_employee_name", "signatory_employee_title"],
    ["signatory_1_name", "signatory_1_title"],
    ["signatory_2_name", "signatory_2_title"],
    ["signatory_3_name", "signatory_3_title"],
  ] as const;

  const updatedCells = cells.map((cell, idx) => {
    const [nameTok, titleTok] = slotTokens[idx]!;
    // Replace first non-empty text cluster with name, second with title when possible.
    const texts = [...cell.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
    if (texts.length === 0) {
      return setRunsText(cell, `${tag(nameTok)}\n${tag(titleTok)}`);
    }
    let nameSet = false;
    let titleSet = false;
    return cell.replace(
      /<w:t([^>]*)>([^<]*)<\/w:t>/g,
      (full, attrs: string, value: string) => {
        if (!value.trim()) {
          return full;
        }
        if (!nameSet) {
          nameSet = true;
          const nextAttrs = /\bxml:space=/.test(attrs)
            ? attrs
            : `${attrs} xml:space="preserve"`;
          return `<w:t${nextAttrs}>${escapeXml(tag(nameTok))}</w:t>`;
        }
        if (!titleSet) {
          titleSet = true;
          const nextAttrs = /\bxml:space=/.test(attrs)
            ? attrs
            : `${attrs} xml:space="preserve"`;
          return `<w:t${nextAttrs}>${escapeXml(tag(titleTok))}</w:t>`;
        }
        return `<w:t${attrs}></w:t>`;
      },
    );
  });

  let outRow = row;
  for (let i = 0; i < cells.length; i += 1) {
    outRow = outRow.replace(cells[i]!, updatedCells[i]!);
  }
  return tblXml.replace(row, outRow);
}

function tagHeaderParts(parts: string[]): string[] {
  const out = [...parts];

  // 0 municipality, 1 office, 2 department, 4 title
  out[0] = setRunsText(out[0]!, tag("municipality_name"));
  out[1] = setRunsText(out[1]!, tag("office_name"));
  out[2] = setRunsText(out[2]!, tag("department_name"));
  out[4] = setRunsText(out[4]!, tag("report_title"));

  // Name line: keep "Name:  " label, replace employee
  out[6] = replaceExactTextNode(out[6]!, "RODGE ANDRU P. VILORIA", tag("employee_name"));
  if (!out[6]!.includes(tag("employee_name"))) {
    out[6] = setRunsText(out[6]!, `Name:  ${tag("employee_name")}`);
  }

  // Period: replace period label sample
  out[7] = replaceExactTextNode(out[7]!, "August 1-15, 2026", tag("period_label"));
  if (!out[7]!.includes(tag("period_label"))) {
    // Period may be split across runs ("August" + " 1-15, 2026")
    out[7] = setRunsText(out[7]!, `Period Covered:  ${tag("period_label")}`);
  }

  // Certification
  out[11] = setRunsText(out[11]!, tag("certification_text"));

  // Total hours paragraph — replace sample total token
  out[13] = replaceExactTextNode(out[13]!, "80HRS", tag("total_hours_label"));
  if (!out[13]!.includes(tag("total_hours_label"))) {
    out[13] = out[13]!.replace(/80HRS|70\b/, escapeXml(tag("total_hours_label")));
  }
  if (!out[13]!.includes(tag("total_hours_label"))) {
    throw new Error("Failed to tag total_hours_label");
  }

  return out;
}

function assertNoSampleLeak(xml: string): void {
  const banned = [
    "RODGE ANDRU P. VILORIA",
    "JOEL A. PUZON",
    "LANI P. LANGAMAN",
    "80HRS",
    "August 1-15, 2026",
    "ASSISTS VISITORS AT THE OFFICE OF THE VICE MAYOR",
  ];
  for (const sample of banned) {
    if (xml.includes(sample)) {
      throw new Error(`Runtime template still contains sample text: ${sample}`);
    }
  }
  const titleCount = (xml.match(/\{report_title\}/g) || []).length;
  // report_title tag once; static title text should be gone
  if ((xml.match(/ACCOMPLISHMENT REPORT/g) || []).length > 0) {
    throw new Error(
      "Static ACCOMPLISHMENT REPORT title remains; expected {report_title} only",
    );
  }
  if (titleCount !== 1) {
    throw new Error(`Expected one {report_title} tag, found ${titleCount}`);
  }
}

function assertTokensPresent(xml: string): void {
  const required = allRequiredTokens(ACCOMPLISHMENT_MAX_ROWS);
  const missing = required.filter((token) => !xml.includes(tag(token)));
  if (missing.length > 0) {
    throw new Error(
      `Missing tokens in runtime template: ${missing.slice(0, 12).join(", ")}`,
    );
  }
}

function main() {
  if (!existsSync(SOURCE_PATH)) {
    throw new Error(`Missing source template: ${SOURCE_PATH}`);
  }

  const sourceBuf = readFileSync(SOURCE_PATH);
  const sourceHash = sha256(sourceBuf);
  if (sourceHash !== ACCOMPLISHMENT_SOURCE_SHA256) {
    throw new Error(
      `Source SHA-256 mismatch. Expected ${ACCOMPLISHMENT_SOURCE_SHA256}, got ${sourceHash}. Refusing to prepare.`,
    );
  }

  const zip = new PizZip(sourceBuf);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("Source DOCX missing word/document.xml");
  }
  const xml = docFile.asText();
  const bodyMatch = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) {
    throw new Error("Source DOCX missing w:body");
  }

  const parts = splitBodyParts(bodyMatch[1]!);
  if (parts.length < 43) {
    throw new Error(`Unexpected body part count ${parts.length}; expected ~43`);
  }

  // First report: parts 0..19; drop duplicate copy (20..41); keep sectPr
  const sect = parts.find((p) => p.startsWith("<w:sectPr"));
  if (!sect) {
    throw new Error("Missing sectPr");
  }

  let single = parts.slice(0, 20);
  single = tagHeaderParts(single);
  single[9] = tagDailyTable(single[9]!);
  single[19] = tagSignatoryTable(single[19]!);

  const newBody = `${single.join("")}${sect}`;
  const newXml = xml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${newBody}</w:body>`);

  assertNoSampleLeak(newXml);
  assertTokensPresent(newXml);

  if ((newXml.match(/ACCOMPLISHMENT REPORT/g) || []).length > 0) {
    throw new Error("Duplicate or static title still present");
  }
  if ((plainText(newXml).match(/\{report_title\}/g) || []).length !== 1) {
    throw new Error("Expected exactly one report title tag");
  }

  zip.file("word/document.xml", newXml);

  // Stabilize ZIP entry metadata so repeated prepares do not drift SHA-256.
  const fixedDate = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
  for (const entry of Object.values(zip.files)) {
    entry.date = fixedDate;
  }

  const runtimeBuf = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  }) as Buffer;

  mkdirSync(RUNTIME_DIR, { recursive: true });
  writeFileSync(RUNTIME_PATH, runtimeBuf);
  const runtimeHash = sha256(runtimeBuf);

  const requiredTokens = allRequiredTokens(ACCOMPLISHMENT_MAX_ROWS);
  const manifest = {
    id: ACCOMPLISHMENT_TEMPLATE_ID,
    templateKey: "accomplishment",
    type: "docx",
    version: 1,
    sourceFile: ACCOMPLISHMENT_SOURCE_FILE,
    runtimeFile: ACCOMPLISHMENT_RUNTIME_FILE,
    sourceSha256: sourceHash,
    runtimeSha256: runtimeHash,
    pageSize: "legal",
    orientation: "landscape",
    maxRows: ACCOMPLISHMENT_MAX_ROWS,
    requiredTokens,
    preparedAt: new Date().toISOString(),
    toolVersion: "auri-docx-prepare/1",
    active: false,
    notes:
      "Derived single-copy 16-row Docxtemplater runtime. Activate after structural checks and trusted upload.",
  };

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log("docx:prepare OK");
  console.log(`sourceSha256=${sourceHash}`);
  console.log(`runtimeSha256=${runtimeHash}`);
  console.log(`runtime=${path.relative(ROOT, RUNTIME_PATH)}`);
  console.log(`tokens=${requiredTokens.length}`);
  void CERTIFICATION_SAMPLE;
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`docx:prepare FAILED: ${message}`);
  process.exit(1);
}
