import { describe, expect, it } from "vitest";
import { createCompressedWeekdayRules } from "@/lib/onboarding/defaults";
import { validateReport } from "@/server/services/report-validation";

const schedule = {
  id: "sched-1",
  name: "Compressed",
  weekdayRules: createCompressedWeekdayRules(),
};

const profile = {
  employeeName: "Test User",
  employeeTitle: "COS",
  organizationName: "Municipality",
  officeName: "Office",
  departmentName: null,
  timezone: "Asia/Manila",
  locale: "en-PH",
};

const signatories = [0, 1, 2, 3].map((slot) => ({
  slot,
  displayName: `Person ${slot}`,
  title: `Title ${slot}`,
  isActive: true,
  effectiveFrom: null,
  effectiveTo: null,
}));

const templates = [
  {
    key: "accomplishment" as const,
    label: "DOCX",
    fileType: "docx" as const,
    dbActive: false,
    manifestPresent: true,
    sourcePresent: true,
    available: true,
    version: 1,
    sha256: "abc",
  },
  {
    key: "dtr" as const,
    label: "XLSX",
    fileType: "xlsx" as const,
    dbActive: false,
    manifestPresent: true,
    sourcePresent: true,
    available: true,
    version: 1,
    sha256: "def",
  },
];

describe("validateReport", () => {
  it("blocks incomplete workdays and missing accomplishments", () => {
    const result = validateReport({
      report: {
        id: "r1",
        startDate: "2026-08-01",
        endDate: "2026-08-01",
        status: "draft",
        createdAt: "2026-08-01T00:00:00.000Z",
        snapshotsRefreshedAt: null,
        profileSnapshot: profile,
        scheduleSnapshot: schedule,
        signatorySnapshot: signatories,
      },
      entries: [
        {
          id: "e1",
          workDate: "2026-08-01",
          classification: "workday",
          classificationLabel: null,
          amArrival: null,
          amDeparture: null,
          pmArrival: null,
          pmDeparture: null,
          workedMinutes: 0,
          calculatedUndertimeMinutes: 0,
          undertimeOverrideMinutes: null,
          accomplishments: [],
          remarks: null,
          isComplete: false,
        },
      ],
      templates,
    });
    expect(result.ready).toBe(false);
    expect(result.errors.some((e) => e.code === "WORKDAY_INCOMPLETE")).toBe(true);
  });

  it("treats labeled scheduled-off as complete", () => {
    const result = validateReport({
      report: {
        id: "r1",
        startDate: "2026-08-01",
        endDate: "2026-08-01",
        status: "draft",
        createdAt: "2026-08-01T00:00:00.000Z",
        snapshotsRefreshedAt: null,
        profileSnapshot: profile,
        scheduleSnapshot: schedule,
        signatorySnapshot: signatories,
      },
      entries: [
        {
          id: "e1",
          workDate: "2026-08-01",
          classification: "scheduled_off",
          classificationLabel: "SATURDAY",
          amArrival: null,
          amDeparture: null,
          pmArrival: null,
          pmDeparture: null,
          workedMinutes: 0,
          calculatedUndertimeMinutes: 0,
          undertimeOverrideMinutes: null,
          accomplishments: [],
          remarks: null,
          isComplete: true,
        },
      ],
      templates,
    });
    expect(result.errors.filter((e) => e.workDate === "2026-08-01")).toHaveLength(0);
    expect(result.ready).toBe(true);
  });

  it("warns on manual undertime override", () => {
    const result = validateReport({
      report: {
        id: "r1",
        startDate: "2026-08-03",
        endDate: "2026-08-03",
        status: "draft",
        createdAt: "2026-08-01T00:00:00.000Z",
        snapshotsRefreshedAt: null,
        profileSnapshot: profile,
        scheduleSnapshot: schedule,
        signatorySnapshot: signatories,
      },
      entries: [
        {
          id: "e1",
          workDate: "2026-08-03",
          classification: "workday",
          classificationLabel: null,
          amArrival: "07:00",
          amDeparture: "12:00",
          pmArrival: "13:00",
          pmDeparture: "18:00",
          workedMinutes: 600,
          calculatedUndertimeMinutes: 30,
          undertimeOverrideMinutes: 0,
          accomplishments: ["Did work"],
          remarks: null,
          isComplete: true,
        },
      ],
      templates,
    });
    expect(result.warnings.some((w) => w.code === "MANUAL_UNDERTIME_OVERRIDE")).toBe(
      true,
    );
  });
});
