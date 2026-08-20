import { describe, expect, it } from "vitest";
import { formatCompletionSummary, formatStatus } from "./labels";

describe("formatCompletionSummary", () => {
  it("names missing days in the compact validation line", () => {
    expect(
      formatCompletionSummary({
        progressLabel: "12/15",
        incompleteOrInvalidCount: 3,
        totalWorkedLabel: "64h",
      }),
    ).toBe("Progress 12/15 · 64h · 3 missing/incomplete");
  });

  it("says all days complete when none are missing", () => {
    expect(
      formatCompletionSummary({
        progressLabel: "15/15",
        incompleteOrInvalidCount: 0,
        totalWorkedLabel: "80h",
      }),
    ).toBe("Progress 15/15 · 80h · All days complete");
  });
});

describe("formatStatus", () => {
  it("capitalizes report status", () => {
    expect(formatStatus("draft")).toBe("Draft");
  });
});
