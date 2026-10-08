// functions/src/signUp/founderInvitations.ts
//
// Founder invitations (T125): how a table that has never used the site gets
// in without the maintainer setting its group up. One admits one account,
// which may then create one group (`createGroup` spends it, T126). They are
// issued by the maintainer with `scripts/issue-founder-invitation.js`, through
// the Admin SDK: the app grants nobody the power to issue them (the
// onboarding plan, D6).

import {randomBytes} from "crypto";
import {Firestore} from "firebase-admin/firestore";

/** Where founder invitations live. No client can read or write it (catch-all deny). */
export const FOUNDER_INVITATIONS = "founderInvitations";

/** How long a founder link works, the same as an invitation into a group. */
export const FOUNDER_INVITATION_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * The reservation id for a founder invitation. One per invitation, as for an
 * invitation into a group, so reserving again replaces the email; the prefix
 * keeps it apart from a group's `${groupId}_${token}`.
 *
 * @param {string} token The founder invitation's token
 * @return {string} The reservation's document id
 */
export function founderReservationId(token: string): string {
  return `founder_${token}`;
}

/**
 * The link a founder opens.
 *
 * @param {string} origin The site, e.g. `https://muninn.quest`
 * @param {string} token The founder invitation's token
 * @return {string} The link
 */
export function founderLink(origin: string, token: string): string {
  const url = new URL("/join", origin);
  url.searchParams.set("founder", token);
  return url.toString();
}

/** What the maintainer may say about an invitation when issuing it. */
export interface FounderInvitationOptions {
  /** Who it is for, for the maintainer's own records. Nobody else sees it. */
  note?: string;
  /** When it is issued; for the tests. */
  now?: Date;
}

/**
 * Record a new, unused founder invitation.
 *
 * The token is the document id and the whole secret: 32 random bytes,
 * base64url, so it cannot be guessed and travels in a link unescaped.
 *
 * @param {Firestore} db Firestore
 * @param {FounderInvitationOptions} options A note, and the issuing moment
 * @return {Promise<{token: string, expiresAt: Date}>} The token and its expiry
 */
export async function issueFounderInvitation(
  db: Firestore,
  {note, now = new Date()}: FounderInvitationOptions
): Promise<{token: string; expiresAt: Date}> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + FOUNDER_INVITATION_LIFETIME_MS);
  await db.collection(FOUNDER_INVITATIONS).doc(token).create({
    used: false,
    createdAt: now,
    expiresAt,
    ...(note ? {note} : {}),
  });
  return {token, expiresAt};
}
