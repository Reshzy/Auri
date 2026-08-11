import { notFound, redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/db/dal/auth-user";
import type { PresetListItem } from "@/features/presets/types";
import { DailyEditor, type EditorEntry } from "@/features/reports/daily-editor";
import { hasDatabaseUrl } from "@/lib/env";
import type { DayClassification } from "@/lib/reports/classify";
import { pgTimeToHhmm } from "@/lib/reports/pg-time";
import { PresetService } from "@/server/services/preset-service";
import { ReportPeriodService } from "@/server/services/report-period-service";

export default async function ReportEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  if (!hasDatabaseUrl()) {
    return <p className="text-auri-ink-muted">Database is not configured.</p>;
  }

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch {
    redirect("/login");
  }

  const { reportId } = await params;
  const { day } = await searchParams;

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
  const presetRows = await PresetService.listActive(user.id);
  const initialPresets: PresetListItem[] = presetRows.map((row) => ({
    id: row.id,
    label: row.label,
    content: row.content,
    category: row.category,
    shortcut: row.shortcut,
    useCount: row.useCount,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
  }));

  const entries: EditorEntry[] = loaded.entries.map((entry) => ({
    id: entry.id,
    workDate: entry.workDate,
    classification: entry.classification as DayClassification,
    classificationLabel: entry.classificationLabel,
    amArrival: pgTimeToHhmm(entry.amArrival),
    amDeparture: pgTimeToHhmm(entry.amDeparture),
    pmArrival: pgTimeToHhmm(entry.pmArrival),
    pmDeparture: pgTimeToHhmm(entry.pmDeparture),
    workedMinutes: entry.workedMinutes,
    calculatedUndertimeMinutes: entry.calculatedUndertimeMinutes,
    undertimeOverrideMinutes: entry.undertimeOverrideMinutes,
    accomplishments: entry.accomplishments ?? [],
    remarks: entry.remarks,
    isComplete: entry.isComplete,
  }));

  return (
    <div className="motion-safe-fade-in">
      <DailyEditor
        userId={user.id}
        report={{
          id: loaded.report.id,
          periodKind: loaded.report.periodKind,
          startDate: loaded.report.startDate,
          endDate: loaded.report.endDate,
          status: loaded.report.status,
          snapshotsRefreshedAt: loaded.report.snapshotsRefreshedAt,
        }}
        initialEntries={entries}
        initialDay={day}
        initialValidation={validation}
        initialPresets={initialPresets}
      />
    </div>
  );
}
