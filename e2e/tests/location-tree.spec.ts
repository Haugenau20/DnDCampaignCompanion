// e2e/tests/location-tree.spec.ts
import { test, expect } from "../support/test";
import { FIXTURES } from "../support/seed";

test("the location tree opens level by level down to a building", async ({ page }) => {
  const { region, town, inn } = FIXTURES.locations;

  await page.goto("/locations");
  // Only the top level shows at first.
  await expect(page.getByRole("button", { name: `Expand ${region.name}` })).toBeVisible();
  await expect(page.getByText(town.name)).toHaveCount(0);

  await page.getByRole("button", { name: `Expand ${region.name}` }).click();
  await page.getByRole("button", { name: `Expand ${town.name}` }).click();
  await expect(page.getByRole("button", { name: `Expand ${inn.name}` })).toBeVisible();
});

test("a location's page shows where it sits in the tree", async ({ page }) => {
  const { region, town, inn } = FIXTURES.locations;

  await page.goto(`/locations/${town.id}`);
  await expect(page.getByRole("heading", { level: 1, name: town.name })).toBeVisible();

  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb.getByRole("link", { name: region.name })).toBeVisible();

  await page.getByRole("button", { name: inn.name, exact: true }).click();
  await expect(page).toHaveURL(`/locations/${inn.id}`);
  await expect(page.getByRole("heading", { level: 1, name: inn.name })).toBeVisible();
});
