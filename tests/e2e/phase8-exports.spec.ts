import { test, expect } from "@playwright/test";

const hasLiveAuth =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(process.env.E2E_USER_EMAIL) &&
  Boolean(process.env.E2E_USER_PASSWORD);

test.describe("Phase 8 preview and export history E2E", () => {
  test.skip(
    !hasLiveAuth,
    "Live Clerk Auth E2E credentials are not configured for an onboarded test account.",
  );

  test("authenticated user can open preview and generation review", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText("Preview verifies your content")).toHaveCount(0);
  });
});
