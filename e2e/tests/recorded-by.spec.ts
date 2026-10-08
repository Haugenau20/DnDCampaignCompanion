// e2e/tests/recorded-by.spec.ts
import { test, expect } from "../support/test";
import { FIXTURES } from "../support/seed";

const { npc, legacyNpc, player } = FIXTURES;

/**
 * The NPC list's expanded row says who recorded the NPC by the same name the
 * NPC's own page does (T124). It read `createdByUsername` alone, so it named
 * the player where the page named their character, and said "Unknown" for a
 * record that stores only the author's uid.
 */
test("the NPC list credits the author as the NPC's page does", async ({ page }) => {
  await page.goto("/npcs");

  await page.getByRole("button", { name: `Expand ${npc.name}` }).click();
  const recordedBy = page.getByText("Recorded by", { exact: true }).locator("..");
  await expect(recordedBy).toContainText(player.character.name);

  await page.getByRole("button", { name: "More info" }).click();
  await expect(page).toHaveURL(`/npcs/${npc.id}`);
  await expect(page.getByText(`Added by ${player.character.name}`)).toBeVisible();
});

test("the NPC list names the author of a record that stores only their uid", async ({ page }) => {
  await page.goto("/npcs");

  await page.getByRole("button", { name: `Expand ${legacyNpc.name}` }).click();
  const recordedBy = page.getByText("Recorded by", { exact: true }).locator("..");
  await expect(recordedBy).toContainText(player.username);
  await expect(recordedBy).not.toContainText("Unknown");
});
