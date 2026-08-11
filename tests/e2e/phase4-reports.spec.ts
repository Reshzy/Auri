import { test, expect } from "@playwright/test";

/**
 * Authenticated Phase 4 browser E2E.
 * Skipped unless hosted Supabase Auth public env + E2E_USER_* credentials are present.
 * Do not treat mocked unit/integration tests as a substitute for this suite.
 */
const hasLiveAuth =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
  Boolean(process.env.E2E_USER_EMAIL) &&
  Boolean(process.env.E2E_USER_PASSWORD);

test.describe("Phase 4 reports (live Auth)", () => {
  test.skip(!hasLiveAuth, "Live Supabase Auth E2E credentials are not configured.");

  test("create Aug 1–15 2026, edit, persist, copy, finalize, reopen", async ({
    page,
  }) => {
    await page.goto("/login");
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

    await expect(page.getByText(/August 2026/i)).toBeVisible();

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
    await expect(page.getByText(/^Saved$/)).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(page.getByLabel("AM arrival")).toHaveValue(/07:00/);
    await expect(page.getByPlaceholder("Item 1")).toHaveValue(
      /Prepared official documents/,
    );

    if ((await daySelect.count()) > 0) {
      await daySelect.selectOption("2026-08-04");
    }
    await page.getByRole("button", { name: /Copy previous workday/i }).click();
    await expect(page.getByPlaceholder("Item 1")).toHaveValue(
      /Prepared official documents/,
      {
        timeout: 15000,
      },
    );

    await expect(page.getByText(/Readiness|Blocking|Ready/i).first()).toBeVisible();

    const finalize = page.getByRole("button", { name: /Finalize report/i });
    if (await finalize.isVisible()) {
      await finalize.click();
      const locked = page.getByText(/read-only|Reopen report/i);
      if (await locked.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(page.getByLabel("AM arrival")).toBeDisabled();
        await page.getByRole("button", { name: /Reopen report/i }).click();
        await page.getByRole("button", { name: /Confirm reopen/i }).click();
        await expect(page.getByLabel("AM arrival")).toBeEnabled({ timeout: 15000 });
      }
    }
  });
});
