// e2e/tests/links.spec.ts
import { test, expect } from "../support/test";
import { FIXTURES } from "../support/seed";

// T131: a link is stored once and shown on both pages, whichever page added
// it. A person added on a quest's page used to be missing from the person's
// own page, and a person linked to another showed on one page only.

test("a person added on a quest's page shows the quest on their own page, and leaves from either", async ({ page }) => {
  const { quest, legacyNpc } = FIXTURES;

  await page.goto(`/quests/${quest.id}`);
  await expect(page.getByRole("heading", { level: 1, name: quest.title })).toBeVisible();
  await page.getByRole("button", { name: `Attach to the people in ${quest.title}` }).click();
  await page.getByRole("listbox").getByRole("option", { name: new RegExp(legacyNpc.name) }).click();
  await page.keyboard.press("Escape");
  // Written once it is listed; navigating sooner would abandon the write.
  await expect(page.getByRole("button", { name: `Remove ${legacyNpc.name} from ${quest.title}` })).toBeVisible();

  await page.goto(`/npcs/${legacyNpc.id}`);
  await expect(page.getByRole("heading", { level: 1, name: legacyNpc.name })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(quest.title) })).toBeVisible();

  // Removed from the person's page, it leaves the quest's too.
  await page.getByRole("button", { name: `Attach to what ${legacyNpc.name} is linked to` }).click();
  await page.getByRole("listbox").getByRole("option", { name: new RegExp(quest.title) }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: new RegExp(quest.title) })).toHaveCount(0);

  await page.goto(`/quests/${quest.id}`);
  await expect(page.getByRole("button", { name: `Remove ${legacyNpc.name} from ${quest.title}` })).toHaveCount(0);
});

test("a person linked to another shows on both their pages", async ({ page }) => {
  const { npc, legacyNpc } = FIXTURES;

  await page.goto(`/npcs/${npc.id}`);
  await expect(page.getByRole("heading", { level: 1, name: npc.name })).toBeVisible();
  await page.getByRole("button", { name: `Attach to what ${npc.name} is linked to` }).click();
  await page.getByRole("listbox").getByRole("option", { name: new RegExp(legacyNpc.name) }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: new RegExp(legacyNpc.name) }).first()).toBeVisible();

  await page.goto(`/npcs/${legacyNpc.id}`);
  await expect(page.getByRole("heading", { level: 1, name: legacyNpc.name })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(npc.name) }).first()).toBeVisible();
});

test("a quest attached on a place's page lists the place among the quest's own", async ({ page }) => {
  const { quest } = FIXTURES;
  const { region } = FIXTURES.locations;

  await page.goto(`/locations/${region.id}`);
  await expect(page.getByRole("heading", { level: 1, name: region.name })).toBeVisible();
  await page.getByRole("button", { name: `Attach to the quests and rumors of ${region.name}` }).click();
  await page.getByRole("listbox").getByRole("option", { name: new RegExp(quest.title) }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: new RegExp(quest.title) })).toBeVisible();

  // The quest already has a location, so the place joins its places.
  await page.goto(`/quests/${quest.id}`);
  await expect(page.getByRole("button", { name: region.name, exact: true })).toBeVisible();

  // Detached from the place's page, it leaves the quest's places, which
  // other journeys share.
  await page.goto(`/locations/${region.id}`);
  await page.getByRole("button", { name: `Attach to the quests and rumors of ${region.name}` }).click();
  await page.getByRole("listbox").getByRole("option", { name: new RegExp(quest.title) }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: new RegExp(quest.title) })).toHaveCount(0);
  await page.goto(`/quests/${quest.id}`);
  await expect(page.getByRole("heading", { level: 1, name: quest.title })).toBeVisible();
  await expect(page.getByRole("button", { name: region.name, exact: true })).toHaveCount(0);
});
