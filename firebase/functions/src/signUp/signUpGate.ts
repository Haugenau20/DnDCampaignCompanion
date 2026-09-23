// functions/src/signUp/signUpGate.ts
//
// What the two halves of the sign-up gate share: `reserveSignUp`, which a
// visitor holding an invitation calls before any account exists, and
// `gateAccountCreation`, which Firebase Auth calls before it creates one.
//
// Why the gate needs two halves: a blocking function sees only the account
// about to be created -- its email, its provider -- and nothing the client
// sent alongside. There is no way to hand it an invitation token. So the token
// is checked first, by a callable, and what the callable leaves behind is a
// reservation keyed to the email the visitor said they would use. The blocking
// function then admits exactly the emails that hold one.

import * as admin from "firebase-admin";
import {registrationTokenProblem} from "../shared/registrationToken";

/**
 * The most Auth accounts the project will hold. A backstop, not the gate: the
 * gate is the invitation. This only bounds the damage if invitations leak
 * faster than anyone notices. Raise it here and redeploy.
 */
export const MAX_ACCOUNTS = 20;

/**
 * How long a reservation stays usable. Long enough to cover a magic link that
 * sits unread in an inbox for an evening; the invitation's own expiry and
 * single use still apply on top of it.
 */
export const RESERVATION_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** Where reservations live. No client can read or write it (catch-all deny). */
export const RESERVATIONS = "signUpReservations";

/**
 * Stable markers the web app reads out of a refused sign-up.
 *
 * A refusal from a blocking function reaches the client as a generic
 * `auth/internal-error` whose message embeds ours, so the message has to carry
 * something the client can match on. These strings are that contract -- the
 * web app's `src/core/services/firebase/auth/signInErrors.ts` mirrors them.
 */
export const REFUSAL = {
  inviteRequired: "INVITE_REQUIRED",
  accountsFull: "ACCOUNTS_FULL",
} as const;

/**
 * An email as the gate compares it. Auth stores addresses as typed, and a
 * visitor may type their address with different case in two places.
 *
 * @param {string} email The address
 * @return {string} Trimmed and lower-cased
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * The reservation's document id. One per invitation, so a single leaked token
 * can hold at most one pending email at a time -- reserving again replaces it.
 *
 * @param {string} groupId The invitation's group
 * @param {string} token The invitation's token
 * @return {string} The document id
 */
export function reservationId(groupId: string, token: string): string {
  return `${groupId}_${token}`;
}

/**
 * Whether the project already holds `MAX_ACCOUNTS` Auth accounts.
 *
 * Lists at most that many rather than counting everything: the answer only
 * needs to know whether the cap is reached.
 *
 * @return {Promise<boolean>} true when no further account may be created
 */
export async function accountLimitReached(): Promise<boolean> {
  const {users} = await admin.auth().listUsers(MAX_ACCOUNTS);
  return users.length >= MAX_ACCOUNTS;
}

/**
 * The live reservation for `email`, if there is one.
 *
 * Live means unexpired, *and* its invitation is still redeemable -- a
 * reservation outlives nothing it was made from. Expired or dead ones found on
 * the way are deleted.
 *
 * @param {admin.firestore.Firestore} db Firestore
 * @param {string} email The address about to get an account
 * @param {Date} now The moment to judge against
 * @return {Promise<admin.firestore.DocumentReference | null>} The reservation
 */
export async function findLiveReservation(
  db: admin.firestore.Firestore,
  email: string,
  now: Date = new Date()
): Promise<admin.firestore.DocumentReference | null> {
  const snapshot = await db
    .collection(RESERVATIONS)
    .where("email", "==", normalizeEmail(email))
    .get();

  for (const reservation of snapshot.docs) {
    const {groupId, token, expiresAt} = reservation.data();
    const expired =
      !expiresAt || expiresAt.toDate().getTime() <= now.getTime();
    const tokenDoc = expired || typeof groupId !== "string" ||
      typeof token !== "string" ?
      null :
      await db.doc(`groups/${groupId}/registrationTokens/${token}`).get();

    if (tokenDoc?.exists &&
        registrationTokenProblem(tokenDoc.data() ?? {}, now) === null) {
      return reservation.ref;
    }
    await reservation.ref.delete();
  }
  return null;
}
