import type { Metadata } from "next";
import Link from "next/link";
import { FirstVisitStagger } from "@/components/motion/first-visit-stagger";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DatabaseUnavailable } from "@/components/ui/unavailable-state";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { ExportFileRow } from "@/features/exports/export-file-row";
import { shouldShowDatabaseUnavailable } from "@/lib/auth/handle-page-error";
import {
  inferCurrentPeriodPreset,
  periodRangeForPreset,
  todayYmdManila,
} from "@/lib/dates/period";
import { hasDatabaseUrl } from "@/lib/env";
import {
  formatCompletionSummary,
  formatPeriodLabel,
  formatStatus,
} from "@/lib/reports/labels";
import { ExportHistoryService } from "@/server/services/export-history-service";
import { ReportPeriodService } from "@/server/services/report-period-service";

export const metadata: Metadata = {
  title: "Overview",
  description: "Continue the current half-month period or open a recent report.",
};

export default async function AppOverviewPage() {
  const today = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  if (!hasDatabaseUrl()) {
    return <DatabaseUnavailable />;
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch (error) {
    shouldShowDatabaseUnavailable(error);
    return <DatabaseUnavailable />;
  }

  const todayYmd = todayYmdManila();
  const preset = inferCurrentPeriodPreset(todayYmd);
  const range = periodRangeForPreset(preset.year, preset.month, preset.kind);
  const [recent, current, recentExports] = await Promise.all([
    ReportPeriodService.list(user.id, { limit: 5 }),
    ReportPeriodService.findActiveSummary(user.id, range.startDate, range.endDate),
    ExportHistoryService.listRecent(user.id, { limit: 8 }),
  ]);
  const periodLabel = formatPeriodLabel(range.startDate, range.endDate, preset.kind);
  const createLabel =
    preset.kind === "FIRST_HALF" ? "Create first-half report" : "Create second-half report";

  return (
    <FirstVisitStagger>
      <div className="space-y-8">
        <section className="space-y-2">
          <p className="text-auri-ink-muted text-sm">{today}</p>
          <h2 className="text-auri-ink text-3xl font-semibold tracking-tight">
            Good day. Ready when you are.
          </h2>
          <Link
            href="/app/presets"
            className="text-auri-ink-muted hover:text-auri-ink inline-flex min-h-11 items-center text-sm hover:underline"
          >
            Manage accomplishment presets
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div
            data-dashboard-card
            className="border-auri-border bg-auri-surface rounded-3xl border p-6"
          >
            <h3 className="text-auri-ink text-lg font-semibold">Current period</h3>
            {current ? (
              <>
                <p className="text-auri-ink mt-2 font-medium">
                  {formatPeriodLabel(
                    current.report.startDate,
                    current.report.endDate,
                    current.report.periodKind,
                  )}
                </p>
                <p className="text-auri-ink-muted mt-1 text-sm">
                  {formatStatus(current.report.status)}
                </p>
                <p className="text-auri-ink mt-2 text-sm tabular-nums">
                  {formatCompletionSummary(current)}
                </p>
                <div className="mt-5">
                  <Button asChild>
                    <Link
                      href={
                        current.report.status === "finalized"
                          ? `/app/reports/${current.report.id}`
                          : `/app/reports/${current.report.id}/edit`
                      }
                    >
                      {current.report.status === "finalized"
                        ? "View report"
                        : "Continue report"}
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-auri-ink-muted mt-2 text-sm">
                  No active report for {periodLabel} yet. You can pick a different
                  half-month on the next screen.
                </p>
                <div className="mt-5">
                  <Button asChild>
                    <Link href="/app/reports/new">{createLabel}</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
          <div
            data-dashboard-card
            className="border-auri-border bg-auri-surface rounded-3xl border p-6"
          >
            <h3 className="text-auri-ink text-lg font-semibold">Latest files</h3>
            {recentExports.length === 0 ? (
              <EmptyState
                className="mt-4 border-0 p-0"
                title="No files yet"
                description="Generated Word, Excel, and ZIP files will appear here after you use Generate."
              />
            ) : (
              <ul className="divide-auri-border mt-3 divide-y">
                {recentExports.map((item) => (
                  <ExportFileRow key={item.id} item={item} variant="plain" />
                ))}
              </ul>
            )}
          </div>
        </section>

        <section data-dashboard-card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-auri-ink text-lg font-semibold">Recent reports</h3>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/reports">View all</Link>
            </Button>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              title="No reports yet"
              description="Create a first-half or second-half period to start daily entries."
              action={
                <Button asChild>
                  <Link href="/app/reports/new">Create report</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {recent.map((item) => (
                <li key={item.report.id}>
                  <Link
                    href={
                      item.report.status === "finalized"
                        ? `/app/reports/${item.report.id}`
                        : `/app/reports/${item.report.id}/edit`
                    }
                    className="border-auri-border bg-auri-surface hover:bg-auri-orange-50/50 flex min-w-0 flex-col gap-1 rounded-2xl border px-4 py-3 text-sm transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-auri-ink font-medium">
                      {formatPeriodLabel(
                        item.report.startDate,
                        item.report.endDate,
                        item.report.periodKind,
                      )}
                    </span>
                    <span className="text-auri-ink-muted tabular-nums">
                      {formatStatus(item.report.status)} · Progress {item.progressLabel}
                      {item.incompleteOrInvalidCount > 0
                        ? ` · ${item.incompleteOrInvalidCount} missing/incomplete`
                        : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </FirstVisitStagger>
  );
}
