// e2e/tests/sign-in.setup.ts
import { test as setup, expect } from "../support/test";
import { E2E, SIGNED_IN_STATE } from "../support/env";
import { FIXTURES } from "../support/seed";

/** One entry of the Auth emulator's outbox. */
interface OobCode {
  email: string;
  requestType: string;
  oobCode: string;
  oobLink: string;
}

/**
 * The sign-in links the Auth emulator has "sent" to `email`. It keeps every
 * link in an outbox instead of mailing it.
 */
async function signInLinksFor(email: string): Promise<OobCode[]> {
  const response = await fetch(`${E2E.authUrl}/emulator/v1/projects/${E2E.projectId}/oobCodes`);
  const body = (await response.json()) as { oobCodes?: OobCode[] };
  return (body.oobCodes ?? []).filter((c) => c.email === email && c.requestType === "EMAIL_SIGNIN");
}

setup("a player signs in with a magic link and lands in their campaign", async ({ page }) => {
  const { player, campaign } = FIXTURES;
  const before = new Set((await signInLinksFor(player.email)).map((c) => c.oobCode));

  await page.goto("/signin");
  await page.getByLabel("Email").fill(player.email);
  // Remembered sessions live in IndexedDB, which the saved state carries;
  // a session-only one would be lost between journeys.
  await page.getByLabel("Keep me signed in for 30 days").check();
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();

  let link: OobCode | undefined;
  await expect
    .poll(async () => {
      link = (await signInLinksFor(player.email)).find((c) => !before.has(c.oobCode));
      return link;
    }, { message: "the Auth emulator never received a sign-in link" })
    .toBeTruthy();

  await page.goto(link!.oobLink);
  await expect(page.getByRole("heading", { level: 1, name: campaign.name })).toBeVisible();

  // Acknowledged once, as a player would; the saved state remembers it.
  await page.getByRole("button", { name: "Got it" }).click();

  await page.context().storageState({ path: SIGNED_IN_STATE, indexedDB: true });
});
