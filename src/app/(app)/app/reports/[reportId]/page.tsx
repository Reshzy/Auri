import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { ExportHistoryList } from "@/features/exports/export-history-list";
import { GenerateFilesButton } from "@/features/exports/generate-files-button";
import { ReportStatusActions } from "@/features/reports/report-status-actions";
import { ValidationSummary } from "@/features/reports/validation-summary";
import { DatabaseUnavailable } from "@/components/ui/unavailable-state";
import { hasDatabaseUrl } from "@/lib/env";
import { formatPeriodKind, formatPeriodLabel, formatStatus } from "@/lib/reports/labels";
import { formatTotalHoursLabel } from "@/lib/reports/totals";
import { ExportHistoryService } from "@/server/services/export-history-service";
import { ReportPeriodService } from "@/server/services/report-period-service";

export const metadata: Metadata = {
  title: "Report",
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  if (!hasDatabaseUrl()) {
    return <DatabaseUnavailable />;
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/sign-in");
  }

  const { reportId } = await params;
  let loaded;
  try {
    loaded = await ReportPeriodService.get(user.id, reportId);
  } catch {
    notFound();
  }

  const validation = await ReportPeriodService.validateLoaded(
    user.id,
    loaded.report,
    loaded.entries,
  );
  const readOnly =
    loaded.report.status === "finalized" || loaded.report.status === "archived";
  const total = formatTotalHoursLabel(
    loaded.entries.reduce((sum, e) => sum + e.workedMinutes, 0),
  );
  const history = await ExportHistoryService.listForReport(user.id, reportId, {
    limit: 50,
  });

  return (
    <div className="motion-safe-fade-in space-y-6">
      <div className="space-y-2">
        <p className="text-auri-ink-muted text-sm">
          <Link href="/app/reports" className="hover:underline">
            Reports
          </Link>
        </p>
        <h2 className="text-auri-ink text-3xl font-semibold tracking-tight">
          {formatPeriodLabel(
            loaded.report.startDate,
            loaded.report.endDate,
            loaded.report.periodKind,
          )}
        </h2>
        <p className="text-auri-ink-muted text-sm">
          {formatPeriodKind(loaded.report.periodKind)} ·{" "}
          {formatStatus(loaded.report.status)} · {total}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/app/reports/${reportId}/edit`}>
            {readOnly ? "Open read-only editor" : "Continue editing"}
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/app/reports/${reportId}/preview`}>Preview</Link>
        </Button>
        <GenerateFilesButton reportId={reportId} />
      </div>

      <ReportStatusActions reportId={reportId} status={loaded.report.status} />

      <ValidationSummary reportId={reportId} validation={validation} />

      <section className="border-auri-border bg-auri-surface rounded-3xl border p-5">
        <h3 className="text-auri-ink mb-3 text-lg font-semibold">Days</h3>
        <ul className="divide-auri-border divide-y text-sm">
          {loaded.entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-auri-ink">
                {entry.workDate} · {entry.classification}
                {entry.classificationLabel ? ` (${entry.classificationLabel})` : ""}
              </span>
              <span className="text-auri-ink-muted">
                {entry.isComplete ? "Complete" : "Incomplete"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-auri-border bg-auri-surface rounded-3xl border p-5">
        <h3 className="text-auri-ink mb-3 text-lg font-semibold">Generated files</h3>
        <ExportHistoryList reportId={reportId} initialItems={history} />
      </section>
    </div>
  );
}
