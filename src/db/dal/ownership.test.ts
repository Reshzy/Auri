import { describe, expect, it } from "vitest";
import { assertOwnerMatchesSession } from "@/db/dal/ownership";

describe("ownership guards", () => {
  const sessionUserId = "11111111-1111-4111-8111-111111111111";

  it("allows omitted client owner fields", () => {
    expect(() => assertOwnerMatchesSession(sessionUserId, undefined)).not.toThrow();
    expect(() => assertOwnerMatchesSession(sessionUserId, null)).not.toThrow();
  });

  it("rejects mismatched or non-string client owner ids", () => {
    expect(() =>
      assertOwnerMatchesSession(sessionUserId, "22222222-2222-4222-8222-222222222222"),
    ).toThrow(/Client-supplied owner id/);
    expect(() => assertOwnerMatchesSession(sessionUserId, 123)).toThrow(
      /Client-supplied owner id/,
    );
  });

  it("allows an explicit owner id only when it matches the session", () => {
    expect(() => assertOwnerMatchesSession(sessionUserId, sessionUserId)).not.toThrow();
  });
});
