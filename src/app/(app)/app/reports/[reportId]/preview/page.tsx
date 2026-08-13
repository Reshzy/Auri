import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import { SemanticReportPreview } from "@/features/exports/semantic-preview";
import { GenerateFilesButton } from "@/features/exports/generate-files-button";
import { DatabaseUnavailable } from "@/components/ui/unavailable-state";
import { hasDatabaseUrl } from "@/lib/env";
import { formatPeriodLabel } from "@/lib/reports/labels";
import { ReportPreviewService } from "@/server/services/export-review-service";
import { ReportPeriodService } from "@/server/services/report-period-service";

export const metadata: Metadata = {
  title: "Preview",
  description: "Review accomplishment and DTR content before generating files.",
};

export default async function ReportPreviewPage({
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
  let preview;
  let loaded;
  try {
    loaded = await ReportPeriodService.get(user.id, reportId);
    preview = await ReportPreviewService.build(user.id, reportId);
  } catch {
    notFound();
  }

  return (
    <div className="motion-safe-fade-in space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-auri-ink-muted text-sm">
            <Link href={`/app/reports/${reportId}`} className="hover:underline">
              Report
            </Link>
          </p>
          <h2 className="text-auri-ink text-3xl font-semibold tracking-tight">
            Preview ·{" "}
            {formatPeriodLabel(
              loaded.report.startDate,
              loaded.report.endDate,
              loaded.report.periodKind,
            )}
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <Link href={`/app/reports/${reportId}/edit`}>Editor</Link>
          </Button>
          <GenerateFilesButton reportId={reportId} />
        </div>
      </div>
      <SemanticReportPreview payload={preview.payload} validation={preview.validation} />
    </div>
  );
}
