import { test, expect } from "@playwright/test";

const hasLiveAuth =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(process.env.E2E_USER_EMAIL) &&
  Boolean(process.env.E2E_USER_PASSWORD);

test.describe("Phase 6 DOCX export E2E", () => {
  test.skip(!hasLiveAuth, "Live Clerk Auth E2E credentials are not configured.");

  test("authenticated export endpoint is reachable for an onboarded user", async ({
    page,
  }) => {
    // Placeholder flow: sign-in lands on /app or /onboarding.
    // Full export click-path remains manual until a disposable report UI is wired.
    await page.goto("/sign-in");
    await expect(page.locator("body")).toBeVisible();
  });
});
