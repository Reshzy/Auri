import { describe, expect, it } from "vitest";
import {
  calculateWorkedMinutes,
  normalizeAndValidateDayTimes,
  normalizeTimeInput,
} from "@/lib/reports/time";
import { calculateUndertimeMinutes, workedAndUndertime } from "@/lib/reports/undertime";
import { formatTotalHoursLabel } from "@/lib/reports/totals";

describe("normalizeTimeInput", () => {
  it("normalizes 700, 7:00, 07:00, and Postgres HH:MM:SS", () => {
    expect(normalizeTimeInput("700")).toEqual({ ok: true, value: "07:00" });
    expect(normalizeTimeInput("7:00")).toEqual({ ok: true, value: "07:00" });
    expect(normalizeTimeInput("07:00")).toEqual({ ok: true, value: "07:00" });
    expect(normalizeTimeInput("07:15:00")).toEqual({ ok: true, value: "07:15" });
  });

  it("rejects invalid formats", () => {
    expect(normalizeTimeInput("25:00").ok).toBe(false);
    expect(normalizeTimeInput("abc").ok).toBe(false);
    expect(normalizeTimeInput("7").ok).toBe(false);
  });
});

describe("session validation", () => {
  it("requires arrival/departure pairs", () => {
    const result = normalizeAndValidateDayTimes({
      amArrival: "07:00",
      amDeparture: null,
      pmArrival: null,
      pmDeparture: null,
    });
    expect(result.issues.some((i) => i.field === "am")).toBe(true);
  });

  it("rejects arrival after departure", () => {
    const result = normalizeAndValidateDayTimes({
      amArrival: "12:00",
      amDeparture: "07:00",
      pmArrival: null,
      pmDeparture: null,
    });
    expect(result.issues[0]?.message).toMatch(/earlier/);
  });

  it("rejects overlapping AM/PM sessions", () => {
    const result = normalizeAndValidateDayTimes({
      amArrival: "07:00",
      amDeparture: "14:00",
      pmArrival: "13:00",
      pmDeparture: "18:00",
    });
    expect(result.issues.some((i) => i.field === "cross")).toBe(true);
  });
});

describe("worked and undertime", () => {
  const scheduled = {
    amStart: "07:00",
    amEnd: "12:00",
    pmStart: "13:00",
    pmEnd: "18:00",
  };

  it("calculates 600 minutes for a full compressed day", () => {
    expect(
      calculateWorkedMinutes(
        { arrival: "07:00", departure: "12:00" },
        { arrival: "13:00", departure: "18:00" },
      ),
    ).toBe(600);
  });

  it("calculates late-arrival undertime", () => {
    expect(
      calculateUndertimeMinutes(
        {
          am: { arrival: "07:30", departure: "12:00" },
          pm: { arrival: "13:00", departure: "18:00" },
        },
        scheduled,
      ),
    ).toBe(30);
  });

  it("calculates early-departure undertime", () => {
    expect(
      calculateUndertimeMinutes(
        {
          am: { arrival: "07:00", departure: "11:30" },
          pm: { arrival: "13:00", departure: "18:00" },
        },
        scheduled,
      ),
    ).toBe(30);
  });

  it("does not let overtime cancel undertime", () => {
    expect(
      calculateUndertimeMinutes(
        {
          am: { arrival: "06:00", departure: "12:00" },
          pm: { arrival: "13:00", departure: "17:00" },
        },
        scheduled,
      ),
    ).toBe(60);
  });

  it("preserves calculated undertime when override is set", () => {
    const result = workedAndUndertime({
      am: { arrival: "07:30", departure: "12:00" },
      pm: { arrival: "13:00", departure: "18:00" },
      scheduled,
      undertimeOverrideMinutes: 0,
    });
    expect(result.calculatedUndertimeMinutes).toBe(30);
    expect(result.finalUndertimeMinutes).toBe(0);
  });
});

describe("formatTotalHoursLabel", () => {
  it("formats whole hours, mixed, and zero", () => {
    expect(formatTotalHoursLabel(4800)).toBe("80 HRS");
    expect(formatTotalHoursLabel(4770)).toBe("79 HRS 30 MINS");
    expect(formatTotalHoursLabel(0)).toBe("0 HRS");
  });
});
