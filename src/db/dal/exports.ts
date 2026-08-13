import "server-only";

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { reportExports } from "@/db/schema";
import { ExportError } from "@/lib/exports/errors";
import { EXPORT_RATE_LIMIT_WINDOW_MS, isRateLimited } from "@/lib/exports/rate-limit";
import { assertStoragePathOwnership } from "@/lib/exports/storage-path";
import type { ZipBundleManifest } from "@/lib/exports/zip-manifest";
import { AppError } from "@/lib/reports/errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ReportExportRow = typeof reportExports.$inferSelect;
export type ExportFormat = "docx" | "xlsx" | "zip";

export type InsertExportInput = {
  id: string;
  userId: string;
  reportPeriodId: string;
  templateVersionId: string | null;
  format: ExportFormat;
  storagePath: string;
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  sourceRevision: string;
  bundleManifest: ZipBundleManifest | null;
};

function assertUserId(userId: string): void {
  if (!UUID_RE.test(userId)) {
    throw new AppError("Invalid authenticated user id.", "VALIDATION");
  }
}

export async function invalidateOwnReportExports(
  userId: string,
  reportId: string,
): Promise<number> {
  assertUserId(userId);
  const db = getDb();
  return invalidateOwnReportExportsOn(db, userId, reportId);
}

export async function invalidateOwnReportExportsOn(
  executor: Pick<ReturnType<typeof getDb>, "update">,
  userId: string,
  reportId: string,
): Promise<number> {
  const updated = await executor
    .update(reportExports)
    .set({ isCurrent: false })
    .where(
      and(eq(reportExports.reportPeriodId, reportId), eq(reportExports.userId, userId)),
    )
    .returning({ id: reportExports.id });
  return updated.length;
}

export async function withReportExportLock<T>(
  userId: string,
  reportId: string,
  fn: (tx: ReturnType<typeof getDb>) => Promise<T>,
): Promise<T> {
  assertUserId(userId);
  const db = getDb();
  const key = `auri-export:${userId}:${reportId}`;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    return fn(tx as unknown as ReturnType<typeof getDb>);
  });
}

export async function countRecentExportsForUser(
  userId: string,
  windowMs = EXPORT_RATE_LIMIT_WINDOW_MS,
): Promise<number> {
  assertUserId(userId);
  const db = getDb();
  const since = new Date(Date.now() - windowMs).toISOString();
  const rows = await db
    .select({ id: reportExports.id })
    .from(reportExports)
    .where(and(eq(reportExports.userId, userId), gte(reportExports.createdAt, since)));
  return rows.length;
}

export async function assertUserExportRateLimit(userId: string): Promise<void> {
  const count = await countRecentExportsForUser(userId);
  if (isRateLimited(count)) {
    throw new ExportError(
      "EXPORT_RATE_LIMITED",
      "Too many generation requests. Try again shortly.",
    );
  }
}

export async function findCurrentExportForFormatOn(
  executor: Pick<ReturnType<typeof getDb>, "select">,
  input: {
    userId: string;
    reportPeriodId: string;
    format: ExportFormat;
  },
): Promise<ReportExportRow | null> {
  const rows = await executor
    .select()
    .from(reportExports)
    .where(
      and(
        eq(reportExports.userId, input.userId),
        eq(reportExports.reportPeriodId, input.reportPeriodId),
        eq(reportExports.format, input.format),
        eq(reportExports.isCurrent, true),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findCurrentExportForFormat(input: {
  userId: string;
  reportPeriodId: string;
  format: ExportFormat;
}): Promise<ReportExportRow | null> {
  return findCurrentExportForFormatOn(getDb(), input);
}

export async function insertPersistedExportOn(
  executor: Pick<ReturnType<typeof getDb>, "insert" | "update">,
  input: InsertExportInput,
): Promise<ReportExportRow> {
  assertUserId(input.userId);
  assertStoragePathOwnership(input.storagePath, {
    ownerId: input.userId,
    reportPeriodId: input.reportPeriodId,
    exportId: input.id,
  });

  await executor
    .update(reportExports)
    .set({ isCurrent: false })
    .where(
      and(
        eq(reportExports.userId, input.userId),
        eq(reportExports.reportPeriodId, input.reportPeriodId),
        eq(reportExports.format, input.format),
        eq(reportExports.isCurrent, true),
      ),
    );

  const inserted = await executor
    .insert(reportExports)
    .values({
      id: input.id,
      userId: input.userId,
      reportPeriodId: input.reportPeriodId,
      templateVersionId: input.templateVersionId,
      format: input.format,
      storagePath: input.storagePath,
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      sha256: input.sha256,
      sourceRevision: input.sourceRevision,
      isCurrent: true,
      bundleManifest: input.bundleManifest,
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    throw new ExportError(
      "EXPORT_STORAGE_FAILED",
      "Export metadata could not be stored.",
    );
  }
  return row;
}

export async function getOwnExport(
  userId: string,
  exportId: string,
): Promise<ReportExportRow | null> {
  assertUserId(userId);
  if (!UUID_RE.test(exportId)) return null;
  const db = getDb();
  const rows = await db
    .select()
    .from(reportExports)
    .where(and(eq(reportExports.id, exportId), eq(reportExports.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listOwnExportsForReport(
  userId: string,
  reportId: string,
  options?: { limit?: number; offset?: number },
): Promise<ReportExportRow[]> {
  assertUserId(userId);
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 50);
  const offset = Math.max(options?.offset ?? 0, 0);
  const db = getDb();
  return db
    .select()
    .from(reportExports)
    .where(
      and(eq(reportExports.userId, userId), eq(reportExports.reportPeriodId, reportId)),
    )
    .orderBy(desc(reportExports.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listOwnRecentExports(
  userId: string,
  options?: { limit?: number },
): Promise<ReportExportRow[]> {
  assertUserId(userId);
  const limit = Math.min(Math.max(options?.limit ?? 8, 1), 20);
  const db = getDb();
  return db
    .select()
    .from(reportExports)
    .where(eq(reportExports.userId, userId))
    .orderBy(desc(reportExports.createdAt))
    .limit(limit);
}

export async function deleteOwnExportRow(
  userId: string,
  exportId: string,
): Promise<boolean> {
  assertUserId(userId);
  const db = getDb();
  const deleted = await db
    .delete(reportExports)
    .where(and(eq(reportExports.id, exportId), eq(reportExports.userId, userId)))
    .returning({ id: reportExports.id });
  return deleted.length > 0;
}
