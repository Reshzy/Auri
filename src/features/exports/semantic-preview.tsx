import type { ReactNode } from "react";
import { PaperEntrance } from "@/components/motion/paper-entrance";
import { isNonWorkClassification, type DayClassification } from "@/lib/reports/classify";
import {
  formatDocxDate,
  formatDocxTimeRange,
  formatDocxTimeSpent,
} from "@/lib/reports/docx-format";
import { formatDtrClock, formatDtrEmployeeName } from "@/lib/reports/dtr-format";
import { formatTotalHoursLabel } from "@/lib/reports/totals";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExportPayload } from "@/server/services/report-mapping-service";
import type { ReportValidationResult } from "@/server/services/report-validation";
import { Alert } from "@/components/ui/alert";
import { PREVIEW_DISCLAIMER } from "@/lib/exports/preview-copy";

export function SemanticReportPreview({
  payload,
  validation,
}: {
  payload: ExportPayload;
  validation: ReportValidationResult;
}) {
  return (
    <div className="space-y-4">
      <p className="border-auri-border text-auri-ink rounded-2xl border bg-white px-4 py-3 text-sm">
        {PREVIEW_DISCLAIMER}
      </p>
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2">
          {validation.errors.map((issue) => (
            <Alert key={`e-${issue.code}-${issue.workDate ?? ""}`} tone="danger">
              {issue.message}
            </Alert>
          ))}
          {validation.warnings.map((issue) => (
            <Alert key={`w-${issue.code}-${issue.workDate ?? ""}`} tone="warning">
              {issue.message}
            </Alert>
          ))}
        </div>
      )}
      <Tabs defaultValue="accomplishment">
        <TabsList aria-label="Report preview">
          <TabsTrigger value="accomplishment">Accomplishment Report</TabsTrigger>
          <TabsTrigger value="dtr">Daily Time Record</TabsTrigger>
        </TabsList>
        <TabsContent value="accomplishment" className="mt-4">
          <AccomplishmentPreview payload={payload} />
        </TabsContent>
        <TabsContent value="dtr" className="mt-4">
          <DtrPreview payload={payload} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Paper({ children }: { children: ReactNode }) {
  return <PaperEntrance>{children}</PaperEntrance>;
}

function AccomplishmentPreview({ payload }: { payload: ExportPayload }) {
  return (
    <Paper>
      <header className="space-y-1 text-center">
        <p className="text-xs tracking-wide uppercase">
          {payload.organization.municipality}
        </p>
        <p className="text-sm">{payload.organization.office}</p>
        <p className="text-sm">{payload.organization.department}</p>
        <h3 className="pt-3 text-lg font-semibold">{payload.reportTitle}</h3>
        <p className="text-sm">{payload.employee.name}</p>
        <p className="text-sm">{payload.period.accomplishmentLabel}</p>
      </header>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption className="sr-only">Accomplishment report days</caption>
          <thead>
            <tr className="border-auri-border border-b">
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">AM</th>
              <th className="py-2 pr-3 font-medium">PM</th>
              <th className="py-2 pr-3 font-medium">Time spent</th>
              <th className="py-2 pr-3 font-medium">Accomplishment</th>
              <th className="py-2 font-medium">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {payload.entries.map((entry) => {
              const nonWork = isNonWorkClassification(entry.classification);
              return (
                <tr key={entry.date} className="border-auri-border border-b align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {formatDocxDate(entry.date)}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {nonWork
                      ? "—"
                      : formatDocxTimeRange(entry.amArrival, entry.amDeparture)}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {nonWork
                      ? "—"
                      : formatDocxTimeRange(entry.pmArrival, entry.pmDeparture)}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {nonWork ? "—" : formatDocxTimeSpent(entry.workedMinutes)}
                  </td>
                  <td className="py-2 pr-3">
                    {nonWork
                      ? (
                          entry.classificationLabel?.trim() || entry.classification
                        ).toUpperCase()
                      : entry.accomplishments.filter(Boolean).join(" / ") || "Blank"}
                  </td>
                  <td className="py-2">{entry.remarks?.trim() || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm font-medium">
        Total worked time: {formatTotalHoursLabel(payload.totalWorkedMinutes)}
      </p>
      <p className="mt-4 text-sm">{payload.certificationText}</p>
      <Signatories payload={payload} />
    </Paper>
  );
}

function DtrPreview({ payload }: { payload: ExportPayload }) {
  return (
    <Paper>
      <header className="space-y-1">
        <h3 className="text-lg font-semibold">Daily Time Record</h3>
        <p className="text-sm">{formatDtrEmployeeName(payload.employee.name)}</p>
        <p className="text-sm">{payload.period.dtrLabel}</p>
        <p className="text-auri-ink-muted text-sm">
          Non-workdays leave time and undertime cells blank. This preview is not a
          spreadsheet.
        </p>
      </header>
      <ol className="mt-4 space-y-3">
        {payload.entries.map((entry) => {
          const nonWork = isNonWorkClassification(
            entry.classification as DayClassification,
          );
          return (
            <li
              key={entry.date}
              className="border-auri-border rounded-2xl border px-3 py-3 text-sm"
            >
              <p className="font-medium">
                Day {entry.dayNumber} · {entry.date}
              </p>
              <p className="text-auri-ink-muted">
                {entry.classificationLabel?.trim() || entry.classification}
              </p>
              {nonWork ? (
                <p className="mt-2">Blank time cells (non-workday)</p>
              ) : (
                <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <dt className="text-auri-ink-muted">AM in</dt>
                    <dd>{formatClock(entry.amArrival)}</dd>
                  </div>
                  <div>
                    <dt className="text-auri-ink-muted">AM out</dt>
                    <dd>{formatClock(entry.amDeparture)}</dd>
                  </div>
                  <div>
                    <dt className="text-auri-ink-muted">PM in</dt>
                    <dd>{formatClock(entry.pmArrival)}</dd>
                  </div>
                  <div>
                    <dt className="text-auri-ink-muted">PM out</dt>
                    <dd>{formatClock(entry.pmDeparture)}</dd>
                  </div>
                  <div>
                    <dt className="text-auri-ink-muted">Worked</dt>
                    <dd>{formatDocxTimeSpent(entry.workedMinutes)}</dd>
                  </div>
                  <div>
                    <dt className="text-auri-ink-muted">Undertime</dt>
                    <dd>
                      {entry.undertimeMinutes > 0
                        ? `${entry.undertimeMinutes} min`
                        : "Blank (zero)"}
                    </dd>
                  </div>
                </dl>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-sm font-medium">
        Total worked time: {formatTotalHoursLabel(payload.totalWorkedMinutes)}
      </p>
      <Signatories payload={payload} />
    </Paper>
  );
}

function formatClock(value: string | null): string {
  if (!value) return "—";
  return formatDtrClock(value);
}

function Signatories({ payload }: { payload: ExportPayload }) {
  const slots = [0, 1, 2, 3].map((slot) =>
    payload.signatories.find((s) => s.slot === slot),
  );
  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2">
      {slots.map((signatory, index) => (
        <div
          key={index}
          className="border-auri-border rounded-2xl border px-3 py-3 text-sm"
        >
          <p className="text-auri-ink-muted">Signatory {index + 1}</p>
          <p className="font-medium">{signatory?.name || payload.employee.name}</p>
          <p>{signatory?.title || payload.employee.title || "—"}</p>
        </div>
      ))}
    </section>
  );
}
