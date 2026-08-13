import { afterEach, describe, expect, it, vi } from "vitest";
import { prefersReducedMotion } from "./motion";

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is false during server render", () => {
    vi.stubGlobal("window", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("reads the reduced-motion media query", () => {
    vi.stubGlobal("window", {
      matchMedia: (query: string) => ({
        matches: query.includes("prefers-reduced-motion: reduce"),
      }),
    });
    expect(prefersReducedMotion()).toBe(true);
  });
});
