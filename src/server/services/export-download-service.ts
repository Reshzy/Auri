import "server-only";

import { getOwnExport, type ReportExportRow } from "@/db/dal/exports";
import { ExportError } from "@/lib/exports/errors";
import { mimeTypeForFormat, type ExportFormat } from "@/lib/exports/mime";
import { assertStoragePathOwnership } from "@/lib/exports/storage-path";
import { ExportPersistenceService } from "@/server/services/export-persistence-service";
import type { GeneratedStorage } from "@/server/storage/generated-reports-storage";

export class ExportDownloadService {
  static async loadOwnedFile(
    userId: string,
    exportId: string,
    options?: { storage?: GeneratedStorage },
  ): Promise<{
    row: ReportExportRow;
    bytes: Buffer;
    mimeType: string;
    fileName: string;
  }> {
    const row = await getOwnExport(userId, exportId);
    if (!row) {
      throw new ExportError("EXPORT_NOT_FOUND", "Export not found.");
    }

    try {
      assertStoragePathOwnership(row.storagePath, {
        ownerId: userId,
        reportPeriodId: row.reportPeriodId,
        exportId: row.id,
      });
    } catch {
      throw new ExportError(
        "EXPORT_INTEGRITY_FAILED",
        "Stored path failed ownership checks.",
      );
    }

    const verified = await ExportPersistenceService.verifyStoredObject(row, options);
    if (!verified.present || !verified.bytes) {
      throw new ExportError("EXPORT_INTEGRITY_FAILED", "Stored object is missing.");
    }
    if (!verified.matches) {
      throw new ExportError(
        "EXPORT_INTEGRITY_FAILED",
        "Stored object failed integrity checks.",
      );
    }

    return {
      row,
      bytes: verified.bytes,
      mimeType: mimeTypeForFormat(row.format as ExportFormat),
      fileName: row.fileName,
    };
  }
}
