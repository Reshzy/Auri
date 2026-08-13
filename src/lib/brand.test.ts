import { describe, expect, it } from "vitest";
import { AURI_DESCRIPTION, AURI_EYEBROW, AURI_PRIMARY_CTA, AURI_TAGLINE } from "./brand";

describe("brand copy", () => {
  it("keeps the approved landing language", () => {
    expect(AURI_EYEBROW).toBe("Your reporting routine, simplified.");
    expect(AURI_TAGLINE).toBe("Work, without the paperwork.");
    expect(AURI_PRIMARY_CTA).toBe("Create your report");
    expect(AURI_DESCRIPTION.toLowerCase()).not.toContain("government approved");
    expect(AURI_DESCRIPTION.toLowerCase()).not.toContain("error-free");
  });
});
