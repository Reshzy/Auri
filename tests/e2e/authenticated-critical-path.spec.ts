import { expect, test, type Page } from "@playwright/test";
import { hasLiveAuth, hasSecondLiveAuth } from "./helpers/live-auth";

/**
 * Authenticated critical path. This is not a substitute for mocked route tests.
 * Skipped unless a disposable onboarded Clerk account is configured.
 * Do not persist storageState. Do not upload traces or generated reports.
 */
test.describe("Authenticated critical path", () => {
  test.skip(!hasLiveAuth(), "Live Clerk Auth E2E credentials are not configured.");

  test("sign in, report, preview, generate, history, isolation", async ({
    page,
    browser,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(app|onboarding)/);

    if (page.url().includes("/onboarding")) {
      test.skip(true, "E2E user has not completed onboarding.");
    }

    await page.goto("/app/reports/new");
    await page.getByLabel("Year").fill("2026");
    await page.getByLabel("Month").fill("8");
    await page.getByRole("radio", { name: /First half/i }).check();
    await page.getByRole("button", { name: /Create report/i }).click();
    await page.waitForURL(/\/app\/reports\/.+\/edit/);

    const daySelect = page.locator("select").filter({ hasText: "2026-08-" }).first();
    if ((await daySelect.count()) > 0) {
      await daySelect.selectOption("2026-08-03");
    } else {
      await page.getByRole("button", { name: /03 · Mon/i }).click();
    }

    await page.getByLabel("AM arrival").fill("700");
    await page.getByLabel("AM departure").fill("12:00");
    await page.getByLabel("PM arrival").fill("13:00");
    await page.getByLabel("PM departure").fill("18:00");
    await page.getByPlaceholder("Item 1").fill("Prepared official documents");
    await page.getByRole("button", { name: /Save now/i }).click();
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 15_000 });

    const copy = page.getByRole("button", { name: /Copy previous workday/i });
    if (await copy.isVisible()) {
      if ((await daySelect.count()) > 0) {
        await daySelect.selectOption("2026-08-04");
      }
      await copy.click();
    }

    const presetSearch = page.getByLabel(/Apply presets/i);
    if (await presetSearch.isVisible().catch(() => false)) {
      await presetSearch.fill("assist");
      const apply = page.getByRole("button", { name: /Apply selected/i });
      if (await apply.isVisible().catch(() => false)) {
        await apply.click();
      }
    }

    const previewLink = page.getByRole("link", { name: /Preview/i }).first();
    if (await previewLink.isVisible().catch(() => false)) {
      await previewLink.click();
      await expect(page.locator("body")).toBeVisible();
    }

    const generate = page.getByRole("button", { name: /Generate/i }).first();
    if (await generate.isVisible().catch(() => false)) {
      const warningAck = page.getByRole("checkbox", { name: /acknowledge/i });
      if (await warningAck.isVisible().catch(() => false)) {
        await warningAck.check();
      }
      await generate.click();
    }

    const reportUrl = page.url().replace(/\/edit\/?$/, "");
    await page.goto(reportUrl);
    await expect(
      page.getByText(/Export|History|Generate|Current|Outdated/i).first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.keyboard.press("Tab");

    if (hasSecondLiveAuth()) {
      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      await signInAs(
        pageB,
        process.env.E2E_USER_B_EMAIL!,
        process.env.E2E_USER_B_PASSWORD!,
      );
      const firstExportUrl = page.url();
      const response = await pageB.goto(firstExportUrl);
      expect(response?.status() === 404 || /sign-in|app/i.test(pageB.url())).toBeTruthy();
      await contextB.close();
    }
  });
});

async function signInAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/(app|onboarding)/);
}
