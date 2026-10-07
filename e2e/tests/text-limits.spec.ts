// e2e/tests/text-limits.spec.ts
import { test, expect } from "../support/test";

// T119: a name may hold 200 characters. The field stops typing there and says
// so, and a name of exactly 200 is saved -- under the production rules, which
// refuse one character more.
test("a name stops at 200 characters, says so, and saves", async ({ page }) => {
  await page.goto("/npcs");
  await page.getByRole("button", { name: "Add NPC" }).click();

  const name = page.getByLabel("Name", { exact: true });
  await name.pressSequentially("a".repeat(205));
  await expect(name).toHaveValue("a".repeat(200));
  await expect(name).toHaveAccessibleDescription("200 of 200 characters");

  await page.getByLabel("Who are they, in a line?").fill("Someone with a very long name");
  await page.getByRole("button", { name: "Create & open" }).click();

  await expect(page).toHaveURL(/\/npcs\/(?!create)[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "a".repeat(200) })).toBeVisible();
});
