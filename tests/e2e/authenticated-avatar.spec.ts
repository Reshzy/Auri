import { expect, test } from "@playwright/test";
import { hasLiveAuth } from "./helpers/live-auth";

const sproutsAvatar = 'img[src*="api.dicebear.com/10.x/sprouts/svg"]';

test.describe("DiceBear profile avatars", () => {
  test.skip(!hasLiveAuth(), "Live Auth E2E credentials are not configured.");

  test("shows sprouts animation avatars in app chrome and marketing", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(app|onboarding)/);

    if (page.url().includes("/onboarding")) {
      test.skip(true, "E2E user has not completed onboarding.");
    }

    await page.goto("/app");
    const sidebarAvatar = page.locator(`aside ${sproutsAvatar}`);
    await expect(sidebarAvatar).toBeVisible();
    await expect(sidebarAvatar).toHaveAttribute("src", /tags=animation/);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileHeaderAvatar = page.locator("header").locator(sproutsAvatar);
    await expect(mobileHeaderAvatar).toBeVisible();

    await page.goto("/");
    const marketingHeaderAvatar = page.locator("header").locator(sproutsAvatar);
    await expect(marketingHeaderAvatar).toBeVisible();
    await expect(marketingHeaderAvatar).toHaveAttribute("src", /tags=animation/);
  });
});
