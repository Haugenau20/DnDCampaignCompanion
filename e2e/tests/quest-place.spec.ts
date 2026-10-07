// e2e/tests/quest-place.spec.ts
import { test, expect } from "../support/test";
import { FIXTURES } from "../support/seed";

test("a place added to a quest that is already a location links to it", async ({ page }) => {
  const { quest } = FIXTURES;
  const { inn } = FIXTURES.locations;

  await page.goto(`/quests/${quest.id}`);
  await expect(page.getByRole("heading", { level: 1, name: quest.title })).toBeVisible();

  await page.getByRole("button", { name: "Where does this quest happen?" }).click();
  await page.getByLabel("Add a place").fill(inn.name);
  await page.getByRole("button", { name: "Add place" }).click();

  // A place that is a location is a link, and is not offered for promotion.
  const place = page.getByRole("button", { name: inn.name, exact: true });
  await expect(place).toBeVisible();
  await expect(page.getByRole("button", { name: "Make it a location" })).toHaveCount(0);

  await page.reload();
  await page.getByRole("button", { name: inn.name, exact: true }).click();
  await expect(page).toHaveURL(`/locations/${inn.id}`);
  await expect(page.getByRole("heading", { level: 1, name: inn.name })).toBeVisible();
});
