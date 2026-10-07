// e2e/tests/entity.spec.ts
import { test, expect } from "../support/test";

test("a player creates an NPC, renames it, and the change survives a reload", async ({ page }) => {
  await page.goto("/npcs");
  await page.getByRole("button", { name: "Add NPC" }).click();
  await expect(page).toHaveURL("/npcs/create");

  await page.getByLabel("Name", { exact: true }).fill("Tobiah Fenn");
  await page.getByLabel("Who are they, in a line?").fill("A ferryman who saw the light go out");
  await page.getByRole("button", { name: "Create & open" }).click();

  await expect(page).toHaveURL(/\/npcs\/(?!create)[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Tobiah Fenn" })).toBeVisible();

  await page.getByRole("button", { name: "Edit the name Tobiah Fenn" }).click();
  const name = page.getByLabel("Name", { exact: true });
  await name.fill("Tobiah Fenn the Elder");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tobiah Fenn the Elder" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Tobiah Fenn the Elder" })).toBeVisible();

  await page.goto("/npcs");
  await expect(page.getByRole("button", { name: "Expand Tobiah Fenn the Elder" })).toBeVisible();
});
