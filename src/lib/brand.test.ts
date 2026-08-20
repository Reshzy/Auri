import { describe, expect, it } from "vitest";
import {
  AURI_DESCRIPTION,
  AURI_EYEBROW,
  AURI_HERO_BODY,
  AURI_PRIMARY_CTA,
  AURI_PRIMARY_CTA_HINT,
  AURI_TAGLINE,
} from "./brand";

describe("brand copy", () => {
  it("keeps the approved landing language", () => {
    expect(AURI_EYEBROW).toBe("Your reporting routine, simplified.");
    expect(AURI_TAGLINE).toBe("Work, without the paperwork.");
    expect(AURI_PRIMARY_CTA).toBe("Create your report");
    expect(AURI_PRIMARY_CTA_HINT).toBe("You’ll create an account first.");
    expect(AURI_HERO_BODY).toContain("Daily Time Record (DTR)");
    expect(AURI_DESCRIPTION.toLowerCase()).not.toContain("government approved");
    expect(AURI_DESCRIPTION.toLowerCase()).not.toContain("error-free");
  });
});
