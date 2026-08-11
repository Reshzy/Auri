import "server-only";

import { createHash } from "node:crypto";
import JSZip from "jszip";
import { ExportError } from "@/lib/exports/errors";
import { buildDtrFilename } from "@/lib/exports/filename";
import { DTR_OWNED_LEFT, DTR_WORKSHEET_PATH } from "@/lib/templates/dtr-cell-map";
import {
  ReportMappingService,
  type MappingReportInput,
} from "@/server/services/report-mapping-service";
import {
  applyDtrCellMap,
  validateDualCopyLogicalEquality,
} from "@/server/services/xlsx-dual-copy";
import { buildDtrCellMap } from "@/server/services/xlsx-payload-map";
import { readCellStyleId } from "@/server/services/xlsx-ooxml";
import {
  assertNoXlsxStructuralIssues,
  validateGeneratedDtrXlsx,
} from "@/server/services/xlsx-structural";
import { TemplateService } from "@/server/services/template-service";
import { formatDtrEmployeeName } from "@/lib/reports/dtr-format";
import { MAX_XLSX_OUTPUT_BYTES } from "@/server/services/xlsx-zip-safety";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type XlsxExportResult = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  sha256: string;
  sourceRevision: string;
  templateVersionId: string | null;
  templateSha256: string;
  fileSizeBytes: number;
};

async function patchWorkbook(templateBuffer: Buffer, sheetXml: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuffer);
  const originalEntries = new Map<string, Uint8Array>();
  for (const name of Object.keys(zip.files)) {
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    originalEntries.set(name, await entry.async("uint8array"));
  }

  zip.file(DTR_WORKSHEET_PATH, sheetXml);

  // Restore untouched entries byte-for-byte at decompressed level
  for (const [name, bytes] of originalEntries) {
    if (name === DTR_WORKSHEET_PATH) continue;
    zip.file(name, bytes);
  }

  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return Buffer.from(out);
}

export async function generateDtrXlsx(
  input: MappingReportInput,
  options?: { allowLocalTemplateFallback?: boolean },
): Promise<XlsxExportResult> {
  const correlationBase = crypto.randomUUID();
  try {
    const payload = ReportMappingService.buildPayload(input);
    const loaded = await TemplateService.loadDtrTemplateBytes({
      allowLocalFallback: options?.allowLocalTemplateFallback ?? true,
    });

    const sourceRevision = ReportMappingService.sourceRevision(payload, [loaded.sha256]);

    const zip = await JSZip.loadAsync(loaded.buffer);
    const sheetFile = zip.file(DTR_WORKSHEET_PATH);
    if (!sheetFile) {
      throw new ExportError("TEMPLATE_INVALID", "DTR template is missing Sheet1.");
    }
    let sheetXml = await sheetFile.async("string");

    const styleIds: Record<string, string | null> = {
      [DTR_OWNED_LEFT.employeeName]: readCellStyleId(
        sheetXml,
        DTR_OWNED_LEFT.employeeName,
      ),
      [DTR_OWNED_LEFT.periodLabel]: readCellStyleId(sheetXml, DTR_OWNED_LEFT.periodLabel),
      F14: readCellStyleId(sheetXml, "F14"),
      G14: readCellStyleId(sheetXml, "G14"),
      B14: readCellStyleId(sheetXml, "B14"),
    };

    const cellMap = buildDtrCellMap(payload);
    sheetXml = applyDtrCellMap(sheetXml, cellMap);

    const dualIssues = validateDualCopyLogicalEquality(sheetXml, {
      employeeName: payload.employee.name,
      periodLabel: payload.period.dtrLabel,
    });
    if (dualIssues.length > 0) {
      throw new ExportError(
        "XLSX_GENERATION_FAILED",
        "DTR dual-copy logical validation failed.",
      );
    }

    const buffer = await patchWorkbook(loaded.buffer, sheetXml);
    if (buffer.byteLength > MAX_XLSX_OUTPUT_BYTES) {
      throw new ExportError(
        "XLSX_GENERATION_FAILED",
        "Generated XLSX exceeds size limit.",
      );
    }

    const issues = await validateGeneratedDtrXlsx(
      buffer,
      {
        employeeName: formatDtrEmployeeName(payload.employee.name),
        periodLabel: payload.period.dtrLabel,
        styleIds,
      },
      { maxBytes: MAX_XLSX_OUTPUT_BYTES },
    );
    assertNoXlsxStructuralIssues(issues);

    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const fileName = buildDtrFilename({
      employeeName: payload.employee.name,
      startDate: payload.period.startDate,
      endDate: payload.period.endDate,
    });

    return {
      buffer,
      fileName,
      mimeType: XLSX_MIME,
      sha256,
      sourceRevision,
      templateVersionId: loaded.template?.id ?? null,
      templateSha256: loaded.sha256,
      fileSizeBytes: buffer.byteLength,
    };
  } catch (error) {
    if (error instanceof ExportError) {
      throw error;
    }
    throw new ExportError("XLSX_GENERATION_FAILED", "XLSX generation failed.", {
      correlationId: correlationBase,
      cause: error,
    });
  }
}

export const XlsxExportService = {
  generateDtrXlsx,
  mimeType: XLSX_MIME,
};
