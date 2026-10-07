// e2e/tests/entity-pages.spec.ts
import type { Page } from "@playwright/test";
import { test, expect } from "../support/test";
import { FIXTURES } from "../support/seed";

const { npc, quest } = FIXTURES;
const { inn } = FIXTURES.locations;

/** The three entity pages, and the name each one's card carries. */
const PAGES = [
  { path: `/npcs/${npc.id}`, name: npc.name },
  { path: `/locations/${inn.id}`, name: inn.name },
  { path: `/quests/${quest.id}`, name: quest.title },
];

/** The page's identity card: the card its one h1 sits in. */
const identityCard = (page: Page, name: string) =>
  page.locator("section", { has: page.getByRole("heading", { level: 1, name }) });

// T063: the location and quest pages moved onto the NPC page's light card,
// and edit their standing facts the way it does -- the value is the control.
test("a location's knowledge and type are changed from its card, and stay changed", async ({ page }) => {
  await page.goto(`/locations/${inn.id}`);
  const card = identityCard(page, inn.name);
  await expect(card).toBeVisible();
  await expect(card.getByText(`In ${FIXTURES.locations.town.name}`)).toBeVisible();

  await card.getByRole("button", { name: "Edit knowledge" }).click();
  await card
    .getByRole("group", { name: `Knowledge of ${inn.name}` })
    .getByRole("button", { name: "Explored" })
    .click();
  await expect(card.getByRole("button", { name: "Edit knowledge" })).toHaveText("Explored");

  await card.getByRole("button", { name: "Edit type" }).click();
  await card.getByLabel("Type").selectOption("landmark");
  await expect(card.getByRole("button", { name: "Edit type" })).toHaveText("Landmark");

  await page.reload();
  await expect(card.getByRole("button", { name: "Edit knowledge" })).toHaveText("Explored");
  await expect(card.getByRole("button", { name: "Edit type" })).toHaveText("Landmark");
});

test("a quest's status and level range are changed from its card, and stay changed", async ({ page }) => {
  await page.goto(`/quests/${quest.id}`);
  const card = identityCard(page, quest.title);
  await expect(card.getByText(`At ${FIXTURES.locations.town.name}`)).toBeVisible();

  await card.getByRole("button", { name: "What levels is it pitched at?" }).click();
  await card.getByLabel("Level range").fill("3–5");
  await card.getByRole("button", { name: "Save level range" }).click();
  await expect(card.getByRole("button", { name: "Edit level range" })).toHaveText("3–5");

  await card.getByRole("button", { name: "Edit status" }).click();
  await card
    .getByRole("group", { name: `Status of ${quest.title}` })
    .getByRole("button", { name: "Failed" })
    .click();
  await expect(card.getByRole("button", { name: "Edit status" })).toHaveText("Failed");

  await page.reload();
  await expect(card.getByRole("button", { name: "Edit status" })).toHaveText("Failed");
  await expect(card.getByRole("button", { name: "Edit level range" })).toHaveText("3–5");
});

test("the three entity pages share one layout: the card beside the sidebar, the sidebar below it on a phone", async ({ page }) => {
  for (const { path, name } of PAGES) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(path);
    const card = identityCard(page, name);
    const record = page.locator("section", { has: page.getByText("Record", { exact: true }) });
    await expect(card).toBeVisible();

    // The card is light, not the band the location and quest pages had.
    await expect(card).toHaveClass(/\bcard\b/);
    await expect(page.locator(".hero-band")).toHaveCount(0);

    const wideCard = await card.boundingBox();
    const wideRecord = await record.boundingBox();
    expect(wideRecord!.x, `${path}: the sidebar sits beside the card`).toBeGreaterThan(
      wideCard!.x + wideCard!.width
    );

    await page.setViewportSize({ width: 360, height: 800 });
    const narrowCard = await card.boundingBox();
    const narrowRecord = await record.boundingBox();
    expect(narrowRecord!.y, `${path}: the sidebar follows the card on a phone`).toBeGreaterThan(
      narrowCard!.y + narrowCard!.height
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `${path}: no sideways scroll on a phone`).toBeLessThanOrEqual(0);
  }
});
