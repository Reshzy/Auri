"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyPresetsToDailyEntryAction } from "@/features/presets/actions";
import { PresetPicker } from "@/features/presets/preset-picker";
import type { PresetListItem } from "@/features/presets/types";
import {
  clearDailyEntryAction,
  copyPreviousWorkdayAction,
  saveDailyEntryAction,
} from "@/features/reports/actions";
import { ReportStatusActions } from "@/features/reports/report-status-actions";
import { GenerateFilesButton } from "@/features/exports/generate-files-button";
import { ValidationSummary } from "@/features/reports/validation-summary";
import { pgTimeToHhmm } from "@/lib/reports/pg-time";
import { weekdayLabelForYmd } from "@/lib/dates/period";
import type { DayClassification } from "@/lib/reports/classify";
import {
  formatMinutesLabel,
  formatPeriodLabel,
  formatStatus,
} from "@/lib/reports/labels";
import { formatTotalHoursLabel } from "@/lib/reports/totals";
import { cn } from "@/lib/utils";
import type { ReportValidationResult } from "@/server/services/report-validation";

export type EditorEntry = {
  id: string;
  workDate: string;
  classification: DayClassification;
  classificationLabel: string | null;
  amArrival: string | null;
  amDeparture: string | null;
  pmArrival: string | null;
  pmDeparture: string | null;
  workedMinutes: number;
  calculatedUndertimeMinutes: number;
  undertimeOverrideMinutes: number | null;
  accomplishments: string[];
  remarks: string | null;
  isComplete: boolean;
};

export type EditorReport = {
  id: string;
  periodKind: string;
  startDate: string;
  endDate: string;
  status: string;
  snapshotsRefreshedAt: string | null;
};

type SaveState = "unsaved" | "saving" | "saved" | "failed";

type DayForm = {
  classification: DayClassification;
  classificationLabel: string;
  amArrival: string;
  amDeparture: string;
  pmArrival: string;
  pmDeparture: string;
  undertimeOverride: string;
  accomplishments: string[];
  remarks: string;
};

function entryToForm(entry: EditorEntry): DayForm {
  return {
    classification: entry.classification,
    classificationLabel: entry.classificationLabel ?? "",
    amArrival: entry.amArrival ?? "",
    amDeparture: entry.amDeparture ?? "",
    pmArrival: entry.pmArrival ?? "",
    pmDeparture: entry.pmDeparture ?? "",
    undertimeOverride:
      entry.undertimeOverrideMinutes === null ||
      entry.undertimeOverrideMinutes === undefined
        ? ""
        : String(entry.undertimeOverrideMinutes),
    accomplishments: entry.accomplishments.length > 0 ? [...entry.accomplishments] : [""],
    remarks: entry.remarks ?? "",
  };
}

function pendingKey(userId: string, reportId: string, entryId: string) {
  return `auri:pending-entry:${userId}:${reportId}:${entryId}`;
}

function readPending(userId: string, reportId: string, entryId: string): DayForm | null {
  try {
    const raw = sessionStorage.getItem(pendingKey(userId, reportId, entryId));
    if (!raw) return null;
    return JSON.parse(raw) as DayForm;
  } catch {
    return null;
  }
}

function writePending(userId: string, reportId: string, entryId: string, form: DayForm) {
  try {
    sessionStorage.setItem(pendingKey(userId, reportId, entryId), JSON.stringify(form));
  } catch {
    // ignore quota / private mode
  }
}

function clearPendingStorage(userId: string, reportId: string, entryId: string) {
  try {
    sessionStorage.removeItem(pendingKey(userId, reportId, entryId));
  } catch {
    // ignore
  }
}

function initialSelection(entries: EditorEntry[], initialDay?: string) {
  if (initialDay && entries.some((e) => e.workDate === initialDay)) {
    return initialDay;
  }
  return entries[0]?.workDate ?? "";
}

function loadFormForEntry(
  userId: string,
  reportId: string,
  entry: EditorEntry,
): { form: DayForm; restoredFailed: boolean } {
  const pending = readPending(userId, reportId, entry.id);
  if (pending) {
    return { form: pending, restoredFailed: true };
  }
  return { form: entryToForm(entry), restoredFailed: false };
}

function mapSavedEntry(
  saved: Record<string, unknown>,
  fallback: EditorEntry,
): EditorEntry {
  return {
    id: String(saved.id ?? fallback.id),
    workDate: String(saved.workDate ?? fallback.workDate),
    classification:
      (saved.classification as DayClassification) ?? fallback.classification,
    classificationLabel:
      (saved.classificationLabel as string | null | undefined) ??
      fallback.classificationLabel,
    amArrival: pgTimeToHhmm((saved.amArrival as string | null) ?? fallback.amArrival),
    amDeparture: pgTimeToHhmm(
      (saved.amDeparture as string | null) ?? fallback.amDeparture,
    ),
    pmArrival: pgTimeToHhmm((saved.pmArrival as string | null) ?? fallback.pmArrival),
    pmDeparture: pgTimeToHhmm(
      (saved.pmDeparture as string | null) ?? fallback.pmDeparture,
    ),
    workedMinutes: Number(saved.workedMinutes ?? fallback.workedMinutes),
    calculatedUndertimeMinutes: Number(
      saved.calculatedUndertimeMinutes ?? fallback.calculatedUndertimeMinutes,
    ),
    undertimeOverrideMinutes:
      saved.undertimeOverrideMinutes === undefined
        ? fallback.undertimeOverrideMinutes
        : (saved.undertimeOverrideMinutes as number | null),
    accomplishments: Array.isArray(saved.accomplishments)
      ? (saved.accomplishments as string[])
      : fallback.accomplishments,
    remarks: (saved.remarks as string | null | undefined) ?? fallback.remarks,
    isComplete: Boolean(saved.isComplete ?? fallback.isComplete),
  };
}

export function DailyEditor({
  userId,
  report,
  initialEntries,
  initialDay,
  initialValidation,
  initialPresets = [],
}: {
  userId: string;
  report: EditorReport;
  initialEntries: EditorEntry[];
  initialDay?: string;
  initialValidation: ReportValidationResult;
  initialPresets?: PresetListItem[];
}) {
  const readOnly = report.status === "finalized" || report.status === "archived";
  const [entries, setEntries] = useState(initialEntries);
  const [validation, setValidation] = useState(initialValidation);
  const [status, setStatus] = useState(report.status);
  const [presets, setPresets] = useState(initialPresets);
  const [presetMessage, setPresetMessage] = useState<string | null>(null);
  const [applyingPresets, setApplyingPresets] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() =>
    initialSelection(initialEntries, initialDay),
  );

  const selected = entries.find((e) => e.workDate === selectedDate) ?? entries[0] ?? null;

  const initialLoad = selected ? loadFormForEntry(userId, report.id, selected) : null;

  const [form, setForm] = useState<DayForm>(
    () => initialLoad?.form ?? entryToForm(initialEntries[0]!),
  );
  const [saveState, setSaveState] = useState<SaveState>(
    initialLoad?.restoredFailed ? "failed" : "saved",
  );
  const [saveError, setSaveError] = useState<string | null>(
    initialLoad?.restoredFailed
      ? "Restored unsaved changes from a previous failed save."
      : null,
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [includeOverrideOnCopy, setIncludeOverrideOnCopy] = useState(false);
  const revisionRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();

  const selectedIndex = selected ? entries.findIndex((e) => e.id === selected.id) : -1;

  const totalsLabel = useMemo(
    () => formatTotalHoursLabel(entries.reduce((sum, e) => sum + e.workedMinutes, 0)),
    [entries],
  );

  function selectDate(workDate: string) {
    const entry = entries.find((e) => e.workDate === workDate);
    if (!entry) return;
    setSelectedDate(workDate);
    const loaded = loadFormForEntry(userId, report.id, entry);
    setForm(loaded.form);
    setConfirmClear(false);
    if (loaded.restoredFailed) {
      setSaveState("failed");
      setSaveError("Restored unsaved changes from a previous failed save.");
    } else {
      setSaveState("saved");
      setSaveError(null);
    }
  }

  async function saveForm(entryId: string, next: DayForm) {
    if (readOnly) return;
    const revision = ++revisionRef.current;
    setSaveState("saving");
    setSaveError(null);

    const overrideRaw = next.undertimeOverride.trim();
    const payload = {
      classification: next.classification,
      classificationLabel: next.classificationLabel.trim() || null,
      amArrival: next.amArrival,
      amDeparture: next.amDeparture,
      pmArrival: next.pmArrival,
      pmDeparture: next.pmDeparture,
      undertimeOverrideMinutes: overrideRaw === "" ? null : Number(overrideRaw),
      accomplishments: next.accomplishments,
      remarks: next.remarks,
    };

    const result = await saveDailyEntryAction({
      reportId: report.id,
      entryId,
      revision,
      payload,
    });

    if (revision !== revisionRef.current) {
      return;
    }

    if (!result.ok || !result.entry) {
      setSaveState("failed");
      setSaveError(result.error ?? "Save failed.");
      writePending(userId, report.id, entryId, next);
      return;
    }

    const current = entries.find((e) => e.id === entryId);
    if (!current) return;
    const saved = mapSavedEntry(result.entry as Record<string, unknown>, current);
    setEntries((prev) => prev.map((e) => (e.id === entryId ? saved : e)));
    setForm(entryToForm(saved));
    setSaveState("saved");
    setLastSavedAt(result.savedAt ?? null);
    if (result.reportStatus) setStatus(result.reportStatus);
    if (result.validation) setValidation(result.validation as ReportValidationResult);
    clearPendingStorage(userId, report.id, entryId);
  }

  async function onApplyPresets(presetIds: string[]) {
    if (!selected || readOnly || presetIds.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Flush local edits first so server merge sees the latest accomplishments.
    if (saveState === "unsaved" || saveState === "failed" || saveState === "saving") {
      await saveForm(selected.id, form);
      // If flush still failed, do not apply against a stale server row.
      const pending = readPending(userId, report.id, selected.id);
      if (pending) {
        setPresetMessage("Save your day changes before applying presets.");
        return;
      }
    }

    setApplyingPresets(true);
    setPresetMessage(null);
    setSaveState("saving");
    const revision = ++revisionRef.current;
    const result = await applyPresetsToDailyEntryAction({
      reportId: report.id,
      entryId: selected.id,
      presetIds,
      revision,
    });

    if (revision !== revisionRef.current) {
      setApplyingPresets(false);
      return;
    }

    if (!result.ok || !result.entry) {
      setSaveState("failed");
      setSaveError(result.error ?? "Could not apply presets.");
      setPresetMessage(result.error ?? "Could not apply presets.");
      writePending(userId, report.id, selected.id, form);
      setApplyingPresets(false);
      return;
    }

    const saved = mapSavedEntry(result.entry as Record<string, unknown>, selected);
    setEntries((prev) => prev.map((e) => (e.id === selected.id ? saved : e)));
    setForm(entryToForm(saved));
    setSaveState("saved");
    setLastSavedAt(result.savedAt ?? null);
    if (result.reportStatus) setStatus(result.reportStatus);
    if (result.validation) setValidation(result.validation as ReportValidationResult);
    clearPendingStorage(userId, report.id, selected.id);

    if (result.presetsUsage?.length) {
      setPresets((prev) =>
        prev.map((preset) => {
          const usage = result.presetsUsage!.find((u) => u.id === preset.id);
          if (!usage) return preset;
          return {
            ...preset,
            useCount: usage.useCount,
            lastUsedAt: usage.lastUsedAt,
          };
        }),
      );
    }

    const applied = result.appliedPresetIds?.length ?? 0;
    const skipped = result.skippedDuplicatePresetIds?.length ?? 0;
    if (applied === 0 && skipped > 0) {
      setPresetMessage("Those presets were already on this day; nothing new was added.");
    } else if (skipped > 0) {
      setPresetMessage(
        `Applied ${applied}; skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.`,
      );
    } else {
      setPresetMessage(`Applied ${applied} preset${applied === 1 ? "" : "s"}.`);
    }
    setApplyingPresets(false);
  }

  function queueSave(next: DayForm, entryId: string) {
    if (readOnly) return;
    setForm(next);
    setSaveState("unsaved");
    writePending(userId, report.id, entryId, next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        void saveForm(entryId, next);
      });
    }, 500);
  }

  function updateField<K extends keyof DayForm>(key: K, value: DayForm[K]) {
    if (!selected) return;
    queueSave({ ...form, [key]: value }, selected.id);
  }

  async function onRetry() {
    if (!selected) return;
    await saveForm(selected.id, form);
  }

  async function onCopy() {
    if (!selected || readOnly) return;
    setSaveState("saving");
    const result = await copyPreviousWorkdayAction({
      reportId: report.id,
      entryId: selected.id,
      includeUndertimeOverride: includeOverrideOnCopy,
    });
    if (!result.ok || !result.entry) {
      setSaveState("failed");
      setSaveError(result.error ?? "Copy failed.");
      return;
    }
    const saved = mapSavedEntry(result.entry as Record<string, unknown>, selected);
    setEntries((prev) => prev.map((e) => (e.id === selected.id ? saved : e)));
    setForm(entryToForm(saved));
    setSaveState("saved");
    setLastSavedAt(result.savedAt ?? null);
    if (result.validation) setValidation(result.validation as ReportValidationResult);
    clearPendingStorage(userId, report.id, selected.id);
  }

  async function onClear() {
    if (!selected || readOnly) return;
    setSaveState("saving");
    const result = await clearDailyEntryAction({
      reportId: report.id,
      entryId: selected.id,
    });
    if (!result.ok || !result.entry) {
      setSaveState("failed");
      setSaveError(result.error ?? "Clear failed.");
      return;
    }
    const saved = mapSavedEntry(result.entry as Record<string, unknown>, selected);
    setEntries((prev) => prev.map((e) => (e.id === selected.id ? saved : e)));
    setForm(entryToForm(saved));
    setSaveState("saved");
    setConfirmClear(false);
    if (result.validation) setValidation(result.validation as ReportValidationResult);
    clearPendingStorage(userId, report.id, selected.id);
  }

  function goRelative(delta: number) {
    const next = entries[selectedIndex + delta];
    if (next) selectDate(next.workDate);
  }

  if (!selected) {
    return <p className="text-auri-ink-muted">No daily entries in this report.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-auri-ink-muted text-sm">
            <Link href="/app/reports" className="hover:underline">
              Reports
            </Link>
            {" / "}
            <Link href={`/app/reports/${report.id}`} className="hover:underline">
              Detail
            </Link>
          </p>
          <h2 className="text-auri-ink text-2xl font-semibold tracking-tight">
            {formatPeriodLabel(report.startDate, report.endDate, report.periodKind)}
          </h2>
          <p className="text-auri-ink-muted text-sm">
            Status: {formatStatus(status)} · Total worked: {totalsLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/app/reports/${report.id}/preview`}>Preview</Link>
          </Button>
          <GenerateFilesButton reportId={report.id} />
          <SaveBadge
            state={saveState}
            lastSavedAt={lastSavedAt}
            onRetry={onRetry}
            error={saveError}
          />
        </div>
      </header>

      <ReportStatusActions reportId={report.id} status={status} />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="border-auri-border bg-auri-surface hidden max-h-[70vh] overflow-y-auto rounded-3xl border p-3 lg:block">
          <p className="text-auri-ink-muted mb-2 px-2 text-xs font-medium tracking-wide uppercase">
            Dates
          </p>
          <ul className="space-y-1">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => selectDate(entry.workDate)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm",
                    entry.workDate === selected.workDate
                      ? "bg-auri-orange-50 text-auri-ink"
                      : "text-auri-ink-muted hover:bg-auri-orange-50/60",
                  )}
                >
                  <span>
                    {entry.workDate.slice(8)} ·{" "}
                    {weekdayLabelForYmd(entry.workDate).slice(0, 3)}
                  </span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      entry.isComplete ? "bg-auri-success" : "bg-auri-orange-600",
                    )}
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="border-auri-border bg-auri-surface space-y-5 rounded-3xl border p-5">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => goRelative(-1)}
              disabled={selectedIndex <= 0}
            >
              Previous
            </Button>
            <select
              className="border-auri-border bg-auri-bg text-auri-ink max-w-[50%] rounded-xl border px-3 py-2 text-sm"
              value={selected.workDate}
              onChange={(e) => selectDate(e.target.value)}
            >
              {entries.map((entry) => (
                <option key={entry.id} value={entry.workDate}>
                  {entry.workDate} ({weekdayLabelForYmd(entry.workDate).slice(0, 3)})
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => goRelative(1)}
              disabled={selectedIndex >= entries.length - 1}
            >
              Next
            </Button>
          </div>

          <div>
            <h3 className="text-auri-ink text-xl font-semibold">
              {selected.workDate} · {weekdayLabelForYmd(selected.workDate)}
            </h3>
            <p className="text-auri-ink-muted text-sm">
              {selected.isComplete ? "Complete" : "Incomplete"} · Worked{" "}
              {formatMinutesLabel(selected.workedMinutes)} · Undertime{" "}
              {formatMinutesLabel(
                selected.undertimeOverrideMinutes ?? selected.calculatedUndertimeMinutes,
              )}
              {selected.undertimeOverrideMinutes !== null
                ? ` (calc ${formatMinutesLabel(selected.calculatedUndertimeMinutes)})`
                : null}
            </p>
          </div>

          <fieldset disabled={readOnly} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="classification">Classification</Label>
                <select
                  id="classification"
                  className="border-auri-border bg-auri-bg text-auri-ink h-11 w-full rounded-xl border px-3"
                  value={form.classification}
                  onChange={(e) =>
                    updateField("classification", e.target.value as DayClassification)
                  }
                >
                  {(
                    [
                      "workday",
                      "scheduled_off",
                      "holiday",
                      "leave",
                      "absent",
                      "custom",
                    ] as const
                  ).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="classificationLabel">Classification label</Label>
                <Input
                  id="classificationLabel"
                  value={form.classificationLabel}
                  onChange={(e) => updateField("classificationLabel", e.target.value)}
                  onBlur={() => void saveForm(selected.id, form)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TimeField
                id="amArrival"
                label="AM arrival"
                value={form.amArrival}
                onChange={(v) => updateField("amArrival", v)}
                onBlur={() => void saveForm(selected.id, form)}
              />
              <TimeField
                id="amDeparture"
                label="AM departure"
                value={form.amDeparture}
                onChange={(v) => updateField("amDeparture", v)}
                onBlur={() => void saveForm(selected.id, form)}
              />
              <TimeField
                id="pmArrival"
                label="PM arrival"
                value={form.pmArrival}
                onChange={(v) => updateField("pmArrival", v)}
                onBlur={() => void saveForm(selected.id, form)}
              />
              <TimeField
                id="pmDeparture"
                label="PM departure"
                value={form.pmDeparture}
                onChange={(v) => updateField("pmDeparture", v)}
                onBlur={() => void saveForm(selected.id, form)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="undertimeOverride">
                Manual undertime override (minutes)
              </Label>
              <Input
                id="undertimeOverride"
                inputMode="numeric"
                placeholder="Leave blank to use calculated"
                value={form.undertimeOverride}
                onChange={(e) => updateField("undertimeOverride", e.target.value)}
                onBlur={() => void saveForm(selected.id, form)}
              />
            </div>

            {!readOnly ? (
              <PresetPicker
                presets={presets}
                applying={applyingPresets}
                onApply={onApplyPresets}
                message={presetMessage}
              />
            ) : null}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Accomplishments</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    updateField("accomplishments", [...form.accomplishments, ""])
                  }
                >
                  Add item
                </Button>
              </div>
              <ul className="space-y-2">
                {form.accomplishments.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const next = [...form.accomplishments];
                        next[index] = e.target.value;
                        updateField("accomplishments", next);
                      }}
                      onBlur={() => void saveForm(selected.id, form)}
                      placeholder={`Item ${index + 1}`}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => {
                        const next = [...form.accomplishments];
                        [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                        updateField("accomplishments", next);
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Move down"
                      disabled={index === form.accomplishments.length - 1}
                      onClick={() => {
                        const next = [...form.accomplishments];
                        [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                        updateField("accomplishments", next);
                      }}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Remove"
                      onClick={() => {
                        const next = form.accomplishments.filter((_, i) => i !== index);
                        updateField("accomplishments", next.length > 0 ? next : [""]);
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <textarea
                id="remarks"
                className="border-auri-border bg-auri-bg text-auri-ink min-h-24 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.remarks}
                onChange={(e) => updateField("remarks", e.target.value)}
                onBlur={() => void saveForm(selected.id, form)}
              />
            </div>
          </fieldset>

          {!readOnly ? (
            <div className="border-auri-border bg-auri-surface/95 sticky bottom-0 -mx-5 border-t px-5 py-4 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <label className="text-auri-ink-muted flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeOverrideOnCopy}
                    onChange={(e) => setIncludeOverrideOnCopy(e.target.checked)}
                  />
                  Include undertime override when copying
                </label>
                <Button type="button" variant="secondary" onClick={() => void onCopy()}>
                  Copy previous workday
                </Button>
                {!confirmClear ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmClear(true)}
                  >
                    Clear day
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-auri-ink text-sm">Clear this day?</span>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => void onClear()}
                    >
                      Confirm clear
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmClear(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                <Button type="button" onClick={() => void saveForm(selected.id, form)}>
                  Save now
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-auri-ink-muted text-sm">
              This report is read-only. Reopen it deliberately to edit.
            </p>
          )}
        </section>

        <aside className="space-y-4">
          <ValidationSummary
            reportId={report.id}
            validation={{
              ...validation,
              totalWorkedMinutes: entries.reduce((sum, e) => sum + e.workedMinutes, 0),
              incompleteCount: entries.filter((e) => !e.isComplete).length,
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              if (!readOnly) {
                void saveForm(selected.id, form);
              }
            }}
          >
            Recheck readiness
          </Button>
        </aside>
      </div>
    </div>
  );
}

function TimeField({
  id,
  label,
  value,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="700 / 7:00 / 07:00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
}

function SaveBadge({
  state,
  lastSavedAt,
  onRetry,
  error,
}: {
  state: SaveState;
  lastSavedAt: string | null;
  onRetry: () => void;
  error: string | null;
}) {
  const label =
    state === "unsaved"
      ? "Unsaved"
      : state === "saving"
        ? "Saving…"
        : state === "failed"
          ? "Save failed"
          : "Saved";

  return (
    <div
      className="border-auri-border bg-auri-surface sticky top-2 z-10 flex items-center gap-3 rounded-2xl border px-4 py-2 text-sm shadow-sm"
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "font-medium",
          state === "failed" ? "text-auri-danger" : "text-auri-ink",
        )}
      >
        {label}
      </span>
      {lastSavedAt && state === "saved" ? (
        <span className="text-auri-ink-muted text-xs">
          {new Date(lastSavedAt).toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ) : null}
      {state === "failed" ? (
        <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
      {error ? <span className="text-auri-danger max-w-xs text-xs">{error}</span> : null}
    </div>
  );
}
