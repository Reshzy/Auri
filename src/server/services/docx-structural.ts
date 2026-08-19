import PizZip from "pizzip";
import { allRequiredTokens, tag } from "@/lib/templates/accomplishment-tokens";
import { ExportError } from "@/lib/exports/errors";

const UNSAFE_ENTRY = /(^|\/)\.\.(\/|$)/;

export type DocxStructuralIssue = {
  code: string;
  message: string;
};

export function validateDocxZipStructure(
  buffer: Buffer,
  options?: { maxBytes?: number },
): DocxStructuralIssue[] {
  const issues: DocxStructuralIssue[] = [];
  const maxBytes = options?.maxBytes ?? 15 * 1024 * 1024;
  if (buffer.byteLength <= 0) {
    issues.push({ code: "EMPTY", message: "DOCX buffer is empty." });
    return issues;
  }
  if (buffer.byteLength > maxBytes) {
    issues.push({
      code: "TOO_LARGE",
      message: `DOCX exceeds maximum size of ${maxBytes} bytes.`,
    });
  }

  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    issues.push({ code: "INVALID_ZIP", message: "Not a valid ZIP/DOCX package." });
    return issues;
  }

  for (const name of Object.keys(zip.files)) {
    if (UNSAFE_ENTRY.test(name) || name.startsWith("/") || name.includes("\\")) {
      issues.push({
        code: "ZIP_SLIP",
        message: "Unsafe ZIP entry name detected.",
      });
      break;
    }
  }

  if (!zip.file("[Content_Types].xml")) {
    issues.push({
      code: "MISSING_CONTENT_TYPES",
      message: "Missing [Content_Types].xml.",
    });
  }
  if (!zip.file("word/document.xml")) {
    issues.push({
      code: "MISSING_DOCUMENT",
      message: "Missing word/document.xml.",
    });
  }

  return issues;
}

export function validateGeneratedAccomplishmentDocx(
  buffer: Buffer,
  tokens: Record<string, string>,
  options?: { maxBytes?: number },
): DocxStructuralIssue[] {
  const issues = validateDocxZipStructure(buffer, options);
  if (issues.some((i) => i.code === "INVALID_ZIP")) {
    return issues;
  }

  const zip = new PizZip(buffer);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  const plain = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");

  for (const tokenName of allRequiredTokens()) {
    if (!(tokenName in tokens)) {
      issues.push({
        code: "TOKEN_MISSING_INPUT",
        message: `Required token ${tokenName} was not supplied.`,
      });
    }
    if (xml.includes(tag(tokenName)) || plain.includes(tag(tokenName))) {
      issues.push({
        code: "UNRESOLVED_TOKEN",
        message: `Unresolved template token ${tag(tokenName)}.`,
      });
    }
  }

  const unresolved = plain.match(/\{[a-z0-9_]+\}/gi) ?? [];
  for (const leftover of unresolved) {
    issues.push({
      code: "UNRESOLVED_TOKEN",
      message: `Unresolved template token ${leftover}.`,
    });
  }

  if (!tokens.employee_name?.trim()) {
    issues.push({ code: "EMPLOYEE_MISSING", message: "Employee name is missing." });
  }
  if (!tokens.period_label?.trim()) {
    issues.push({ code: "PERIOD_MISSING", message: "Period label is missing." });
  }
  if (!tokens.certification_text?.trim()) {
    issues.push({
      code: "CERTIFICATION_MISSING",
      message: "Certification text is missing.",
    });
  }
  if (!tokens.total_hours_label?.trim()) {
    issues.push({ code: "TOTAL_MISSING", message: "Total hours label is missing." });
  }

  for (const key of [
    "signatory_employee_name",
    "signatory_1_name",
    "signatory_2_name",
    "signatory_3_name",
  ] as const) {
    if (!tokens[key]?.trim()) {
      issues.push({
        code: "SIGNATORY_MISSING",
        message: `Signatory value ${key} is missing.`,
      });
    }
  }

  const titleHits = (plain.match(/ACCOMPLISHMENT REPORT/g) || []).length;
  if (titleHits !== 1) {
    issues.push({
      code: "TITLE_COUNT",
      message: `Expected exactly one accomplishment report title, found ${titleHits}.`,
    });
  }

  for (let i = 1; i <= 16; i += 1) {
    const nn = String(i).padStart(2, "0");
    // Row presence is guaranteed by token supply; ensure date key exists in map
    if (!(`r${nn}_date` in tokens)) {
      issues.push({
        code: "ROW_MISSING",
        message: `Row ${nn} tokens are missing.`,
      });
    }
  }

  // Flag leftover template sample text only when it was not supplied by the payload.
  // Real reports may reuse the source office's sample employee/accomplishment wording.
  for (const sample of [
    "RODGE ANDRU P. VILORIA",
    "JOEL A. PUZON",
    "LANI P. LANGAMAN",
    "ASSISTS VISITORS AT THE OFFICE OF THE VICE MAYOR",
  ]) {
    if (!plain.includes(sample)) continue;
    const suppliedByTokens = Object.values(tokens).some((value) =>
      value.includes(sample),
    );
    if (!suppliedByTokens) {
      issues.push({
        code: "SAMPLE_LEAK",
        message: "Stale sample employee/report data remains in output.",
      });
      break;
    }
  }

  if (
    plain.includes("80HRS") &&
    tokens.total_hours_label !== "80HRS" &&
    tokens.total_hours_label !== "80 HRS"
  ) {
    issues.push({
      code: "SAMPLE_TOTAL",
      message: "Stale sample total 80HRS remains in output.",
    });
  }

  // XML-sensitive survival: escaped forms must exist in document.xml
  for (const [key, value] of Object.entries(tokens)) {
    if (!value) continue;
    if (/[&<>"]/.test(value)) {
      const escaped = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      if (!xml.includes(escaped) && !plain.includes(value)) {
        issues.push({
          code: "XML_ESCAPE",
          message: `XML-sensitive value for ${key} did not survive rendering.`,
        });
      }
    }
  }

  return issues;
}

export function assertNoStructuralIssues(issues: DocxStructuralIssue[]): void {
  if (issues.length === 0) return;
  throw new ExportError(
    "DOCX_GENERATION_FAILED",
    "Generated DOCX failed structural validation.",
  );
}
