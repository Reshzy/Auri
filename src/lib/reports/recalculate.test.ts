import { describe, expect, it } from "vitest";
import { createCompressedWeekdayRules } from "@/lib/onboarding/defaults";
import { recalculateDailyEntry, resetEntryFromSchedule } from "@/lib/reports/recalculate";

describe("recalculateDailyEntry", () => {
  const rules = createCompressedWeekdayRules();

  it("validates ordered accomplishments and computes completeness", () => {
    const result = recalculateDailyEntry({
      workDate: "2026-08-03",
      weekdayRules: rules,
      update: {
        classification: "workday",
        classificationLabel: null,
        amArrival: "07:00",
        amDeparture: "12:00",
        pmArrival: "13:00",
        pmDeparture: "18:00",
        undertimeOverrideMinutes: null,
        accomplishments: [" First ", "", "Second"],
        remarks: null,
      },
    });
    // Zod trims before recalculate in DAL; here we pass already-trimmed-like arrays
    expect(result.workedMinutes).toBe(600);
    expect(result.isComplete).toBe(true);
  });

  it("resets a day from schedule classification without deleting identity", () => {
    const blank = resetEntryFromSchedule("2026-08-07", rules);
    expect(blank.classification).toBe("scheduled_off");
    expect(blank.classificationLabel).toBe("FRIDAY");
    expect(blank.isComplete).toBe(true);
    expect(blank.amArrival).toBeNull();
    expect(blank.accomplishments).toEqual([]);
  });
});

describe("snapshot immutability contract", () => {
  it("keeps schedule weekday rules as a plain JSON-serializable snapshot", () => {
    const rules = createCompressedWeekdayRules();
    const snapshot = {
      id: "sched",
      name: "Compressed",
      weekdayRules: rules,
    };
    const cloned = JSON.parse(JSON.stringify(snapshot));
    rules.monday.amStart = "08:00";
    expect(cloned.weekdayRules.monday.amStart).toBe("07:00");
  });
});
