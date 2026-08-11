import { describe, expect, it } from "vitest";
import {
  datesForPreset,
  eachDateInclusive,
  periodRangeForPreset,
  weekdayKeyForYmd,
} from "@/lib/dates/period";
import { classifyDateFromSchedule } from "@/lib/reports/classify";
import { createCompressedWeekdayRules } from "@/lib/onboarding/defaults";
import {
  AUGUST_2026_FIRST_HALF,
  assertAugust2026FixtureTotals,
  buildAugust2026Classifications,
} from "../../../tests/fixtures/reports/august-2026-first-half";

describe("period date generation", () => {
  it("creates 15 first-half dates", () => {
    const dates = datesForPreset(2026, 8, "FIRST_HALF");
    expect(dates).toHaveLength(15);
    expect(dates[0]).toBe("2026-08-01");
    expect(dates[14]).toBe("2026-08-15");
  });

  it("creates second-half for 28/29/30/31-day months", () => {
    expect(datesForPreset(2026, 2, "SECOND_HALF")).toHaveLength(13); // 16-28
    expect(datesForPreset(2028, 2, "SECOND_HALF")).toEqual(
      eachDateInclusive("2028-02-16", "2028-02-29"),
    );
    expect(datesForPreset(2026, 4, "SECOND_HALF")).toHaveLength(15); // 16-30
    expect(datesForPreset(2026, 8, "SECOND_HALF")).toHaveLength(16); // 16-31
  });

  it("keeps Manila weekday for Aug 1 2026 as Saturday", () => {
    expect(weekdayKeyForYmd("2026-08-01")).toBe("saturday");
    expect(weekdayKeyForYmd("2026-08-03")).toBe("monday");
  });
});

describe("August 2026 first-half fixture", () => {
  it("classifies workdays and scheduled-off dates correctly", () => {
    const classified = buildAugust2026Classifications();
    const workdays = classified
      .filter((d) => d.classification === "workday")
      .map((d) => d.workDate);
    const off = classified
      .filter((d) => d.classification === "scheduled_off")
      .map((d) => d.workDate);

    expect(workdays).toEqual([...AUGUST_2026_FIRST_HALF.expectedWorkdays]);
    expect(off).toEqual([...AUGUST_2026_FIRST_HALF.expectedScheduledOff]);
    expect(periodRangeForPreset(2026, 8, "FIRST_HALF")).toEqual({
      startDate: "2026-08-01",
      endDate: "2026-08-15",
    });
  });

  it("totals 4800 minutes / 80 HRS for eight complete workdays", () => {
    const { totalMinutes, label } = assertAugust2026FixtureTotals();
    expect(totalMinutes).toBe(4800);
    expect(label).toBe("80 HRS");
  });

  it("marks scheduled-off complete when label present", () => {
    const rules = createCompressedWeekdayRules();
    const friday = classifyDateFromSchedule("2026-08-07", rules);
    expect(friday.classification).toBe("scheduled_off");
    expect(friday.classificationLabel).toBe("FRIDAY");
    expect(friday.isComplete).toBe(true);
  });
});
