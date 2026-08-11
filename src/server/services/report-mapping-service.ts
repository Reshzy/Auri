import type { DayClassification } from "@/lib/reports/classify";
import { isNonWorkClassification } from "@/lib/reports/classify";
import {
  formatAccomplishmentPeriodLabel,
  formatDocxDate,
  formatDocxTimeRange,
  formatDocxTimeSpent,
} from "@/lib/reports/docx-format";
import { formatDtrPeriodLabel, calendarDayFromYmd } from "@/lib/reports/dtr-format";
import { formatTotalHoursLabel, sumWorkedMinutes } from "@/lib/reports/totals";
import {
  ACCOMPLISHMENT_MAX_ROWS,
  allRequiredTokens,
  rowToken,
  type HeaderToken,
} from "@/lib/templates/accomplishment-tokens";
import { assertMaxRows } from "@/lib/exports/filename";
import type { ProfileSnapshot, SignatorySnapshot } from "@/db/dal/snapshots";
import { createHash } from "node:crypto";

export type ExportEntry = {
  date: string;
  dayNumber: number;
  classification: DayClassification;
  classificationLabel: string | null;
  amArrival: string | null;
  amDeparture: string | null;
  pmArrival: string | null;
  pmDeparture: string | null;
  workedMinutes: number;
  undertimeMinutes: number;
  accomplishments: string[];
  remarks: string | null;
};

export type ExportPayload = {
  reportId: string;
  employee: { name: string; title: string | null };
  organization: {
    municipality: string;
    office: string;
    department: string;
  };
  period: {
    startDate: string;
    endDate: string;
    accomplishmentLabel: string;
    dtrLabel: string;
  };
  entries: ExportEntry[];
  totalWorkedMinutes: number;
  signatories: Array<{ slot: number; name: string; title: string }>;
  certificationText: string;
  reportTitle: string;
};

export type FlatTokenRecord = Record<string, string>;

export const DEFAULT_CERTIFICATION_TEXT =
  "I HEREBY CERTIFY under penalty of perjury that the tasks accomplished as indicated in this Report are true and accurate report of the task accomplished for the day above written.";

export type MappingReportInput = {
  reportId: string;
  startDate: string;
  endDate: string;
  profileSnapshot: ProfileSnapshot;
  signatorySnapshot: SignatorySnapshot[];
  entries: Array<{
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
  }>;
};

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const obj = v as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(obj).sort()) {
        sorted[key] = obj[key];
      }
      return sorted;
    }
    return v;
  });
}

export function hashCanonicalPayload(
  payload: ExportPayload,
  templateHashes: string[],
): string {
  const material = `${stableStringify(payload)}|${templateHashes.join(",")}`;
  return createHash("sha256").update(material).digest("hex");
}

export function joinAccomplishments(items: string[]): string {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" / ");
}

export function buildExportPayload(input: MappingReportInput): ExportPayload {
  const ordered = [...input.entries].sort((a, b) => a.workDate.localeCompare(b.workDate));
  assertMaxRows(ordered.length);

  const profile = input.profileSnapshot;
  const signatories = [...input.signatorySnapshot]
    .filter((s) => s.isActive)
    .sort((a, b) => a.slot - b.slot)
    .map((s) => ({
      slot: s.slot,
      name: s.displayName,
      title: s.title,
    }));

  const entries: ExportEntry[] = ordered.map((entry) => ({
    date: entry.workDate,
    dayNumber: calendarDayFromYmd(entry.workDate),
    classification: entry.classification,
    classificationLabel: entry.classificationLabel,
    amArrival: entry.amArrival,
    amDeparture: entry.amDeparture,
    pmArrival: entry.pmArrival,
    pmDeparture: entry.pmDeparture,
    workedMinutes: entry.workedMinutes,
    undertimeMinutes: entry.undertimeOverrideMinutes ?? entry.calculatedUndertimeMinutes,
    accomplishments: entry.accomplishments,
    remarks: entry.remarks,
  }));

  const totalWorkedMinutes = sumWorkedMinutes(entries);
  const accomplishmentLabel = formatAccomplishmentPeriodLabel(
    input.startDate,
    input.endDate,
  );
  const dtrLabel = formatDtrPeriodLabel(input.startDate, input.endDate);

  return {
    reportId: input.reportId,
    employee: {
      name: profile.employeeName,
      title: profile.employeeTitle,
    },
    organization: {
      municipality: profile.organizationName?.trim() || "",
      office: profile.officeName?.trim() || "",
      department: profile.departmentName?.trim() || "",
    },
    period: {
      startDate: input.startDate,
      endDate: input.endDate,
      accomplishmentLabel,
      dtrLabel,
    },
    entries,
    totalWorkedMinutes,
    signatories,
    certificationText: DEFAULT_CERTIFICATION_TEXT,
    reportTitle: "ACCOMPLISHMENT REPORT",
  };
}

function mapRowTokens(entry: ExportEntry | undefined, rowIndex: number): FlatTokenRecord {
  const out: FlatTokenRecord = {};
  if (!entry) {
    for (const field of [
      "date",
      "am",
      "pm",
      "time_spent",
      "accomplishment",
      "remarks",
    ] as const) {
      out[rowToken(rowIndex, field)] = "";
    }
    return out;
  }

  const nonWork = isNonWorkClassification(entry.classification);
  out[rowToken(rowIndex, "date")] = formatDocxDate(entry.date);
  out[rowToken(rowIndex, "am")] = nonWork
    ? "-"
    : formatDocxTimeRange(entry.amArrival, entry.amDeparture);
  out[rowToken(rowIndex, "pm")] = nonWork
    ? "-"
    : formatDocxTimeRange(entry.pmArrival, entry.pmDeparture);
  out[rowToken(rowIndex, "time_spent")] = nonWork
    ? "-"
    : formatDocxTimeSpent(entry.workedMinutes);
  out[rowToken(rowIndex, "accomplishment")] = nonWork
    ? (entry.classificationLabel?.trim() || entry.classification).toUpperCase()
    : joinAccomplishments(entry.accomplishments);
  out[rowToken(rowIndex, "remarks")] = entry.remarks?.trim() ?? "";
  return out;
}

function signatoryBySlot(
  signatories: ExportPayload["signatories"],
  slot: number,
): { name: string; title: string } {
  const found = signatories.find((s) => s.slot === slot);
  return { name: found?.name ?? "", title: found?.title ?? "" };
}

export function mapPayloadToFlatTokens(payload: ExportPayload): FlatTokenRecord {
  const employee = signatoryBySlot(payload.signatories, 0);
  const s1 = signatoryBySlot(payload.signatories, 1);
  const s2 = signatoryBySlot(payload.signatories, 2);
  const s3 = signatoryBySlot(payload.signatories, 3);

  const header: Record<HeaderToken, string> = {
    municipality_name: payload.organization.municipality,
    office_name: payload.organization.office,
    department_name: payload.organization.department,
    report_title: payload.reportTitle,
    employee_name: payload.employee.name,
    period_label: payload.period.accomplishmentLabel,
    total_hours_label: formatTotalHoursLabel(payload.totalWorkedMinutes),
    certification_text: payload.certificationText,
    signatory_employee_name: employee.name || payload.employee.name,
    signatory_employee_title: employee.title || payload.employee.title || "",
    signatory_1_name: s1.name,
    signatory_1_title: s1.title,
    signatory_2_name: s2.name,
    signatory_2_title: s2.title,
    signatory_3_name: s3.name,
    signatory_3_title: s3.title,
  };

  const tokens: FlatTokenRecord = { ...header };
  for (let i = 1; i <= ACCOMPLISHMENT_MAX_ROWS; i += 1) {
    Object.assign(tokens, mapRowTokens(payload.entries[i - 1], i));
  }

  const required = allRequiredTokens();
  for (const key of required) {
    if (tokens[key] === undefined || tokens[key] === null) {
      tokens[key] = "";
    } else {
      tokens[key] = String(tokens[key]);
    }
  }
  return tokens;
}

/** Framework-light mapping service (no React / Route Handler coupling). */
export const ReportMappingService = {
  buildPayload: buildExportPayload,
  toFlatTokens: mapPayloadToFlatTokens,
  sourceRevision: hashCanonicalPayload,
};
