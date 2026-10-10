// e2e/tests/sign-in.setup.ts
import { test as setup, expect } from "../support/test";
import { SIGNED_IN_STATE } from "../support/env";
import { FIXTURES } from "../support/seed";
import { nextSignInLink, signInLinksFor } from "../support/outbox";

setup("a player signs in with a magic link and lands in their campaign", async ({ page }) => {
  const { player, campaign } = FIXTURES;
  const before = new Set((await signInLinksFor(player.email)).map((c) => c.oobCode));

  await page.goto("/signin");
  await page.getByLabel("Email").fill(player.email);
  // Remembered sessions live in IndexedDB, which the saved state carries;
  // a session-only one would be lost between journeys.
  await page.getByLabel("Keep me signed in for 30 days").check();
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();

  const link = await nextSignInLink(player.email, before);

  await page.goto(link.oobLink);
  await expect(page.getByRole("heading", { level: 1, name: campaign.name })).toBeVisible();

  // Answered once, as a player would; the saved state remembers it.
  await page.getByRole("button", { name: "No thanks" }).click();

  await page.context().storageState({ path: SIGNED_IN_STATE, indexedDB: true });
});
