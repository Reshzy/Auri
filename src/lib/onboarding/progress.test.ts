import { describe, expect, it } from "vitest";
import {
  clampOnboardingStep,
  hasCompletedProfile,
  hasCompletedSchedule,
  hasCompletedSignatories,
  isOnboardingComplete,
  parseOnboardingStep,
  resolveOnboardingStep,
} from "@/lib/onboarding/progress";
import {
  isAuthEntryPath,
  isOnboardingPath,
  isProtectedPath,
  requiresAuthentication,
  safeNextPath,
} from "@/lib/auth/paths";
import {
  profileSchema,
  signatoriesFormSchema,
  weekdayRulesSchema,
  workScheduleSchema,
} from "@/lib/validation/onboarding";
import {
  createCompressedWeekdayRules,
  createStandardWeekdayRules,
} from "@/lib/onboarding/defaults";
import { assertOwnerMatchesSession } from "@/db/dal/ownership";

describe("auth path helpers (Phase 3)", () => {
  it("requires authentication for /app and /onboarding", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isOnboardingPath("/onboarding")).toBe(true);
    expect(requiresAuthentication("/onboarding")).toBe(true);
    expect(requiresAuthentication("/app/settings/profile")).toBe(true);
    expect(requiresAuthentication("/login")).toBe(false);
  });

  it("does not treat onboarding as an auth-entry bounce target", () => {
    expect(isAuthEntryPath("/onboarding")).toBe(false);
    expect(isAuthEntryPath("/login")).toBe(true);
  });

  it("keeps next-path sanitization", () => {
    expect(safeNextPath("/onboarding")).toBe("/onboarding");
    expect(safeNextPath("//evil")).toBe("/app");
  });
});

describe("onboarding progress inference", () => {
  it("starts at welcome until employee name is saved", () => {
    expect(
      resolveOnboardingStep({
        employeeName: "",
        activeScheduleId: null,
        signatoryCount: 0,
        templatesAvailable: false,
        onboardingCompletedAt: null,
      }),
    ).toBe("welcome");
  });

  it("advances through schedule, signatories, templates, then ready", () => {
    expect(
      resolveOnboardingStep({
        employeeName: "Rodge",
        activeScheduleId: null,
        signatoryCount: 0,
        templatesAvailable: true,
        onboardingCompletedAt: null,
      }),
    ).toBe("schedule");

    expect(
      resolveOnboardingStep({
        employeeName: "Rodge",
        activeScheduleId: "11111111-1111-4111-8111-111111111111",
        signatoryCount: 2,
        templatesAvailable: true,
        onboardingCompletedAt: null,
      }),
    ).toBe("signatories");

    expect(
      resolveOnboardingStep({
        employeeName: "Rodge",
        activeScheduleId: "11111111-1111-4111-8111-111111111111",
        signatoryCount: 4,
        templatesAvailable: false,
        onboardingCompletedAt: null,
      }),
    ).toBe("templates");

    expect(
      resolveOnboardingStep({
        employeeName: "Rodge",
        activeScheduleId: "11111111-1111-4111-8111-111111111111",
        signatoryCount: 4,
        templatesAvailable: true,
        onboardingCompletedAt: null,
      }),
    ).toBe("ready");
  });

  it("allows welcome → profile without persisted data, but blocks skipping ahead", () => {
    expect(clampOnboardingStep("profile", "welcome")).toBe("profile");
    expect(clampOnboardingStep("schedule", "welcome")).toBe("welcome");
    expect(clampOnboardingStep("welcome", "schedule")).toBe("welcome");
    expect(clampOnboardingStep("ready", "signatories")).toBe("signatories");
  });

  it("parses steps and completion helpers", () => {
    expect(parseOnboardingStep("templates")).toBe("templates");
    expect(parseOnboardingStep("nope")).toBeNull();
    expect(hasCompletedProfile("Ada")).toBe(true);
    expect(hasCompletedSchedule(null)).toBe(false);
    expect(hasCompletedSignatories(4)).toBe(true);
    expect(isOnboardingComplete("2026-08-11T00:00:00Z")).toBe(true);
  });
});

describe("onboarding Zod validation", () => {
  it("accepts sample compressed seven-day rules", () => {
    const parsed = weekdayRulesSchema.safeParse(createCompressedWeekdayRules());
    expect(parsed.success).toBe(true);
  });

  it("accepts standard five-day rules", () => {
    const parsed = weekdayRulesSchema.safeParse(createStandardWeekdayRules());
    expect(parsed.success).toBe(true);
  });

  it("rejects incomplete weekday coverage", () => {
    const rules = createCompressedWeekdayRules();
    // @ts-expect-error intentional incomplete object
    delete rules.sunday;
    expect(weekdayRulesSchema.safeParse(rules).success).toBe(false);
  });

  it("rejects workdays missing times", () => {
    const rules = createCompressedWeekdayRules();
    rules.monday.amStart = null;
    expect(weekdayRulesSchema.safeParse(rules).success).toBe(false);
  });

  it("validates profile and schedule payloads", () => {
    expect(
      profileSchema.safeParse({
        employeeName: "Rodge Andru P. Viloria",
        employeeTitle: "COS Employee",
        organizationName: "Municipality of Sanchez Mira",
        officeName: "Vice Mayor’s Office",
        departmentName: "",
        timezone: "Asia/Manila",
        locale: "en-PH",
      }).success,
    ).toBe(true);

    expect(
      workScheduleSchema.safeParse({
        name: "Compressed",
        weekdayRules: createCompressedWeekdayRules(),
      }).success,
    ).toBe(true);
  });

  it("requires four signatory slots", () => {
    const ok = signatoriesFormSchema.safeParse({
      signatories: [0, 1, 2, 3].map((slot) => ({
        slot,
        displayName: `Name ${slot}`,
        title: `Title ${slot}`,
        isActive: true,
        effectiveFrom: null,
        effectiveTo: null,
      })),
    });
    expect(ok.success).toBe(true);
    expect(signatoriesFormSchema.safeParse({ signatories: [] }).success).toBe(false);
  });
});

describe("ownership rejection of client-supplied user ids", () => {
  it("allows omitted owner ids and matching session ids", () => {
    expect(() => assertOwnerMatchesSession("user-a", undefined)).not.toThrow();
    expect(() => assertOwnerMatchesSession("user-a", "user-a")).not.toThrow();
  });

  it("rejects mismatched or non-string owner ids", () => {
    expect(() => assertOwnerMatchesSession("user-a", "user-b")).toThrow(/not allowed/);
    expect(() => assertOwnerMatchesSession("user-a", 123)).toThrow(/not allowed/);
  });
});
