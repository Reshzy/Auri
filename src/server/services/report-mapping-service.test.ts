import { describe, expect, it } from "vitest";
import {
  allRequiredTokens,
  ACCOMPLISHMENT_MAX_ROWS,
  rowToken,
} from "@/lib/templates/accomplishment-tokens";
import {
  formatAccomplishmentPeriodLabel,
  formatDocxDate,
  formatDocxTimeRange,
  formatDocxTimeSpent,
} from "@/lib/reports/docx-format";
import { formatTotalHoursLabel } from "@/lib/reports/totals";
import { buildAccomplishmentFilename } from "@/lib/exports/filename";
import {
  ReportMappingService,
  joinAccomplishments,
  type MappingReportInput,
} from "@/server/services/report-mapping-service";
import type { ProfileSnapshot, SignatorySnapshot } from "@/db/dal/snapshots";

const profile: ProfileSnapshot = {
  employeeName: "Maria Clara & José",
  employeeTitle: "COS Employee",
  organizationName: "MUNICIPALITY OF SANCHEZ MIRA",
  officeName: "VICE MAYOR'S OFFICE",
  departmentName: "IT",
  timezone: "Asia/Manila",
  locale: "en-PH",
};

const signatories: SignatorySnapshot[] = [
  {
    slot: 0,
    displayName: "Maria Clara & José",
    title: "COS Employee",
    isActive: true,
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    slot: 1,
    displayName: "Verifier One",
    title: "Secretary",
    isActive: true,
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    slot: 2,
    displayName: "Verifier Two",
    title: "HRMO I",
    isActive: true,
    effectiveFrom: null,
    effectiveTo: null,
  },
  {
    slot: 3,
    displayName: "Verifier Three",
    title: "Vice Mayor",
    isActive: true,
    effectiveFrom: null,
    effectiveTo: null,
  },
];

function baseInput(entries: MappingReportInput["entries"]): MappingReportInput {
  return {
    reportId: "11111111-1111-4111-8111-111111111111",
    startDate: "2026-08-01",
    endDate: "2026-08-15",
    profileSnapshot: profile,
    signatorySnapshot: signatories,
    entries,
  };
}

describe("accomplishment token contract", () => {
  it("lists all required tokens including 16 row groups", () => {
    const tokens = allRequiredTokens();
    expect(tokens).toHaveLength(16 + ACCOMPLISHMENT_MAX_ROWS * 6);
    expect(tokens).toContain("municipality_name");
    expect(tokens).toContain(rowToken(16, "remarks"));
  });
});

describe("docx formatters", () => {
  it("formats audited dates and period labels", () => {
    expect(formatDocxDate("2026-08-01")).toBe("August 1, 2026");
    expect(formatAccomplishmentPeriodLabel("2026-08-01", "2026-08-15")).toBe(
      "August 1-15, 2026",
    );
    expect(formatAccomplishmentPeriodLabel("2026-08-16", "2026-08-31")).toBe(
      "August 16-31, 2026",
    );
  });
});

describe("DTR period label on ExportPayload", () => {
  it("uses distinct DTR period label from DOCX", () => {
    const payload = ReportMappingService.buildPayload(
      baseInput([
        {
          workDate: "2026-08-03",
          classification: "workday",
          classificationLabel: null,
          amArrival: "07:00",
          amDeparture: "12:00",
          pmArrival: "13:00",
          pmDeparture: "18:00",
          workedMinutes: 600,
          calculatedUndertimeMinutes: 0,
          undertimeOverrideMinutes: null,
          accomplishments: ["Task"],
          remarks: null,
        },
      ]),
    );
    expect(payload.period.accomplishmentLabel).toBe("August 1-15, 2026");
    expect(payload.period.dtrLabel).toBe("AUGUST 1-15");
    expect(payload.entries[0]?.dayNumber).toBe(3);
  });
});

describe("docx formatters continued", () => {
  it("formats AM/PM ranges without leading hour zeros", () => {
    expect(formatDocxTimeRange("07:00", "12:00")).toBe("7:00-12:00");
    expect(formatDocxTimeRange("13:00", "18:00")).toBe("13:00-18:00");
    expect(formatDocxTimeRange(null, null)).toBe("-");
  });

  it("formats daily time spent and totals", () => {
    expect(formatDocxTimeSpent(600)).toBe("10 hrs");
    expect(formatDocxTimeSpent(570)).toBe("9 hrs 30 mins");
    expect(formatTotalHoursLabel(4800)).toBe("80 HRS");
    expect(formatTotalHoursLabel(4770)).toBe("79 HRS 30 MINS");
    expect(formatTotalHoursLabel(0)).toBe("0 HRS");
  });
});

describe("ReportMappingService", () => {
  it("blanks unused rows and orders by date", () => {
    const input = baseInput([
      {
        workDate: "2026-08-02",
        classification: "scheduled_off",
        classificationLabel: "Sunday",
        amArrival: null,
        amDeparture: null,
        pmArrival: null,
        pmDeparture: null,
        workedMinutes: 0,
        calculatedUndertimeMinutes: 0,
        undertimeOverrideMinutes: null,
        accomplishments: [],
        remarks: null,
      },
      {
        workDate: "2026-08-01",
        classification: "workday",
        classificationLabel: null,
        amArrival: "07:00",
        amDeparture: "12:00",
        pmArrival: "13:00",
        pmDeparture: "18:00",
        workedMinutes: 600,
        calculatedUndertimeMinutes: 0,
        undertimeOverrideMinutes: 30,
        accomplishments: ["Prepared docs", "Assisted visitors"],
        remarks: "ok",
      },
    ]);

    const payload = ReportMappingService.buildPayload(input);
    expect(payload.entries.map((e) => e.date)).toEqual(["2026-08-01", "2026-08-02"]);
    // Manual undertime override must not alter worked totals
    expect(payload.totalWorkedMinutes).toBe(600);

    const tokens = ReportMappingService.toFlatTokens(payload);
    expect(tokens.r01_date).toBe("August 1, 2026");
    expect(tokens.r01_am).toBe("7:00-12:00");
    expect(tokens.r01_pm).toBe("13:00-18:00");
    expect(tokens.r01_time_spent).toBe("10 hrs");
    expect(tokens.r01_accomplishment).toBe("Prepared docs / Assisted visitors");
    expect(tokens.r01_remarks).toBe("ok");
    expect(tokens.r02_am).toBe("-");
    expect(tokens.r02_accomplishment).toBe("SUNDAY");
    expect(tokens.r03_date).toBe("");
    expect(tokens.r16_remarks).toBe("");
    expect(tokens.total_hours_label).toBe("10 HRS");
  });

  it("maps four signatories and preserves casing / unicode / xml-sensitive text", () => {
    const input = baseInput([
      {
        workDate: "2026-08-01",
        classification: "workday",
        classificationLabel: null,
        amArrival: "07:00",
        amDeparture: "12:00",
        pmArrival: "13:00",
        pmDeparture: "18:00",
        workedMinutes: 600,
        calculatedUndertimeMinutes: 0,
        undertimeOverrideMinutes: null,
        accomplishments: ["Niño Aquino <briefing> & review"],
        remarks: "ñ",
      },
    ]);
    const tokens = ReportMappingService.toFlatTokens(
      ReportMappingService.buildPayload(input),
    );
    expect(tokens.employee_name).toBe("Maria Clara & José");
    expect(tokens.r01_accomplishment).toContain("<briefing>");
    expect(tokens.r01_accomplishment).toContain("Niño");
    expect(tokens.signatory_employee_name).toBe("Maria Clara & José");
    expect(tokens.signatory_1_title).toBe("Secretary");
    expect(tokens.signatory_3_name).toBe("Verifier Three");
  });

  it("joins accomplishments in UI order", () => {
    expect(joinAccomplishments([" B ", "A", ""])).toBe("B / A");
  });

  it("produces stable source revisions for identical payloads", () => {
    const input = baseInput([]);
    const payload = ReportMappingService.buildPayload(input);
    const a = ReportMappingService.sourceRevision(payload, ["abc"]);
    const b = ReportMappingService.sourceRevision(payload, ["abc"]);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});

describe("filename sanitization", () => {
  it("builds predictable sanitized filenames", () => {
    const name = buildAccomplishmentFilename({
      employeeName: 'Rodge Andru P. Viloria<>:"/\\|?*',
      startDate: "2026-08-01",
      endDate: "2026-08-15",
    });
    expect(name).toBe(
      "Auri_Rodge-Andru-P.-Viloria_2026-08-01_to_2026-08-15_Accomplishment.docx",
    );
  });
});
