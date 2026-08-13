import { describe, expect, it } from "vitest";
import { documentSecurityHeaders, privateApiCacheHeaders } from "@/lib/security-headers";

describe("security headers", () => {
  it("sets nosniff, frame deny, and private API cache", () => {
    const keys = documentSecurityHeaders.map((header) => header.key);
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Cross-Origin-Opener-Policy");
    expect(
      documentSecurityHeaders.find((header) => header.key === "X-Frame-Options")?.value,
    ).toBe("DENY");
    expect(privateApiCacheHeaders[0]).toEqual({
      key: "Cache-Control",
      value: "private, no-store",
    });
  });

  it("does not ship a guessed Clerk CSP", () => {
    expect(
      documentSecurityHeaders.some((header) => header.key === "Content-Security-Policy"),
    ).toBe(false);
  });
});
