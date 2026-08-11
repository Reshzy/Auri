import "server-only";

import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { createHash } from "node:crypto";
import { ExportError } from "@/lib/exports/errors";
import { buildAccomplishmentFilename } from "@/lib/exports/filename";
import {
  ReportMappingService,
  type FlatTokenRecord,
  type MappingReportInput,
} from "@/server/services/report-mapping-service";
import {
  assertNoStructuralIssues,
  validateGeneratedAccomplishmentDocx,
} from "@/server/services/docx-structural";
import { TemplateService } from "@/server/services/template-service";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type DocxExportResult = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  sha256: string;
  sourceRevision: string;
  templateVersionId: string | null;
  templateSha256: string;
  fileSizeBytes: number;
};

function renderDocx(templateBuffer: Buffer, tokens: FlatTokenRecord): Buffer {
  try {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      // Strict: throw on missing/undefined tags
      nullGetter() {
        throw new Error("MISSING_TAG");
      },
    });
    doc.render(tokens);
    const out = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    }) as Buffer;
    return out;
  } catch (error) {
    throw new ExportError("DOCX_GENERATION_FAILED", "DOCX generation failed.", {
      cause: error,
    });
  }
}

export async function generateAccomplishmentDocx(
  input: MappingReportInput,
  options?: { allowLocalTemplateFallback?: boolean },
): Promise<DocxExportResult> {
  const correlationBase = crypto.randomUUID();
  try {
    const payload = ReportMappingService.buildPayload(input);
    const tokens = ReportMappingService.toFlatTokens(payload);

    const loaded = await TemplateService.loadAccomplishmentTemplateBytes({
      allowLocalFallback: options?.allowLocalTemplateFallback ?? true,
    });

    const sourceRevision = ReportMappingService.sourceRevision(payload, [loaded.sha256]);

    const buffer = renderDocx(loaded.buffer, tokens);
    const issues = validateGeneratedAccomplishmentDocx(buffer, tokens, {
      maxBytes: 15 * 1024 * 1024,
    });
    assertNoStructuralIssues(issues);

    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const fileName = buildAccomplishmentFilename({
      employeeName: payload.employee.name,
      startDate: payload.period.startDate,
      endDate: payload.period.endDate,
    });

    return {
      buffer,
      fileName,
      mimeType: DOCX_MIME,
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
    throw new ExportError("DOCX_GENERATION_FAILED", "DOCX generation failed.", {
      correlationId: correlationBase,
      cause: error,
    });
  }
}

export const DocxExportService = {
  generateAccomplishmentDocx,
  mimeType: DOCX_MIME,
};
