import { describe, expect, it } from "vitest";
import {
  applyPresetsSchema,
  presetSchema,
  SHORTCUT_CONFLICT_MESSAGE,
} from "@/lib/validation/presets";

describe("presetSchema", () => {
  it("trims required fields and preserves original casing", () => {
    const parsed = presetSchema.parse({
      label: "  Assisted Visitors  ",
      content: "  Assisted visitors at the Office  ",
      category: "  Front Desk  ",
      shortcut: "  VIS  ",
    });
    expect(parsed.label).toBe("Assisted Visitors");
    expect(parsed.content).toBe("Assisted visitors at the Office");
    expect(parsed.category).toBe("Front Desk");
    expect(parsed.shortcut).toBe("vis");
  });

  it("rejects empty label/content and overlong content", () => {
    expect(presetSchema.safeParse({ label: " ", content: "ok" }).success).toBe(false);
    expect(presetSchema.safeParse({ label: "ok", content: "" }).success).toBe(false);
    expect(
      presetSchema.safeParse({ label: "ok", content: "x".repeat(501) }).success,
    ).toBe(false);
  });

  it("maps empty optional fields to null", () => {
    const parsed = presetSchema.parse({
      label: "Label",
      content: "Content",
      category: "",
      shortcut: "   ",
    });
    expect(parsed.category).toBeNull();
    expect(parsed.shortcut).toBeNull();
  });

  it("rejects unknown ownership fields via strict mode", () => {
    expect(
      presetSchema.safeParse({
        label: "Label",
        content: "Content",
        user_id: "00000000-0000-4000-8000-000000000001",
        use_count: 9,
      }).success,
    ).toBe(false);
  });

  it("documents shortcut conflict message", () => {
    expect(SHORTCUT_CONFLICT_MESSAGE).toMatch(/shortcut/i);
  });
});

describe("applyPresetsSchema", () => {
  it("requires report, entry, and at least one preset id", () => {
    const ok = applyPresetsSchema.safeParse({
      reportId: "00000000-0000-4000-8000-000000000001",
      entryId: "00000000-0000-4000-8000-000000000002",
      presetIds: ["00000000-0000-4000-8000-000000000003"],
    });
    expect(ok.success).toBe(true);
    expect(
      applyPresetsSchema.safeParse({
        reportId: "bad",
        entryId: "00000000-0000-4000-8000-000000000002",
        presetIds: [],
      }).success,
    ).toBe(false);
  });
});
