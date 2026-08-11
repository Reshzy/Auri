import "server-only";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { assertOwnerMatchesSession } from "@/db/dal/ownership";
import { ensureProfile, getOwnProfile } from "@/db/dal/profiles";
import {
  buildReportSnapshots,
  type ProfileSnapshot,
  type ScheduleSnapshot,
  type SignatorySnapshot,
} from "@/db/dal/snapshots";
import { dailyEntries, reportExports, reportPeriods } from "@/db/schema";
import { classifyDateFromSchedule } from "@/lib/reports/classify";
import { AppError } from "@/lib/reports/errors";
import { datesForPreset, periodRangeForPreset } from "@/lib/dates/period";
import type { WeekdayRules } from "@/lib/validation/onboarding";
import type { ReportPeriodCreateInput } from "@/lib/validation/reports";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUserId(userId: string): void {
  if (!UUID_RE.test(userId)) {
    throw new AppError("Invalid authenticated user id.", "VALIDATION");
  }
}

export type ReportPeriodRow = typeof reportPeriods.$inferSelect;
export type DailyEntryRow = typeof dailyEntries.$inferSelect;

export type ReportWithEntries = {
  report: ReportPeriodRow;
  entries: DailyEntryRow[];
  created: boolean;
};

function parseScheduleSnapshot(raw: unknown): ScheduleSnapshot {
  const snap = raw as ScheduleSnapshot;
  if (!snap?.weekdayRules) {
    throw new AppError("Schedule snapshot is missing weekday rules.", "PRECONDITION");
  }
  return snap;
}

export async function findActiveReportByRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<ReportPeriodRow | null> {
  assertUserId(userId);
  const db = getDb();
  const rows = await db
    .select()
    .from(reportPeriods)
    .where(
      and(
        eq(reportPeriods.userId, userId),
        eq(reportPeriods.startDate, startDate),
        eq(reportPeriods.endDate, endDate),
        ne(reportPeriods.status, "archived"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listOwnReports(userId: string): Promise<
  Array<{
    report: ReportPeriodRow;
    entries: DailyEntryRow[];
  }>
> {
  assertUserId(userId);
  const db = getDb();
  const reports = await db
    .select()
    .from(reportPeriods)
    .where(eq(reportPeriods.userId, userId))
    .orderBy(desc(reportPeriods.startDate), desc(reportPeriods.createdAt));

  const result = [];
  for (const report of reports) {
    const entries = await db
      .select()
      .from(dailyEntries)
      .where(
        and(eq(dailyEntries.reportPeriodId, report.id), eq(dailyEntries.userId, userId)),
      )
      .orderBy(asc(dailyEntries.workDate));
    result.push({ report, entries });
  }
  return result;
}

export async function getOwnReportWithEntries(
  userId: string,
  reportId: string,
): Promise<{ report: ReportPeriodRow; entries: DailyEntryRow[] } | null> {
  assertUserId(userId);
  const db = getDb();
  const reports = await db
    .select()
    .from(reportPeriods)
    .where(and(eq(reportPeriods.id, reportId), eq(reportPeriods.userId, userId)))
    .limit(1);
  const report = reports[0];
  if (!report) return null;

  const entries = await db
    .select()
    .from(dailyEntries)
    .where(
      and(eq(dailyEntries.reportPeriodId, reportId), eq(dailyEntries.userId, userId)),
    )
    .orderBy(asc(dailyEntries.workDate));

  return { report, entries };
}

function assertEditable(status: string): void {
  if (status === "finalized" || status === "archived") {
    throw new AppError(
      "This report is finalized or archived and cannot be edited.",
      "NOT_EDITABLE",
    );
  }
}

/**
 * Transactionally create a report period and every daily entry.
 * Idempotent for the same non-archived date range.
 */
export async function createOwnReportPeriod(
  userId: string,
  input: ReportPeriodCreateInput,
  clientSuppliedOwnerId?: unknown,
): Promise<ReportWithEntries> {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  await ensureProfile(userId);

  const profile = await getOwnProfile(userId);
  if (!profile?.onboardingCompletedAt) {
    throw new AppError("Complete onboarding before creating a report.", "PRECONDITION");
  }

  const { startDate, endDate } = periodRangeForPreset(
    input.year,
    input.month,
    input.periodKind,
  );

  const existing = await findActiveReportByRange(userId, startDate, endDate);
  if (existing) {
    const withEntries = await getOwnReportWithEntries(userId, existing.id);
    if (!withEntries) {
      throw new AppError("Existing report could not be loaded.", "NOT_FOUND");
    }
    return { ...withEntries, created: false };
  }

  const snapshots = await buildReportSnapshots(userId);
  if (!snapshots.scheduleSnapshot) {
    throw new AppError("An active work schedule is required.", "PRECONDITION");
  }
  if (snapshots.signatorySnapshot.filter((s) => s.isActive).length < 4) {
    throw new AppError("Four active signatories are required.", "PRECONDITION");
  }

  const dates = datesForPreset(input.year, input.month, input.periodKind);
  const rules = snapshots.scheduleSnapshot.weekdayRules as WeekdayRules;
  const db = getDb();

  try {
    return await db.transaction(async (tx) => {
      const insertedReports = await tx
        .insert(reportPeriods)
        .values({
          userId,
          periodKind: input.periodKind,
          startDate,
          endDate,
          status: "draft",
          scheduleSnapshot: snapshots.scheduleSnapshot,
          profileSnapshot: snapshots.profileSnapshot,
          signatorySnapshot: snapshots.signatorySnapshot,
        })
        .returning();

      const report = insertedReports[0];
      if (!report) {
        throw new AppError("Could not create report period.", "VALIDATION");
      }

      const entryValues = dates.map((workDate) => {
        const classified = classifyDateFromSchedule(workDate, rules);
        return {
          reportPeriodId: report.id,
          userId,
          workDate,
          classification: classified.classification,
          classificationLabel: classified.classificationLabel,
          workedMinutes: 0,
          calculatedUndertimeMinutes: 0,
          undertimeOverrideMinutes: null,
          accomplishments: [] as string[],
          remarks: null,
          isComplete: classified.isComplete,
        };
      });

      const entries = await tx.insert(dailyEntries).values(entryValues).returning();
      entries.sort((a, b) => a.workDate.localeCompare(b.workDate));

      if (entries.length !== dates.length) {
        throw new AppError("Failed to create all daily entries.", "VALIDATION");
      }

      return { report, entries, created: true };
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Unique race: another request created the same range
    const raced = await findActiveReportByRange(userId, startDate, endDate);
    if (raced) {
      const withEntries = await getOwnReportWithEntries(userId, raced.id);
      if (withEntries) return { ...withEntries, created: false };
    }
    throw new AppError("Could not create the report period.", "VALIDATION");
  }
}

export async function refreshOwnReportSnapshots(
  userId: string,
  reportId: string,
  clientSuppliedOwnerId?: unknown,
): Promise<ReportPeriodRow> {
  assertUserId(userId);
  assertOwnerMatchesSession(userId, clientSuppliedOwnerId);
  const loaded = await getOwnReportWithEntries(userId, reportId);
  if (!loaded) throw new AppError("Report not found.", "NOT_FOUND");
  if (loaded.report.status !== "draft" && loaded.report.status !== "ready") {
    throw new AppError(
      "Only draft or ready reports can refresh snapshots.",
      "NOT_EDITABLE",
    );
  }

  const snapshots = await buildReportSnapshots(userId);
  if (!snapshots.scheduleSnapshot) {
    throw new AppError("An active work schedule is required.", "PRECONDITION");
  }

  const now = new Date().toISOString();
  const db = getDb();
  const updated = await db
    .update(reportPeriods)
    .set({
      profileSnapshot: snapshots.profileSnapshot,
      scheduleSnapshot: snapshots.scheduleSnapshot,
      signatorySnapshot: snapshots.signatorySnapshot,
      snapshotsRefreshedAt: now,
      updatedAt: now,
    })
    .where(and(eq(reportPeriods.id, reportId), eq(reportPeriods.userId, userId)))
    .returning();

  if (!updated[0]) throw new AppError("Report not found.", "NOT_FOUND");
  return updated[0];
}

export async function updateOwnReportStatus(
  userId: string,
  reportId: string,
  status: "draft" | "ready" | "finalized" | "archived",
  options?: { finalizedAt?: string | null },
): Promise<ReportPeriodRow> {
  assertUserId(userId);
  const now = new Date().toISOString();
  const db = getDb();
  const updated = await db
    .update(reportPeriods)
    .set({
      status,
      finalizedAt: options?.finalizedAt === undefined ? undefined : options.finalizedAt,
      updatedAt: now,
    })
    .where(and(eq(reportPeriods.id, reportId), eq(reportPeriods.userId, userId)))
    .returning();
  if (!updated[0]) throw new AppError("Report not found.", "NOT_FOUND");
  return updated[0];
}

export async function invalidateOwnReportExports(
  userId: string,
  reportId: string,
): Promise<number> {
  assertUserId(userId);
  const db = getDb();
  const updated = await db
    .update(reportExports)
    .set({ isCurrent: false })
    .where(
      and(eq(reportExports.reportPeriodId, reportId), eq(reportExports.userId, userId)),
    )
    .returning({ id: reportExports.id });
  return updated.length;
}

export function getScheduleRulesFromReport(report: ReportPeriodRow): WeekdayRules {
  return parseScheduleSnapshot(report.scheduleSnapshot).weekdayRules;
}

export function getProfileSnapshot(report: ReportPeriodRow): ProfileSnapshot {
  return report.profileSnapshot as ProfileSnapshot;
}

export function getSignatorySnapshot(report: ReportPeriodRow): SignatorySnapshot[] {
  return report.signatorySnapshot as SignatorySnapshot[];
}

export { assertEditable, parseScheduleSnapshot };

/** Test helper: force a failing insert mid-transaction by throwing after period insert. */
export async function createOwnReportPeriodWithForcedEntryFailure(
  userId: string,
  input: ReportPeriodCreateInput,
): Promise<void> {
  assertUserId(userId);
  const { startDate, endDate } = periodRangeForPreset(
    input.year,
    input.month,
    input.periodKind,
  );
  const snapshots = await buildReportSnapshots(userId);
  if (!snapshots.scheduleSnapshot) {
    throw new AppError("An active work schedule is required.", "PRECONDITION");
  }
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.insert(reportPeriods).values({
      userId,
      periodKind: input.periodKind,
      startDate,
      endDate,
      status: "draft",
      scheduleSnapshot: snapshots.scheduleSnapshot,
      profileSnapshot: snapshots.profileSnapshot,
      signatorySnapshot: snapshots.signatorySnapshot,
    });
    throw new Error("FORCED_ENTRY_FAILURE");
  });
}

export async function countOwnReportsInRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  assertUserId(userId);
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reportPeriods)
    .where(
      and(
        eq(reportPeriods.userId, userId),
        eq(reportPeriods.startDate, startDate),
        eq(reportPeriods.endDate, endDate),
      ),
    );
  return rows[0]?.count ?? 0;
}
