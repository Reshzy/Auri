import "server-only";

import { createHash } from "node:crypto";
import {
  insertPersistedExportOn,
  type InsertExportInput,
  type ReportExportRow,
} from "@/db/dal/exports";
import { getDb } from "@/db";
import { ExportError } from "@/lib/exports/errors";
import {
  filenameMatchesFormat,
  maxBytesForFormat,
  mimeTypeForFormat,
  type ExportFormat,
} from "@/lib/exports/mime";
import { buildGeneratedStoragePath } from "@/lib/exports/storage-path";
import type { ZipBundleManifest } from "@/lib/exports/zip-manifest";
import {
  getGeneratedStorage,
  logOrphanCompensationFailure,
  type GeneratedStorage,
} from "@/server/storage/generated-reports-storage";

export type PersistableGeneratedFile = {
  id: string;
  userId: string;
  reportPeriodId: string;
  format: ExportFormat;
  fileName: string;
  buffer: Buffer;
  sha256: string;
  sourceRevision: string;
  templateVersionId: string | null;
  bundleManifest: ZipBundleManifest | null;
};

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export class ExportPersistenceService {
  static buildStoragePath(file: PersistableGeneratedFile): string {
    return buildGeneratedStoragePath({
      ownerId: file.userId,
      reportPeriodId: file.reportPeriodId,
      exportId: file.id,
      fileName: file.fileName,
    });
  }

  static async persistGeneratedFile(
    file: PersistableGeneratedFile,
    options?: {
      storage?: GeneratedStorage;
      db?: Pick<ReturnType<typeof getDb>, "insert" | "update">;
    },
  ): Promise<ReportExportRow> {
    if (file.format === "zip") {
      if (file.templateVersionId !== null || !file.bundleManifest) {
        throw new ExportError(
          "EXPORT_INTEGRITY_FAILED",
          "ZIP exports require a bundle manifest and no template version id.",
        );
      }
    } else if (!file.templateVersionId || file.bundleManifest) {
      throw new ExportError(
        "EXPORT_INTEGRITY_FAILED",
        "DOCX and XLSX exports require an exact template version id.",
      );
    }

    const hash = sha256Hex(file.buffer);
    if (hash !== file.sha256) {
      throw new ExportError("EXPORT_INTEGRITY_FAILED", "Generated file hash mismatch.");
    }
    if (!filenameMatchesFormat(file.fileName, file.format)) {
      throw new ExportError("EXPORT_INTEGRITY_FAILED", "Filename extension mismatch.");
    }
    if (
      file.buffer.byteLength > maxBytesForFormat(file.format) ||
      file.buffer.byteLength <= 0
    ) {
      throw new ExportError("EXPORT_INTEGRITY_FAILED", "Generated file size is invalid.");
    }

    const storagePath = this.buildStoragePath(file);
    const storage = options?.storage ?? getGeneratedStorage();
    const contentType = mimeTypeForFormat(file.format);

    let uploaded = false;
    try {
      await storage.upload({
        path: storagePath,
        bytes: file.buffer,
        contentType,
        format: file.format,
        expectedSha256: file.sha256,
      });
      uploaded = true;
    } catch (error) {
      if (error instanceof ExportError) throw error;
      throw new ExportError(
        "EXPORT_STORAGE_FAILED",
        "Generated file could not be stored.",
        {
          cause: error,
        },
      );
    }

    const insertInput: InsertExportInput = {
      id: file.id,
      userId: file.userId,
      reportPeriodId: file.reportPeriodId,
      templateVersionId: file.templateVersionId,
      format: file.format,
      storagePath,
      fileName: file.fileName,
      fileSizeBytes: file.buffer.byteLength,
      sha256: file.sha256,
      sourceRevision: file.sourceRevision,
      bundleManifest: file.bundleManifest,
    };

    try {
      if (options?.db) {
        return await insertPersistedExportOn(options.db, insertInput);
      }
      return await getDb().transaction(async (tx) =>
        insertPersistedExportOn(tx, insertInput),
      );
    } catch (error) {
      if (uploaded) {
        try {
          await storage.removeExact(storagePath);
        } catch {
          logOrphanCompensationFailure(
            error instanceof ExportError ? error.correlationId : crypto.randomUUID(),
            storagePath,
          );
        }
      }
      if (error instanceof ExportError) throw error;
      throw new ExportError(
        "EXPORT_STORAGE_FAILED",
        "Export metadata could not be stored.",
        {
          cause: error,
        },
      );
    }
  }

  static async verifyStoredObject(
    row: ReportExportRow,
    options?: { storage?: GeneratedStorage },
  ): Promise<{ present: boolean; matches: boolean; bytes?: Buffer }> {
    const storage = options?.storage ?? getGeneratedStorage();
    if (!storage.isConfigured()) {
      return { present: false, matches: false };
    }
    const bytes = await storage.download(row.storagePath);
    if (!bytes) return { present: false, matches: false };
    const hash = sha256Hex(bytes);
    const matches = bytes.byteLength === row.fileSizeBytes && hash === row.sha256;
    return { present: true, matches, bytes };
  }
}

export const ExportPersistence = ExportPersistenceService;
