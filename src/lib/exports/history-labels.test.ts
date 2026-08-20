import { describe, expect, it } from "vitest";
import { formatExportFreshness, formatExportTemplateLabels } from "./history-labels";

describe("formatExportTemplateLabels", () => {
  it("joins template keys and versions", () => {
    expect(
      formatExportTemplateLabels([
        { key: "accomplishment", version: 3 },
        { key: "dtr", version: 2 },
      ]),
    ).toBe("accomplishment v3 + dtr v2");
  });

  it("falls back when the list is empty", () => {
    expect(formatExportTemplateLabels([])).toBe("Template unknown");
  });
});

describe("formatExportFreshness", () => {
  it("labels current and outdated files in words", () => {
    expect(formatExportFreshness("current")).toBe("Current");
    expect(formatExportFreshness("outdated")).toBe("Outdated");
  });
});
