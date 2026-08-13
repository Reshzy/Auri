import "server-only";

import { deleteOwnExportRow, getOwnExport } from "@/db/dal/exports";
import { ExportError } from "@/lib/exports/errors";
import { assertStoragePathOwnership } from "@/lib/exports/storage-path";
import {
  getGeneratedStorage,
  type GeneratedStorage,
} from "@/server/storage/generated-reports-storage";

export class ExportDeletionService {
  static async deleteOwned(
    userId: string,
    exportId: string,
    options?: { storage?: GeneratedStorage },
  ): Promise<void> {
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
        "EXPORT_DELETE_FAILED",
        "Stored path failed ownership checks.",
      );
    }

    const storage = options?.storage ?? getGeneratedStorage();
    try {
      await storage.removeExact(row.storagePath);
    } catch (error) {
      if (error instanceof ExportError) throw error;
      throw new ExportError(
        "EXPORT_DELETE_FAILED",
        "Storage object could not be deleted.",
        {
          cause: error,
        },
      );
    }

    const removed = await deleteOwnExportRow(userId, exportId);
    if (!removed) {
      throw new ExportError(
        "EXPORT_DELETE_FAILED",
        "Export metadata could not be deleted.",
      );
    }
  }
}
