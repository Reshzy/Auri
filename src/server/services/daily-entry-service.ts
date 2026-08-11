import "server-only";

import {
  clearOwnDailyEntry,
  copyPreviousWorkdayToEntry,
  getOwnDailyEntry,
  updateOwnDailyEntry,
} from "@/db/dal/daily-entries";
import type { DailyEntryUpdateInput } from "@/lib/validation/reports";
import { ReportPeriodService } from "@/server/services/report-period-service";

export class DailyEntryService {
  static async get(userId: string, reportId: string, entryId: string) {
    return getOwnDailyEntry(userId, reportId, entryId);
  }

  static async save(
    userId: string,
    reportId: string,
    entryId: string,
    update: DailyEntryUpdateInput,
    clientSuppliedOwnerId?: unknown,
  ) {
    const saved = await updateOwnDailyEntry(
      userId,
      reportId,
      entryId,
      update,
      clientSuppliedOwnerId,
    );
    const { report, validation } = await ReportPeriodService.syncReadiness(
      userId,
      reportId,
    );
    return {
      entry: saved.entry,
      report,
      validation,
      savedAt: saved.savedAt,
    };
  }

  static async clear(
    userId: string,
    reportId: string,
    entryId: string,
    clientSuppliedOwnerId?: unknown,
  ) {
    const saved = await clearOwnDailyEntry(
      userId,
      reportId,
      entryId,
      clientSuppliedOwnerId,
    );
    const { report, validation } = await ReportPeriodService.syncReadiness(
      userId,
      reportId,
    );
    return {
      entry: saved.entry,
      report,
      validation,
      savedAt: saved.savedAt,
    };
  }

  static async copyPreviousWorkday(
    userId: string,
    reportId: string,
    entryId: string,
    options: { includeUndertimeOverride: boolean },
    clientSuppliedOwnerId?: unknown,
  ) {
    const saved = await copyPreviousWorkdayToEntry(
      userId,
      reportId,
      entryId,
      options,
      clientSuppliedOwnerId,
    );
    const { report, validation } = await ReportPeriodService.syncReadiness(
      userId,
      reportId,
    );
    return {
      entry: saved.entry,
      report,
      validation,
      savedAt: saved.savedAt,
    };
  }
}
