// e2e/tests/navigation.spec.ts
import { test, expect } from "../support/test";
import { FIXTURES } from "../support/seed";

test("the main navigation reaches every section of the campaign", async ({ page }) => {
  const sections = [
    { name: "Story", path: "/story" },
    { name: "Quests", path: "/quests" },
    { name: "Rumors", path: "/rumors" },
    { name: "NPCs", path: "/npcs" },
    { name: "Locations", path: "/locations" },
    { name: "Notes", path: "/notes" },
    { name: "Home", path: "/" },
  ];
  const nav = page.getByRole("navigation", { name: "Main" });

  await page.goto("/");
  for (const { name, path } of sections) {
    await nav.getByRole("button", { name, exact: true }).click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await expect(page.getByRole("heading", { level: 1, name: FIXTURES.campaign.name })).toBeVisible();
});

test("a record's breadcrumb leads back up to its section", async ({ page }) => {
  const { npc } = FIXTURES;

  await page.goto("/npcs");
  await page.getByRole("button", { name: `Expand ${npc.name}` }).click();
  await page.getByRole("button", { name: "More info" }).click();
  await expect(page).toHaveURL(`/npcs/${npc.id}`);
  await expect(page.getByRole("heading", { level: 1, name: npc.name })).toBeVisible();

  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "NPCs" }).click();
  await expect(page).toHaveURL("/npcs");
  await expect(page.getByRole("heading", { level: 1, name: "NPCs" })).toBeVisible();
});
