"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GenerationSuccessMotion } from "@/components/motion/generation-success";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toSafeExportUserMessage } from "@/lib/exports/errors";
import {
  acknowledgementsAreComplete,
  clearAcknowledgementsOnDataChange,
  toggleAcknowledgement,
  zipSelectionRequiresMembers,
  type WarningAckState,
} from "@/lib/exports/review-state";
import type {
  ExportGenerationResponse,
  GenerationReviewSummary,
} from "@/lib/exports/types";

type FormatKey = "docx" | "xlsx" | "zip";
type FormatUiStatus = "idle" | "pending" | "generating" | "created" | "reused" | "failed";

export function GenerationReviewPanel({
  reportId,
  open,
  onOpenChange,
}: {
  reportId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const titleId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby={titleId} className="w-[min(100%-1.5rem,40rem)]">
        <DialogTitle id={titleId}>Generate files</DialogTitle>
        <DialogDescription>
          Review the report, acknowledge warnings, and choose Word, Excel, or a ZIP
          package.
        </DialogDescription>
        {open ? (
          <GenerationReviewBody reportId={reportId} onOpenChange={onOpenChange} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function GenerationReviewBody({
  reportId,
  onOpenChange,
}: {
  reportId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [review, setReview] = useState<GenerationReviewSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({ docx: true, xlsx: true, zip: false });
  const [ack, setAck] = useState<WarningAckState>({
    warningCodes: [],
    acknowledged: [],
    dataRevision: "",
    acknowledgedForRevision: null,
  });
  const [formatStatus, setFormatStatus] = useState<Record<FormatKey, FormatUiStatus>>({
    docx: "idle",
    xlsx: "idle",
    zip: "idle",
  });
  const [result, setResult] = useState<ExportGenerationResponse | null>(null);
  const [generating, setGenerating] = useState(false);
  const generateLock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/reports/${reportId}/generation-review`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("REVIEW_FAILED");
        return (await res.json()) as GenerationReviewSummary;
      })
      .then((data) => {
        if (cancelled) return;
        setReview(data);
        const dataRevision = `${data.reportId}:${data.validation.incompleteCount}:${data.validation.warnings.map((w) => w.code).join(",")}`;
        setAck((prev) =>
          clearAcknowledgementsOnDataChange(
            {
              ...prev,
              warningCodes: data.validation.warnings.map((w) => w.code),
              dataRevision,
            },
            dataRevision,
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load generation review.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const blocking = (review?.validation.errors.length ?? 0) > 0;
  const warningsComplete = acknowledgementsAreComplete(ack);
  const canGenerate =
    !blocking &&
    warningsComplete &&
    (selected.docx || selected.xlsx || selected.zip) &&
    !generating &&
    Boolean(review);

  function updateSelected(next: Partial<typeof selected>) {
    setSelected((prev) => zipSelectionRequiresMembers({ ...prev, ...next }));
  }

  async function onGenerate() {
    if (!canGenerate || generateLock.current || !review) return;
    generateLock.current = true;
    setGenerating(true);
    const formats: FormatKey[] = [];
    if (selected.docx) formats.push("docx");
    if (selected.xlsx) formats.push("xlsx");
    if (selected.zip) formats.push("zip");
    setFormatStatus({
      docx: selected.docx || selected.zip ? "generating" : "idle",
      xlsx: selected.xlsx || selected.zip ? "generating" : "idle",
      zip: selected.zip ? "generating" : "idle",
    });
    try {
      const res = await fetch(`/api/reports/${reportId}/exports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formats,
          acknowledgedWarnings: ack.acknowledged,
        }),
      });
      const json = (await res.json()) as ExportGenerationResponse | { code?: string };
      if (!("results" in json)) {
        throw new Error(json.code ?? "EXPORT_FAILED");
      }
      setResult(json);
      const nextStatus: Record<FormatKey, FormatUiStatus> = {
        docx: "idle",
        xlsx: "idle",
        zip: "idle",
      };
      for (const item of json.results) {
        nextStatus[item.format] = item.status;
      }
      setFormatStatus(nextStatus);
    } catch {
      setFormatStatus({
        docx: selected.docx ? "failed" : "idle",
        xlsx: selected.xlsx ? "failed" : "idle",
        zip: selected.zip ? "failed" : "idle",
      });
    } finally {
      setGenerating(false);
      generateLock.current = false;
    }
  }

  return (
    <>
      {loading ? (
        <div className="mt-4 space-y-3" role="status" aria-live="polite">
          <span className="sr-only">Loading review</span>
          <Skeleton className="h-24" />
          <Skeleton className="h-10" />
        </div>
      ) : null}
      {loadError ? (
        <Alert tone="danger" className="mt-4" title="Could not load generation review">
          <p>Try closing this dialog and opening Generate again.</p>
        </Alert>
      ) : null}

      {review ? (
        <div className="mt-4 space-y-4 text-sm">
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-auri-ink-muted">Employee</dt>
              <dd className="font-medium">{review.employeeName}</dd>
            </div>
            <div>
              <dt className="text-auri-ink-muted">Office</dt>
              <dd className="font-medium">{review.office}</dd>
            </div>
            <div>
              <dt className="text-auri-ink-muted">Period</dt>
              <dd className="font-medium">
                {review.periodStart} to {review.periodEnd}
              </dd>
            </div>
            <div>
              <dt className="text-auri-ink-muted">Total worked</dt>
              <dd className="font-medium">{review.totalWorkedLabel}</dd>
            </div>
            <div>
              <dt className="text-auri-ink-muted">Workdays</dt>
              <dd>{review.workdayCount}</dd>
            </div>
            <div>
              <dt className="text-auri-ink-muted">Off days</dt>
              <dd>{review.offDayCount}</dd>
            </div>
            <div>
              <dt className="text-auri-ink-muted">Incomplete days</dt>
              <dd>{review.incompleteCount}</dd>
            </div>
          </dl>

          <p>
            Templates: DOCX v{review.templates.accomplishment?.version ?? "—"} · XLSX v
            {review.templates.dtr?.version ?? "—"}
          </p>
          <ul className="text-auri-ink-muted space-y-1">
            <li>DOCX: {review.filenames.docx}</li>
            <li>XLSX: {review.filenames.xlsx}</li>
            <li>ZIP: {review.filenames.zip}</li>
          </ul>

          {review.validation.errors.length > 0 ? (
            <div>
              <p className="text-auri-danger font-medium">Blocking errors</p>
              <ul className="mt-1 list-disc pl-5">
                {review.validation.errors.map((issue) => (
                  <li key={`${issue.code}-${issue.workDate ?? ""}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {review.validation.warnings.length > 0 ? (
            <fieldset>
              <legend className="font-medium">Acknowledge warnings</legend>
              <div className="mt-2 space-y-2">
                {review.validation.warnings.map((issue) => (
                  <label key={issue.code} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={ack.acknowledged.includes(issue.code)}
                      onChange={(event) =>
                        setAck((prev) =>
                          toggleAcknowledgement(prev, issue.code, event.target.checked),
                        )
                      }
                    />
                    <span>{issue.message}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <fieldset>
            <legend className="font-medium">Formats</legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.docx}
                  onChange={(event) => updateSelected({ docx: event.target.checked })}
                />
                Word (DOCX)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.xlsx}
                  onChange={(event) => updateSelected({ xlsx: event.target.checked })}
                />
                Excel (XLSX)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.zip}
                  onChange={(event) =>
                    updateSelected({
                      zip: event.target.checked,
                      docx: event.target.checked ? true : selected.docx,
                      xlsx: event.target.checked ? true : selected.xlsx,
                    })
                  }
                />
                ZIP report package (includes Word and Excel)
              </label>
            </div>
          </fieldset>

          <ul className="space-y-1" aria-live="polite">
            {(["docx", "xlsx", "zip"] as const).map((format) => (
              <li key={format}>
                {format.toUpperCase()}: {labelForStatus(formatStatus[format])}
              </li>
            ))}
          </ul>

          {result ? (
            <GenerationSuccessMotion active={result.overallStatus === "complete"}>
              <Alert
                tone={
                  result.overallStatus === "complete"
                    ? "success"
                    : result.overallStatus === "partial"
                      ? "warning"
                      : "danger"
                }
                title={
                  result.overallStatus === "complete"
                    ? "Generation complete"
                    : result.overallStatus === "partial"
                      ? "Partial success — some formats failed"
                      : "Generation failed"
                }
              >
                <ul className="mt-2 space-y-2">
                  {result.results.map((item) => (
                    <li key={item.format} className="flex flex-wrap items-center gap-2">
                      <span>
                        {item.format.toUpperCase()} · {item.status}
                      </span>
                      {item.export && item.status !== "failed" ? (
                        <a
                          className="text-auri-orange-700 underline"
                          href={item.export.downloadUrl}
                        >
                          Download
                        </a>
                      ) : null}
                      {item.error ? (
                        <span>
                          {toSafeExportUserMessage(
                            item.error.code,
                            "This format could not be generated.",
                          )}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Alert>
            </GenerationSuccessMotion>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => void onGenerate()}
              disabled={!canGenerate}
            >
              {generating ? "Generating…" : "Generate"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function labelForStatus(status: FormatUiStatus): string {
  switch (status) {
    case "generating":
      return "Generating";
    case "created":
      return "Created";
    case "reused":
      return "Reused";
    case "failed":
      return "Failed";
    case "pending":
      return "Pending";
    default:
      return "Idle";
  }
}
