import { eachDateInclusive, todayYmdManila } from "@/lib/dates/period";
import type {
  ProfileSnapshot,
  ScheduleSnapshot,
  SignatorySnapshot,
} from "@/db/dal/snapshots";
import { isNonWorkClassification, type DayClassification } from "@/lib/reports/classify";
import { normalizeAndValidateDayTimes } from "@/lib/reports/time";
import type { TemplateAvailabilityItem } from "@/lib/templates/availability-types";

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationIssue = {
  code: string;
  severity: ValidationSeverity;
  message: string;
  workDate?: string;
  entryId?: string;
};

export type ReportValidationInput = {
  report: {
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    createdAt: string;
    snapshotsRefreshedAt: string | null;
    profileSnapshot: ProfileSnapshot;
    scheduleSnapshot: ScheduleSnapshot | null;
    signatorySnapshot: SignatorySnapshot[];
  };
  entries: Array<{
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
  }>;
  templates: TemplateAvailabilityItem[];
  /** ISO timestamps of profile/schedule/signatory updates when available */
  settingsUpdatedAt?: string | null;
};

export type ReportValidationResult = {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  ready: boolean;
  incompleteCount: number;
  invalidCount: number;
  totalWorkedMinutes: number;
};

const ACCOMPLISHMENT_OVERFLOW_CHARS = 420;

export function validateReport(input: ReportValidationInput): ReportValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const infos: ValidationIssue[] = [];

  const profile = input.report.profileSnapshot;
  if (
    !profile?.employeeName?.trim() ||
    !profile.organizationName?.trim() ||
    !profile.officeName?.trim()
  ) {
    errors.push({
      code: "SNAPSHOT_PROFILE_INCOMPLETE",
      severity: "error",
      message: "Profile snapshot is incomplete.",
    });
  }

  if (!input.report.scheduleSnapshot?.weekdayRules) {
    errors.push({
      code: "SNAPSHOT_SCHEDULE_MISSING",
      severity: "error",
      message: "Schedule snapshot is missing.",
    });
  }

  const activeSignatories = (input.report.signatorySnapshot ?? []).filter(
    (s) => s.isActive,
  );
  const slots = new Set(activeSignatories.map((s) => s.slot));
  for (let slot = 0; slot < 4; slot += 1) {
    if (!slots.has(slot)) {
      errors.push({
        code: "SIGNATORY_SLOT_MISSING",
        severity: "error",
        message: `Signatory slot ${slot + 1} is missing from the report snapshot.`,
      });
    }
  }

  const expectedDates = eachDateInclusive(input.report.startDate, input.report.endDate);
  const byDate = new Map(input.entries.map((e) => [e.workDate, e]));
  if (input.entries.length !== expectedDates.length) {
    errors.push({
      code: "ENTRY_COUNT_MISMATCH",
      severity: "error",
      message: `Expected ${expectedDates.length} daily entries, found ${input.entries.length}.`,
    });
  }
  for (const date of expectedDates) {
    if (!byDate.has(date)) {
      errors.push({
        code: "ENTRY_MISSING",
        severity: "error",
        message: `Missing daily entry for ${date}.`,
        workDate: date,
      });
    }
  }

  let incompleteCount = 0;
  let invalidCount = 0;
  let totalWorkedMinutes = 0;
  const today = todayYmdManila();

  for (const entry of input.entries) {
    totalWorkedMinutes += entry.workedMinutes;

    const times = normalizeAndValidateDayTimes({
      amArrival: entry.amArrival,
      amDeparture: entry.amDeparture,
      pmArrival: entry.pmArrival,
      pmDeparture: entry.pmDeparture,
    });
    if (times.issues.length > 0) {
      invalidCount += 1;
      for (const issue of times.issues) {
        errors.push({
          code: "TIME_INVALID",
          severity: "error",
          message: issue.message,
          workDate: entry.workDate,
          entryId: entry.id,
        });
      }
    }

    if (!entry.isComplete) {
      incompleteCount += 1;
    }

    if (entry.classification === "workday") {
      if (!entry.isComplete) {
        errors.push({
          code: "WORKDAY_INCOMPLETE",
          severity: "error",
          message: `Workday ${entry.workDate} is incomplete.`,
          workDate: entry.workDate,
          entryId: entry.id,
        });
      }
      const hasAccomplishment = entry.accomplishments.some((a) => a.trim().length > 0);
      if (entry.workedMinutes > 0 && !hasAccomplishment) {
        errors.push({
          code: "ACCOMPLISHMENT_REQUIRED",
          severity: "error",
          message: `Worked day ${entry.workDate} needs at least one accomplishment.`,
          workDate: entry.workDate,
          entryId: entry.id,
        });
      }
      const hasAm = Boolean(entry.amArrival && entry.amDeparture);
      const hasPm = Boolean(entry.pmArrival && entry.pmDeparture);
      if (hasAm !== hasPm && (hasAm || hasPm)) {
        warnings.push({
          code: "MISSING_SESSION",
          severity: "warning",
          message: `${entry.workDate} has only one session filled.`,
          workDate: entry.workDate,
          entryId: entry.id,
        });
      }
    } else if (isNonWorkClassification(entry.classification)) {
      if (!entry.classificationLabel?.trim()) {
        errors.push({
          code: "OFF_LABEL_REQUIRED",
          severity: "error",
          message: `${entry.workDate} needs a classification label.`,
          workDate: entry.workDate,
          entryId: entry.id,
        });
      }
    }

    if (entry.undertimeOverrideMinutes !== null) {
      warnings.push({
        code: "MANUAL_UNDERTIME_OVERRIDE",
        severity: "warning",
        message: `Manual undertime override on ${entry.workDate} (calculated ${entry.calculatedUndertimeMinutes} mins).`,
        workDate: entry.workDate,
        entryId: entry.id,
      });
    }

    const joined = entry.accomplishments.join(" / ");
    if (joined.length > ACCOMPLISHMENT_OVERFLOW_CHARS) {
      errors.push({
        code: "ACCOMPLISHMENT_OVERFLOW",
        severity: "error",
        message: `Accomplishments on ${entry.workDate} are likely to overflow the template.`,
        workDate: entry.workDate,
        entryId: entry.id,
      });
    } else if (joined.length > ACCOMPLISHMENT_OVERFLOW_CHARS - 80) {
      warnings.push({
        code: "ACCOMPLISHMENT_LONG",
        severity: "warning",
        message: `Accomplishments on ${entry.workDate} are long and may wrap tightly.`,
        workDate: entry.workDate,
        entryId: entry.id,
      });
    }

    if (entry.workDate > today) {
      warnings.push({
        code: "FUTURE_DATED",
        severity: "warning",
        message: `${entry.workDate} is in the future.`,
        workDate: entry.workDate,
        entryId: entry.id,
      });
    }
  }

  const bothTemplates = input.templates.filter((t) => t.available);
  if (bothTemplates.length < 2) {
    errors.push({
      code: "TEMPLATES_UNAVAILABLE",
      severity: "error",
      message: "Active DOCX and XLSX templates must both be available.",
    });
  } else {
    for (const t of bothTemplates) {
      if (!t.sha256) {
        errors.push({
          code: "TEMPLATE_HASH_MISSING",
          severity: "error",
          message: `Template ${t.key} is missing a hash.`,
        });
      }
    }
  }

  const snapshotAt = input.report.snapshotsRefreshedAt ?? input.report.createdAt;
  if (input.settingsUpdatedAt && input.settingsUpdatedAt > snapshotAt) {
    warnings.push({
      code: "SETTINGS_CHANGED",
      severity: "warning",
      message:
        "Settings changed after this report’s snapshots. Refresh from current settings if needed.",
    });
  }

  if (input.report.status === "finalized") {
    infos.push({
      code: "FINALIZED",
      severity: "info",
      message: "This report is finalized and read-only until deliberately reopened.",
    });
  }

  const ready = errors.length === 0;
  return {
    errors,
    warnings,
    infos,
    ready,
    incompleteCount,
    invalidCount,
    totalWorkedMinutes,
  };
}
