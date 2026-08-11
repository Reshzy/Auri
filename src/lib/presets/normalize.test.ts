import { describe, expect, it } from "vitest";
import {
  normalizeAccomplishmentForCompare,
  normalizeShortcut,
} from "@/lib/presets/normalize";

describe("normalizeShortcut", () => {
  it("trims and lowercases", () => {
    expect(normalizeShortcut("  Vis  ")).toBe("vis");
  });

  it("returns null for empty or whitespace", () => {
    expect(normalizeShortcut("")).toBeNull();
    expect(normalizeShortcut("   ")).toBeNull();
    expect(normalizeShortcut(null)).toBeNull();
    expect(normalizeShortcut(undefined)).toBeNull();
  });
});

describe("normalizeAccomplishmentForCompare", () => {
  it("collapses whitespace and lowercases without altering meaning of stored text", () => {
    expect(normalizeAccomplishmentForCompare("  Assisted   Visitors  ")).toBe(
      "assisted visitors",
    );
  });
});
