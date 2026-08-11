import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/features/auth/schemas";

describe("auth schemas", () => {
  it("accepts valid sign-in credentials", () => {
    const parsed = signInSchema.safeParse({
      email: "user@example.com",
      password: "secret",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires a longer password on sign-up", () => {
    expect(
      signUpSchema.safeParse({
        email: "user@example.com",
        password: "short",
      }).success,
    ).toBe(false);

    expect(
      signUpSchema.safeParse({
        email: "user@example.com",
        password: "long-enough",
      }).success,
    ).toBe(true);
  });

  it("validates forgot-password email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "user@example.com" }).success).toBe(
      true,
    );
  });

  it("requires matching passwords on reset", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "long-enough",
        confirmPassword: "different",
      }).success,
    ).toBe(false);

    expect(
      resetPasswordSchema.safeParse({
        password: "long-enough",
        confirmPassword: "long-enough",
      }).success,
    ).toBe(true);
  });
});
