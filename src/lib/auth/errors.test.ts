import { describe, expect, it } from "vitest";
import {
  AUTH_REQUIRED_ERROR,
  DATABASE_UNAVAILABLE_ERROR,
  isAuthRequiredError,
  isDatabaseUnavailableError,
  isNextControlFlowError,
} from "./errors";

describe("auth errors", () => {
  it("detects AUTH_REQUIRED", () => {
    expect(isAuthRequiredError(new Error(AUTH_REQUIRED_ERROR))).toBe(true);
    expect(isAuthRequiredError(new Error("nope"))).toBe(false);
    expect(isAuthRequiredError("AUTH_REQUIRED")).toBe(false);
  });

  it("detects DATABASE_UNAVAILABLE", () => {
    expect(isDatabaseUnavailableError(new Error(DATABASE_UNAVAILABLE_ERROR))).toBe(
      true,
    );
    expect(isDatabaseUnavailableError(new Error(AUTH_REQUIRED_ERROR))).toBe(false);
  });

  it("detects Next.js redirect/not-found control flow", () => {
    expect(isNextControlFlowError({ digest: "NEXT_REDIRECT;replace;/sign-in" })).toBe(
      true,
    );
    expect(isNextControlFlowError({ digest: "NEXT_NOT_FOUND" })).toBe(true);
    expect(isNextControlFlowError({ digest: "OTHER" })).toBe(false);
    expect(isNextControlFlowError(new Error("fail"))).toBe(false);
  });
});
