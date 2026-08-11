import { describe, expect, it } from "vitest";
import { filterPresets, findExactShortcutMatch } from "@/lib/presets/search";

const rows = [
  {
    label: "Visitors",
    content: "Assisted visitors at the Office of the Vice Mayor",
    category: "Front desk",
    shortcut: "vis",
  },
  {
    label: "Flag",
    content: "Attended the flag ceremony",
    category: null,
    shortcut: "flag",
  },
];

describe("filterPresets", () => {
  it("matches label, content, category, and shortcut", () => {
    expect(filterPresets(rows, "visitors")).toHaveLength(1);
    expect(filterPresets(rows, "front desk")).toHaveLength(1);
    expect(filterPresets(rows, "FLAG")).toHaveLength(1);
    expect(filterPresets(rows, "ceremony")).toHaveLength(1);
    expect(filterPresets(rows, "xyz")).toHaveLength(0);
  });

  it("returns all rows for empty query", () => {
    expect(filterPresets(rows, "  ")).toHaveLength(2);
  });
});

describe("findExactShortcutMatch", () => {
  it("matches shortcuts case-insensitively", () => {
    expect(findExactShortcutMatch(rows, "VIS")?.label).toBe("Visitors");
    expect(findExactShortcutMatch(rows, "nope")).toBeNull();
  });
});
