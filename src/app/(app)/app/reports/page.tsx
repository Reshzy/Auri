import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { hasDatabaseUrl } from "@/lib/env";
import { formatPeriodKind, formatPeriodLabel, formatStatus } from "@/lib/reports/labels";
import { ReportPeriodService } from "@/server/services/report-period-service";

export default async function ReportsPage() {
  if (!hasDatabaseUrl()) {
    return (
      <div className="space-y-3">
        <h2 className="text-auri-ink text-2xl font-semibold">Reports</h2>
        <p className="text-auri-ink-muted">Database is not configured.</p>
      </div>
    );
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/login");
  }

  const items = await ReportPeriodService.list(user.id);

  return (
    <div className="motion-safe-fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-auri-ink text-3xl font-semibold tracking-tight">Reports</h2>
          <p className="text-auri-ink-muted mt-1 text-sm">
            Half-month periods with completion progress and worked time.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/reports/new">New report</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="border-auri-border bg-auri-surface rounded-3xl border p-6">
          <p className="text-auri-ink font-medium">No reports yet</p>
          <p className="text-auri-ink-muted mt-1 text-sm">
            Create a first-half or second-half period to start daily entries.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/app/reports/new">Create report</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const href =
              item.report.status === "finalized" || item.report.status === "archived"
                ? `/app/reports/${item.report.id}`
                : `/app/reports/${item.report.id}/edit`;
            return (
              <li
                key={item.report.id}
                className="border-auri-border bg-auri-surface rounded-3xl border p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-auri-ink text-lg font-semibold">
                      {formatPeriodLabel(
                        item.report.startDate,
                        item.report.endDate,
                        item.report.periodKind,
                      )}
                    </h3>
                    <p className="text-auri-ink-muted text-sm">
                      {formatPeriodKind(item.report.periodKind)} ·{" "}
                      {formatStatus(item.report.status)} · Progress {item.progressLabel} ·{" "}
                      {item.totalWorkedLabel}
                      {item.incompleteOrInvalidCount > 0
                        ? ` · ${item.incompleteOrInvalidCount} missing/incomplete`
                        : null}
                    </p>
                    <p className="text-auri-ink-muted text-xs">
                      Updated{" "}
                      {new Date(item.report.updatedAt).toLocaleString("en-PH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Manila",
                      })}
                    </p>
                  </div>
                  <Button asChild variant="secondary">
                    <Link href={href}>
                      {item.report.status === "finalized" ? "View" : "Continue"}
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
