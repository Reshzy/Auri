import "server-only";

import { createHash } from "node:crypto";
import JSZip from "jszip";
import { ExportError } from "@/lib/exports/errors";
import { buildReportPackageFilename } from "@/lib/exports/filenames";
import { ZIP_MIME, maxBytesForFormat } from "@/lib/exports/mime";
import { buildZipBundleManifest, type ZipBundleMember } from "@/lib/exports/zip-manifest";
import {
  assertZipCompressedSize,
  validateFlatZipEntryNames,
  validateGeneratedReportPackage,
} from "@/lib/exports/zip-safety";

export type ZipMemberSource = {
  exportId: string;
  fileName: string;
  buffer: Buffer;
  sha256: string;
  fileSizeBytes: number;
  templateVersionId: string;
  templateSha256: string;
};

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export class ZipExportService {
  static async packageReport(input: {
    employeeName: string;
    startDate: string;
    endDate: string;
    docx: ZipMemberSource;
    xlsx: ZipMemberSource;
  }): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    sha256: string;
    fileSizeBytes: number;
    bundleManifest: ReturnType<typeof buildZipBundleManifest>;
  }> {
    const docxName = input.docx.fileName;
    const xlsxName = input.xlsx.fileName;
    const nameIssues = validateFlatZipEntryNames([docxName, xlsxName]);
    if (nameIssues.length > 0) {
      throw new ExportError("ZIP_GENERATION_FAILED", "ZIP entry names are unsafe.");
    }

    const docxHash = sha256Hex(input.docx.buffer);
    const xlsxHash = sha256Hex(input.xlsx.buffer);
    if (docxHash !== input.docx.sha256 || xlsxHash !== input.xlsx.sha256) {
      throw new ExportError("EXPORT_INTEGRITY_FAILED", "ZIP member hash mismatch.");
    }
    if (
      input.docx.buffer.byteLength !== input.docx.fileSizeBytes ||
      input.xlsx.buffer.byteLength !== input.xlsx.fileSizeBytes
    ) {
      throw new ExportError("EXPORT_INTEGRITY_FAILED", "ZIP member size mismatch.");
    }

    const zip = new JSZip();
    zip.file(docxName, input.docx.buffer);
    zip.file(xlsxName, input.xlsx.buffer);
    const generated = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    const buffer = Buffer.from(generated);
    assertZipCompressedSize(buffer.byteLength);
    if (buffer.byteLength > maxBytesForFormat("zip")) {
      throw new ExportError("ZIP_GENERATION_FAILED", "ZIP exceeds size limit.");
    }

    const issues = await validateGeneratedReportPackage(buffer, {
      docx: {
        fileName: docxName,
        buffer: input.docx.buffer,
        sha256: input.docx.sha256,
      },
      xlsx: {
        fileName: xlsxName,
        buffer: input.xlsx.buffer,
        sha256: input.xlsx.sha256,
      },
    });
    if (issues.length > 0) {
      throw new ExportError("ZIP_GENERATION_FAILED", "ZIP failed structural validation.");
    }

    const docxMember: ZipBundleMember = {
      format: "docx",
      exportId: input.docx.exportId,
      fileName: docxName,
      sha256: input.docx.sha256,
      fileSizeBytes: input.docx.fileSizeBytes,
      templateVersionId: input.docx.templateVersionId,
      templateSha256: input.docx.templateSha256,
    };
    const xlsxMember: ZipBundleMember = {
      format: "xlsx",
      exportId: input.xlsx.exportId,
      fileName: xlsxName,
      sha256: input.xlsx.sha256,
      fileSizeBytes: input.xlsx.fileSizeBytes,
      templateVersionId: input.xlsx.templateVersionId,
      templateSha256: input.xlsx.templateSha256,
    };

    return {
      buffer,
      fileName: buildReportPackageFilename({
        employeeName: input.employeeName,
        startDate: input.startDate,
        endDate: input.endDate,
      }),
      mimeType: ZIP_MIME,
      sha256: sha256Hex(buffer),
      fileSizeBytes: buffer.byteLength,
      bundleManifest: buildZipBundleManifest({ docx: docxMember, xlsx: xlsxMember }),
    };
  }
}
