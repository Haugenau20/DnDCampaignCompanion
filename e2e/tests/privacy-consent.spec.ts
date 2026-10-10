// e2e/tests/privacy-consent.spec.ts
import { test, expect } from "../support/test";

// Someone who has never visited, so the question has not been answered.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * T138: the site ran Google Analytics for everyone while the privacy page
 * said it had none. A visitor is now asked first, the answer sticks, and the
 * privacy page shows it and changes it.
 */
test("a visitor is asked about analytics once, and can change the answer", async ({ page }) => {
  await page.goto("/privacy");

  const notice = page.getByRole("region", { name: "Privacy" });
  await expect(notice).toContainText("May we count visits with Google Analytics?");
  await notice.getByRole("button", { name: "No thanks" }).click();
  await expect(notice).toBeHidden();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
  await expect(notice).toBeHidden();

  // The notice is gone, so the privacy page's card holds the only answer.
  const state = page.getByText(/in this browser it is/);
  await expect(state).toContainText("in this browser it is off");
  await page.getByRole("button", { name: "Allow analytics" }).click();
  await expect(state).toContainText("in this browser it is on");

  await page.reload();
  await expect(state).toContainText("in this browser it is on");
  await page.getByRole("button", { name: "Turn analytics off" }).click();
  await expect(state).toContainText("in this browser it is off");
});
