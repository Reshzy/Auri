import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "./site";

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to localhost when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getSiteUrl().origin).toBe("http://localhost:3000");
  });

  it("parses a configured public site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://auri.example");
    expect(getSiteUrl().origin).toBe("https://auri.example");
  });
});
