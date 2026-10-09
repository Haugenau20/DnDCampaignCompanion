// e2e/support/outbox.ts
import { expect } from "./test";
import { E2E } from "./env";

/** One entry of the Auth emulator's outbox. */
export interface OobCode {
  email: string;
  requestType: string;
  oobCode: string;
  oobLink: string;
}

/**
 * The sign-in links the Auth emulator has "sent" to `email`. It keeps every
 * link in an outbox instead of mailing it.
 */
export async function signInLinksFor(email: string): Promise<OobCode[]> {
  const response = await fetch(`${E2E.authUrl}/emulator/v1/projects/${E2E.projectId}/oobCodes`);
  const body = (await response.json()) as { oobCodes?: OobCode[] };
  return (body.oobCodes ?? []).filter((c) => c.email === email && c.requestType === "EMAIL_SIGNIN");
}

/**
 * Wait for a sign-in link to `email` that was not in the outbox before.
 *
 * @param email The address the link was sent to
 * @param before The codes already there, from `signInLinksFor` before asking
 * @returns The new link
 */
export async function nextSignInLink(email: string, before: Set<string>): Promise<OobCode> {
  let link: OobCode | undefined;
  await expect
    .poll(async () => {
      link = (await signInLinksFor(email)).find((c) => !before.has(c.oobCode));
      return link;
    }, { message: `the Auth emulator never received a sign-in link for ${email}` })
    .toBeTruthy();
  return link!;
}
