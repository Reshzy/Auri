import "server-only";

import {
  applyOwnPresetsToDailyEntry,
  createOwnPreset,
  deactivateOwnPreset,
  listOwnActivePresets,
  seedStarterPresetsForUser,
  updateOwnPreset,
  type ApplyPresetsResult,
  type PresetRow,
  type SeedStartersResult,
} from "@/db/dal/presets";
import type { PresetInput } from "@/lib/validation/presets";
import { ReportPeriodService } from "@/server/services/report-period-service";

export class PresetService {
  static listActive(userId: string, query?: string) {
    return listOwnActivePresets(userId, { query });
  }

  static create(
    userId: string,
    input: PresetInput,
    clientSuppliedOwnerId?: unknown,
  ): Promise<PresetRow> {
    return createOwnPreset(userId, input, clientSuppliedOwnerId);
  }

  static update(
    userId: string,
    presetId: string,
    input: PresetInput,
    clientSuppliedOwnerId?: unknown,
  ): Promise<PresetRow> {
    return updateOwnPreset(userId, presetId, input, clientSuppliedOwnerId);
  }

  static deactivate(
    userId: string,
    presetId: string,
    clientSuppliedOwnerId?: unknown,
  ): Promise<PresetRow> {
    return deactivateOwnPreset(userId, presetId, clientSuppliedOwnerId);
  }

  static seedStarters(
    userId: string,
    clientSuppliedOwnerId?: unknown,
  ): Promise<SeedStartersResult> {
    return seedStarterPresetsForUser(userId, clientSuppliedOwnerId);
  }

  static async applyToDailyEntry(
    userId: string,
    reportId: string,
    entryId: string,
    presetIds: string[],
    clientSuppliedOwnerId?: unknown,
  ): Promise<
    ApplyPresetsResult & {
      validation: Awaited<
        ReturnType<typeof ReportPeriodService.syncReadiness>
      >["validation"];
      reportStatus: string;
    }
  > {
    const applied = await applyOwnPresetsToDailyEntry(
      userId,
      reportId,
      entryId,
      presetIds,
      clientSuppliedOwnerId,
    );
    const { report, validation } = await ReportPeriodService.syncReadiness(
      userId,
      reportId,
    );
    return {
      ...applied,
      report,
      validation,
      reportStatus: report.status,
    };
  }
}
