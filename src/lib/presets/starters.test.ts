import { describe, expect, it } from "vitest";
import { normalizeAccomplishmentForCompare } from "@/lib/presets/normalize";
import { STARTER_PRESETS } from "@/lib/presets/starters";

describe("STARTER_PRESETS", () => {
  it("contains the five exact master-spec contents", () => {
    expect(STARTER_PRESETS.map((p) => p.content)).toEqual([
      "Assisted visitors at the Office of the Vice Mayor",
      "Assisted the Vice Mayor in activities and programs",
      "Prepared, formatted, and printed official documents",
      "Edited photos and digital content for publications and presentations",
      "Attended the flag ceremony",
    ]);
  });

  it("has short labels and unique normalized content", () => {
    expect(STARTER_PRESETS).toHaveLength(5);
    const keys = STARTER_PRESETS.map((p) => normalizeAccomplishmentForCompare(p.content));
    expect(new Set(keys).size).toBe(5);
    for (const starter of STARTER_PRESETS) {
      expect(starter.label.length).toBeGreaterThan(0);
      expect(starter.label.length).toBeLessThanOrEqual(80);
    }
  });

  it("supports idempotent seed matching by normalized content", () => {
    const existing = [
      {
        content: "  assisted visitors at the office of the vice mayor ",
        isActive: false,
      },
    ];
    const existingKeys = new Set(
      existing.map((row) => normalizeAccomplishmentForCompare(row.content)),
    );
    const toInsert = STARTER_PRESETS.filter(
      (starter) => !existingKeys.has(normalizeAccomplishmentForCompare(starter.content)),
    );
    expect(toInsert).toHaveLength(4);
    expect(toInsert.some((s) => s.content.includes("Assisted visitors"))).toBe(false);
  });
});
