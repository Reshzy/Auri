import Link from "next/link";
import type { ReportValidationResult } from "@/server/services/report-validation";

export function ValidationSummary({
  reportId,
  validation,
}: {
  reportId: string;
  validation: ReportValidationResult;
}) {
  return (
    <section className="border-auri-border bg-auri-surface space-y-4 rounded-3xl border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-auri-ink text-lg font-semibold">Readiness</h3>
        <p className="text-auri-ink-muted text-sm">
          {validation.ready ? "Ready to finalize" : "Blocking issues remain"}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-auri-ink-muted">Worked</dt>
          <dd className="text-auri-ink font-medium">
            {Math.floor(validation.totalWorkedMinutes / 60)}h{" "}
            {validation.totalWorkedMinutes % 60}m
          </dd>
        </div>
        <div>
          <dt className="text-auri-ink-muted">Incomplete</dt>
          <dd className="text-auri-ink font-medium">{validation.incompleteCount}</dd>
        </div>
        <div>
          <dt className="text-auri-ink-muted">Invalid</dt>
          <dd className="text-auri-ink font-medium">{validation.invalidCount}</dd>
        </div>
        <div>
          <dt className="text-auri-ink-muted">Warnings</dt>
          <dd className="text-auri-ink font-medium">{validation.warnings.length}</dd>
        </div>
      </dl>

      {validation.errors.length > 0 ? (
        <IssueList
          title="Blocking errors"
          items={validation.errors}
          reportId={reportId}
          tone="error"
        />
      ) : null}
      {validation.warnings.length > 0 ? (
        <IssueList
          title="Warnings"
          items={validation.warnings}
          reportId={reportId}
          tone="warning"
        />
      ) : null}
      {validation.infos.length > 0 ? (
        <IssueList
          title="Notes"
          items={validation.infos}
          reportId={reportId}
          tone="info"
        />
      ) : null}
    </section>
  );
}

function IssueList({
  title,
  items,
  reportId,
  tone,
}: {
  title: string;
  items: ReportValidationResult["errors"];
  reportId: string;
  tone: "error" | "warning" | "info";
}) {
  const toneClass =
    tone === "error"
      ? "border-auri-danger/30 text-auri-danger"
      : tone === "warning"
        ? "border-auri-orange-600/30 text-auri-ink"
        : "border-auri-border text-auri-ink-muted";

  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClass}`}>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={`${item.code}-${item.workDate ?? ""}-${item.message}`}>
            {item.workDate ? (
              <Link
                href={`/app/reports/${reportId}/edit?day=${item.workDate}`}
                className="underline-offset-2 hover:underline"
              >
                {item.message}
              </Link>
            ) : (
              item.message
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
