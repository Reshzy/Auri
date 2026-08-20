import { describe, expect, it } from "vitest";
import {
  AUTH_CONFIG_ERROR_BODY,
  AUTH_SIGN_IN_SWITCHER_ACTION,
  AUTH_SIGN_IN_SWITCHER_PROMPT,
  AUTH_SIGN_UP_DESCRIPTION,
  AUTH_SIGN_UP_SWITCHER_ACTION,
  AUTH_SIGN_UP_SWITCHER_PROMPT,
  isAuthConfigError,
} from "./copy";

describe("auth copy", () => {
  it("treats error=config as the workspace setup failure", () => {
    expect(isAuthConfigError("config")).toBe(true);
    expect(isAuthConfigError(["config"])).toBe(true);
    expect(isAuthConfigError("session")).toBe(false);
    expect(isAuthConfigError(undefined)).toBe(false);
  });

  it("names the missing systems and the next step", () => {
    expect(AUTH_CONFIG_ERROR_BODY).toContain("Clerk");
    expect(AUTH_CONFIG_ERROR_BODY).toContain("database");
    expect(AUTH_CONFIG_ERROR_BODY.toLowerCase()).not.toContain("error occurred");
  });

  it("expands DTR on sign-up instead of using the acronym alone", () => {
    expect(AUTH_SIGN_UP_DESCRIPTION).toContain("Daily Time Record");
    expect(AUTH_SIGN_UP_DESCRIPTION).not.toMatch(/\bDTR\b/);
  });

  it("keeps the account switcher on a named action", () => {
    expect(AUTH_SIGN_IN_SWITCHER_PROMPT).toBe("Don't have an account?");
    expect(AUTH_SIGN_IN_SWITCHER_ACTION).toBe("Sign up");
    expect(AUTH_SIGN_UP_SWITCHER_PROMPT).toBe("Already have an account?");
    expect(AUTH_SIGN_UP_SWITCHER_ACTION).toBe("Sign in");
  });
});
