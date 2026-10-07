// e2e/tests/table-notes.spec.ts
import type { Page } from "@playwright/test";
import { test, expect } from "../support/test";
import { FIXTURES } from "../support/seed";

/**
 * Write a note into the page's notes card and check what the NPC page has
 * always shown: the note, credited to whoever wrote it, and the word
 * "Saved". The seeded player has no active character, so the note is credited
 * to their username. Then reload: the note is the server's, not the composer's.
 */
async function addNote(page: Page, text: string): Promise<void> {
  const notes = page.getByRole("region", { name: "Notes" });
  await expect(notes.getByText("No notes yet")).toBeVisible();

  await notes.getByLabel("Add a note").fill(text);
  await notes.getByRole("button", { name: "Add note" }).click();

  await expect(notes.getByText(text)).toBeVisible();
  await expect(notes.getByText("Saved", { exact: true })).toBeVisible();
  await expect(notes.getByText(FIXTURES.player.username)).toBeVisible();

  await page.reload();
  await expect(page.getByRole("region", { name: "Notes" }).getByText(text)).toBeVisible();
}

// T063: the location's notes were a section of their own, titled differently,
// with no order stated and no confirmation. They are the NPC page's card now.
test("a player writes a table note on a location, the same way as on an NPC", async ({ page }) => {
  await page.goto(`/locations/${FIXTURES.locations.inn.id}`);
  await expect(page.getByRole("heading", { level: 1, name: FIXTURES.locations.inn.name })).toBeVisible();
  await expect(page.getByText("Notes from the table")).toHaveCount(0);
  await addNote(page, "The landlord keeps a second ledger.");

  await page.goto(`/npcs/${FIXTURES.npc.id}`);
  await expect(page.getByRole("heading", { level: 1, name: FIXTURES.npc.name })).toBeVisible();
  await addNote(page, "Owes the harbourmaster a favour.");
});
