/**
 * Snapshot shape tests (pure). Live snapshot builders are server-only and
 * covered via DAL ownership/integration mocks elsewhere — not live DB verification.
 */
import { describe, expect, it } from "vitest";
import type { WeekdayRules } from "@/lib/validation/onboarding";

type ProfileSnapshot = {
  employeeName: string;
  employeeTitle: string | null;
  organizationName: string | null;
  officeName: string | null;
  departmentName: string | null;
  timezone: string;
  locale: string;
};

type ScheduleSnapshot = {
  id: string;
  name: string;
  weekdayRules: WeekdayRules;
};

type SignatorySnapshot = {
  slot: number;
  displayName: string;
  title: string;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

describe("report snapshot shapes (Phase 3 builders)", () => {
  it("defines profile, schedule, and signatory snapshot contracts", () => {
    const profile: ProfileSnapshot = {
      employeeName: "Rodge Andru P. Viloria",
      employeeTitle: "COS Employee",
      organizationName: "Municipality of Sanchez Mira",
      officeName: "Vice Mayor’s Office",
      departmentName: null,
      timezone: "Asia/Manila",
      locale: "en-PH",
    };
    const schedule: ScheduleSnapshot = {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Compressed four-day week",
      weekdayRules: {
        monday: {
          isWorkday: true,
          amStart: "07:00",
          amEnd: "12:00",
          pmStart: "13:00",
          pmEnd: "18:00",
          offDayLabel: null,
        },
        tuesday: {
          isWorkday: true,
          amStart: "07:00",
          amEnd: "12:00",
          pmStart: "13:00",
          pmEnd: "18:00",
          offDayLabel: null,
        },
        wednesday: {
          isWorkday: true,
          amStart: "07:00",
          amEnd: "12:00",
          pmStart: "13:00",
          pmEnd: "18:00",
          offDayLabel: null,
        },
        thursday: {
          isWorkday: true,
          amStart: "07:00",
          amEnd: "12:00",
          pmStart: "13:00",
          pmEnd: "18:00",
          offDayLabel: null,
        },
        friday: {
          isWorkday: false,
          amStart: null,
          amEnd: null,
          pmStart: null,
          pmEnd: null,
          offDayLabel: "FRIDAY",
        },
        saturday: {
          isWorkday: false,
          amStart: null,
          amEnd: null,
          pmStart: null,
          pmEnd: null,
          offDayLabel: "SATURDAY",
        },
        sunday: {
          isWorkday: false,
          amStart: null,
          amEnd: null,
          pmStart: null,
          pmEnd: null,
          offDayLabel: "SUNDAY",
        },
      },
    };
    const signatories: SignatorySnapshot[] = [
      {
        slot: 0,
        displayName: "Rodge Andru P. Viloria",
        title: "Signature of COS Employee",
        isActive: true,
        effectiveFrom: null,
        effectiveTo: null,
      },
    ];

    expect(profile.employeeName).toContain("Rodge");
    expect(Object.keys(schedule.weekdayRules)).toHaveLength(7);
    expect(signatories[0]?.slot).toBe(0);
  });
});
