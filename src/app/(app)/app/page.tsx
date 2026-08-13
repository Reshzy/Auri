import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import {
  inferCurrentPeriodPreset,
  periodRangeForPreset,
  todayYmdManila,
} from "@/lib/dates/period";
import { hasDatabaseUrl } from "@/lib/env";
import { formatPeriodLabel, formatStatus } from "@/lib/reports/labels";
import { ExportHistoryService } from "@/server/services/export-history-service";
import { ReportPeriodService } from "@/server/services/report-period-service";
import { findActiveReportByRange } from "@/db/dal/reports";

export default async function AppOverviewPage() {
  const today = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  if (!hasDatabaseUrl()) {
    return (
      <div className="space-y-3">
        <h2 className="text-auri-ink text-3xl font-semibold">Good day.</h2>
        <p className="text-auri-ink-muted">Database is not configured.</p>
      </div>
    );
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/sign-in");
  }

  const todayYmd = todayYmdManila();
  const preset = inferCurrentPeriodPreset(todayYmd);
  const range = periodRangeForPreset(preset.year, preset.month, preset.kind);
  const current = await findActiveReportByRange(user.id, range.startDate, range.endDate);
  const recent = (await ReportPeriodService.list(user.id)).slice(0, 5);
  const recentExports = await ExportHistoryService.listRecent(user.id, { limit: 8 });

  return (
    <div className="motion-safe-fade-in space-y-8">
      <section className="space-y-2">
        <p className="text-auri-ink-muted text-sm">{today}</p>
        <h2 className="text-auri-ink text-3xl font-semibold tracking-tight">
          Good day. Ready when you are.
        </h2>
        <p className="text-auri-ink-muted max-w-2xl">
          Continue the current half-month period, or open a recent report.
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Button asChild variant="secondary" size="sm">
          <Link href="/app/presets">Manage accomplishment presets</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/app/reports">All reports</Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="border-auri-border bg-auri-surface rounded-3xl border p-6">
          <h3 className="text-auri-ink text-lg font-semibold">Current period</h3>
          {current ? (
            <>
              <p className="text-auri-ink mt-2 font-medium">
                {formatPeriodLabel(
                  current.startDate,
                  current.endDate,
                  current.periodKind,
                )}
              </p>
              <p className="text-auri-ink-muted mt-1 text-sm">
                {formatStatus(current.status)}
              </p>
              <div className="mt-5">
                <Button asChild>
                  <Link
                    href={
                      current.status === "finalized"
                        ? `/app/reports/${current.id}`
                        : `/app/reports/${current.id}/edit`
                    }
                  >
                    {current.status === "finalized" ? "View report" : "Continue report"}
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-auri-ink-muted mt-2 text-sm">
                No active report for{" "}
                {formatPeriodLabel(range.startDate, range.endDate, preset.kind)} yet.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={`/app/reports/new`}>
                    Create {preset.kind === "FIRST_HALF" ? "first-half" : "second-half"}{" "}
                    report
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/app/reports/new">Choose another period</Link>
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="border-auri-border bg-auri-surface rounded-3xl border p-6">
          <h3 className="text-auri-ink text-lg font-semibold">Latest files</h3>
          {recentExports.length === 0 ? (
            <p className="text-auri-ink-muted mt-2 text-sm">
              Generated Word, Excel, and ZIP files will appear here after you use
              Generate.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {recentExports.map((item) => (
                <li key={item.id}>
                  {item.downloadable ? (
                    <a
                      href={item.downloadUrl}
                      className="hover:bg-auri-orange-50/50 flex items-center justify-between rounded-xl px-1 py-1"
                    >
                      <span className="text-auri-ink font-medium">
                        {item.format.toUpperCase()} · {item.fileName}
                      </span>
                      <span className="text-auri-ink-muted">
                        {item.presentationStatus === "current" ? "Current" : "Outdated"}
                      </span>
                    </a>
                  ) : (
                    <span className="text-auri-ink-muted flex items-center justify-between px-1 py-1">
                      <span>
                        {item.format.toUpperCase()} · {item.fileName}
                      </span>
                      <span>Unavailable</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-auri-ink text-lg font-semibold">Recent reports</h3>
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/reports">View all</Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <p className="text-auri-ink-muted text-sm">No reports yet.</p>
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
                  className="border-auri-border bg-auri-surface hover:bg-auri-orange-50/50 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors"
                >
                  <span className="text-auri-ink font-medium">
                    {formatPeriodLabel(
                      item.report.startDate,
                      item.report.endDate,
                      item.report.periodKind,
                    )}
                  </span>
                  <span className="text-auri-ink-muted">
                    {formatStatus(item.report.status)} · {item.progressLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
