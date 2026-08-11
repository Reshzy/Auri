import { describe, expect, it } from "vitest";
import {
  isAuthEntryPath,
  isOnboardingPath,
  isProtectedPath,
  requiresAuthentication,
  safeNextPath,
} from "@/lib/auth/paths";

describe("auth path helpers", () => {
  it("marks /app routes as protected", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isProtectedPath("/app/reports")).toBe(true);
    expect(isProtectedPath("/app/settings/profile")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });

  it("requires authentication for onboarding", () => {
    expect(isOnboardingPath("/onboarding")).toBe(true);
    expect(requiresAuthentication("/onboarding")).toBe(true);
    expect(requiresAuthentication("/app")).toBe(true);
    expect(requiresAuthentication("/sign-up")).toBe(false);
  });

  it("marks auth entry pages that signed-in users should leave", () => {
    expect(isAuthEntryPath("/sign-in")).toBe(true);
    expect(isAuthEntryPath("/sign-up")).toBe(true);
    expect(isAuthEntryPath("/login")).toBe(true);
    expect(isAuthEntryPath("/signup")).toBe(true);
    expect(isAuthEntryPath("/forgot-password")).toBe(true);
    expect(isAuthEntryPath("/onboarding")).toBe(false);
  });

  it("sanitizes next redirect targets", () => {
    expect(safeNextPath("/app/reports")).toBe("/app/reports");
    expect(safeNextPath("//evil.example")).toBe("/app");
    expect(safeNextPath("https://evil.example")).toBe("/app");
    expect(safeNextPath(null, "/sign-in")).toBe("/sign-in");
  });
});
