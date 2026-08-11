import "server-only";

import { and, desc, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { assertOwnerMatchesSession } from "@/db/dal/ownership";
import {
  assertEditable,
  getOwnReportWithEntries,
  getScheduleRulesFromReport,
  type DailyEntryRow,
  type ReportPeriodRow,
} from "@/db/dal/reports";
import { dailyEntries, reportPeriods } from "@/db/schema";
import { resetEntryFromSchedule } from "@/lib/reports/recalculate";
import { recalculateDailyEntry } from "@/lib/reports/recalculate";
import { AppError } from "@/lib/reports/errors";
import type { DailyEntryUpdateInput } from "@/lib/validation/reports";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUserId(userId: string): void {
  if (!UUID_RE.test(userId)) {
    throw new AppError("Invalid authenticated user id.", "VALIDATION");
  }
}

export async function getOwnDailyEntry(
  userId: string,
  reportId: string,
  entryId: string,
): Promise<{ report: ReportPeriodRow; entry: DailyEntryRow } | null> {
  assertUserId(userId);
  const loaded = await getOwnReportWithEntries(userId, reportId);
  if (!loaded) return null;
  const entry = loaded.entries.find((e) => e.id === entryId);
  if (!entry) return null;
  return { report: loaded.report, entry };
}

export async function updateOwnDailyEntry(
  userId: string,
  reportId: string,
  entryId: string,
  update: DailyEntryUpdateInput,
  clientSuppliedOwnerId?: unknown,
): Promise<{ report: ReportPeriodRow; entry: DailyEntryRow; savedAt: string }> {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);

  const loaded = await getOwnDailyEntry(userId, reportId, entryId);
  if (!loaded) throw new AppError("Daily entry not found.", "NOT_FOUND");
  assertEditable(loaded.report.status);

  const rules = getScheduleRulesFromReport(loaded.report);
  const recalculated = recalculateDailyEntry({
    workDate: loaded.entry.workDate,
    weekdayRules: rules,
    update,
  });

  if (recalculated.issues.length > 0) {
    throw new AppError(recalculated.issues[0]!.message, "VALIDATION");
  }

  const now = new Date().toISOString();
  const db = getDb();
  const updated = await db
    .update(dailyEntries)
    .set({
      classification: recalculated.classification,
      classificationLabel: recalculated.classificationLabel,
      amArrival: recalculated.amArrival,
      amDeparture: recalculated.amDeparture,
      pmArrival: recalculated.pmArrival,
      pmDeparture: recalculated.pmDeparture,
      workedMinutes: recalculated.workedMinutes,
      calculatedUndertimeMinutes: recalculated.calculatedUndertimeMinutes,
      undertimeOverrideMinutes: recalculated.undertimeOverrideMinutes,
      accomplishments: recalculated.accomplishments,
      remarks: recalculated.remarks,
      isComplete: recalculated.isComplete,
      updatedAt: now,
    })
    .where(
      and(
        eq(dailyEntries.id, entryId),
        eq(dailyEntries.reportPeriodId, reportId),
        eq(dailyEntries.userId, userId),
      ),
    )
    .returning();

  if (!updated[0]) throw new AppError("Daily entry not found.", "NOT_FOUND");

  await db
    .update(reportPeriods)
    .set({ updatedAt: now })
    .where(and(eq(reportPeriods.id, reportId), eq(reportPeriods.userId, userId)));

  const reportRows = await db
    .select()
    .from(reportPeriods)
    .where(and(eq(reportPeriods.id, reportId), eq(reportPeriods.userId, userId)))
    .limit(1);

  return { report: reportRows[0]!, entry: updated[0], savedAt: now };
}

export async function clearOwnDailyEntry(
  userId: string,
  reportId: string,
  entryId: string,
  clientSuppliedOwnerId?: unknown,
): Promise<{ report: ReportPeriodRow; entry: DailyEntryRow; savedAt: string }> {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  const loaded = await getOwnDailyEntry(userId, reportId, entryId);
  if (!loaded) throw new AppError("Daily entry not found.", "NOT_FOUND");
  assertEditable(loaded.report.status);

  const rules = getScheduleRulesFromReport(loaded.report);
  const blank = resetEntryFromSchedule(loaded.entry.workDate, rules);

  return updateOwnDailyEntry(
    userId,
    reportId,
    entryId,
    {
      classification: blank.classification,
      classificationLabel: blank.classificationLabel,
      amArrival: null,
      amDeparture: null,
      pmArrival: null,
      pmDeparture: null,
      undertimeOverrideMinutes: null,
      accomplishments: [],
      remarks: null,
    },
    clientSuppliedOwnerId,
  );
}

export async function copyPreviousWorkdayToEntry(
  userId: string,
  reportId: string,
  entryId: string,
  options: { includeUndertimeOverride: boolean },
  clientSuppliedOwnerId?: unknown,
): Promise<{ report: ReportPeriodRow; entry: DailyEntryRow; savedAt: string }> {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  const loaded = await getOwnDailyEntry(userId, reportId, entryId);
  if (!loaded) throw new AppError("Daily entry not found.", "NOT_FOUND");
  assertEditable(loaded.report.status);

  const db = getDb();
  const previous = await db
    .select()
    .from(dailyEntries)
    .where(
      and(
        eq(dailyEntries.reportPeriodId, reportId),
        eq(dailyEntries.userId, userId),
        eq(dailyEntries.classification, "workday"),
        lt(dailyEntries.workDate, loaded.entry.workDate),
      ),
    )
    .orderBy(desc(dailyEntries.workDate))
    .limit(1);

  const source = previous[0];
  if (!source) {
    throw new AppError("No earlier workday to copy in this report.", "PRECONDITION");
  }

  return updateOwnDailyEntry(
    userId,
    reportId,
    entryId,
    {
      classification: loaded.entry
        .classification as DailyEntryUpdateInput["classification"],
      classificationLabel: loaded.entry.classificationLabel,
      amArrival: source.amArrival,
      amDeparture: source.amDeparture,
      pmArrival: source.pmArrival,
      pmDeparture: source.pmDeparture,
      undertimeOverrideMinutes: options.includeUndertimeOverride
        ? source.undertimeOverrideMinutes
        : null,
      accomplishments: source.accomplishments ?? [],
      remarks: source.remarks,
    },
    clientSuppliedOwnerId,
  );
}
