"use server";

import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { hasDatabaseUrl } from "@/lib/env";
import { toSafeErrorMessage } from "@/lib/reports/errors";
import {
  copyPreviousWorkdaySchema,
  dailyEntryUpdateSchema,
  reportPeriodCreateSchema,
} from "@/lib/validation/reports";
import { DailyEntryService } from "@/server/services/daily-entry-service";
import { ReportPeriodService } from "@/server/services/report-period-service";

export type ReportActionState = {
  error?: string;
  success?: string;
  reportId?: string;
  created?: boolean;
};

export type EntrySaveResult = {
  ok: boolean;
  error?: string;
  savedAt?: string;
  entry?: unknown;
  reportStatus?: string;
  validationReady?: boolean;
  validation?: {
    ready: boolean;
    errors: {
      code: string;
      severity: "error" | "warning" | "info";
      message: string;
      workDate?: string;
      entryId?: string;
    }[];
    warnings: {
      code: string;
      severity: "error" | "warning" | "info";
      message: string;
      workDate?: string;
      entryId?: string;
    }[];
    infos: {
      code: string;
      severity: "error" | "warning" | "info";
      message: string;
      workDate?: string;
      entryId?: string;
    }[];
    incompleteCount: number;
    invalidCount: number;
    totalWorkedMinutes: number;
  };
  revision?: number;
};

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function rejectClientUserId(formData: FormData): string | undefined {
  for (const key of ["userId", "user_id", "ownerId", "owner_id"]) {
    const value = formData.get(key);
    if (value !== null && value !== undefined && `${value}`.length > 0) {
      return `${value}`;
    }
  }
  return undefined;
}

async function requireUser() {
  try {
    return await requireAuthenticatedUser();
  } catch {
    redirect("/sign-in");
  }
}

export async function createReportAction(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  if (!hasDatabaseUrl()) {
    return { error: "Database is not configured." };
  }
  const user = await requireUser();

  const parsed = reportPeriodCreateSchema.safeParse({
    year: Number(formString(formData, "year")),
    month: Number(formString(formData, "month")),
    periodKind: formString(formData, "periodKind"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid period." };
  }

  try {
    const result = await ReportPeriodService.create(
      user.id,
      parsed.data,
      rejectClientUserId(formData),
    );
    redirect(`/app/reports/${result.report.id}/edit`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    return {
      error: toSafeErrorMessage(error, "Could not create the report."),
    };
  }
}

export async function finalizeReportAction(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  if (!hasDatabaseUrl()) return { error: "Database is not configured." };
  const user = await requireUser();
  const reportId = formString(formData, "reportId");
  try {
    await ReportPeriodService.finalize(user.id, reportId);
    return { success: "Report finalized.", reportId };
  } catch (error) {
    return { error: toSafeErrorMessage(error, "Could not finalize the report.") };
  }
}

export async function reopenReportAction(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  if (!hasDatabaseUrl()) return { error: "Database is not configured." };
  const user = await requireUser();
  const reportId = formString(formData, "reportId");
  const confirmed = formString(formData, "confirm") === "yes";
  if (!confirmed) {
    return { error: "Reopen requires deliberate confirmation." };
  }
  try {
    await ReportPeriodService.reopen(user.id, reportId);
    return { success: "Report reopened for editing.", reportId };
  } catch (error) {
    return { error: toSafeErrorMessage(error, "Could not reopen the report.") };
  }
}

export async function refreshSnapshotsAction(
  _prev: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  if (!hasDatabaseUrl()) return { error: "Database is not configured." };
  const user = await requireUser();
  const reportId = formString(formData, "reportId");
  const confirmed = formString(formData, "confirm") === "yes";
  if (!confirmed) {
    return { error: "Refresh requires confirmation." };
  }
  try {
    await ReportPeriodService.refreshSnapshots(
      user.id,
      reportId,
      rejectClientUserId(formData),
    );
    return { success: "Snapshots refreshed from current settings.", reportId };
  } catch (error) {
    return { error: toSafeErrorMessage(error, "Could not refresh snapshots.") };
  }
}

export async function saveDailyEntryAction(input: {
  reportId: string;
  entryId: string;
  revision?: number;
  payload: unknown;
  clientSuppliedOwnerId?: unknown;
}): Promise<EntrySaveResult> {
  if (!hasDatabaseUrl()) {
    return { ok: false, error: "Database is not configured.", revision: input.revision };
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    return { ok: false, error: "Authentication required.", revision: input.revision };
  }

  const parsed = dailyEntryUpdateSchema.safeParse(input.payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid entry.",
      revision: input.revision,
    };
  }

  try {
    const result = await DailyEntryService.save(
      user.id,
      input.reportId,
      input.entryId,
      parsed.data,
      input.clientSuppliedOwnerId,
    );
    return {
      ok: true,
      savedAt: result.savedAt,
      entry: result.entry,
      reportStatus: result.report.status,
      validationReady: result.validation.ready,
      validation: result.validation,
      revision: input.revision,
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, "Could not save the day."),
      revision: input.revision,
    };
  }
}

export async function clearDailyEntryAction(input: {
  reportId: string;
  entryId: string;
}): Promise<EntrySaveResult> {
  if (!hasDatabaseUrl()) return { ok: false, error: "Database is not configured." };
  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    return { ok: false, error: "Authentication required." };
  }
  try {
    const result = await DailyEntryService.clear(user.id, input.reportId, input.entryId);
    return {
      ok: true,
      savedAt: result.savedAt,
      entry: result.entry,
      reportStatus: result.report.status,
      validationReady: result.validation.ready,
      validation: result.validation,
    };
  } catch (error) {
    return { ok: false, error: toSafeErrorMessage(error, "Could not clear the day.") };
  }
}

export async function copyPreviousWorkdayAction(input: {
  reportId: string;
  entryId: string;
  includeUndertimeOverride?: boolean;
}): Promise<EntrySaveResult> {
  if (!hasDatabaseUrl()) return { ok: false, error: "Database is not configured." };
  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    return { ok: false, error: "Authentication required." };
  }
  const options = copyPreviousWorkdaySchema.parse({
    includeUndertimeOverride: input.includeUndertimeOverride ?? false,
  });
  try {
    const result = await DailyEntryService.copyPreviousWorkday(
      user.id,
      input.reportId,
      input.entryId,
      options,
    );
    return {
      ok: true,
      savedAt: result.savedAt,
      entry: result.entry,
      reportStatus: result.report.status,
      validationReady: result.validation.ready,
      validation: result.validation,
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, "Could not copy the previous workday."),
    };
  }
}
