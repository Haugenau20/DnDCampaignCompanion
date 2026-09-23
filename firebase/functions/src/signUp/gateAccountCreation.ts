// functions/src/signUp/gateAccountCreation.ts
import {
  AuthBlockingEvent,
  HttpsError,
  beforeUserCreated,
} from "firebase-functions/v2/identity";
import * as admin from "firebase-admin";
import {
  REFUSAL,
  accountLimitReached,
  findLiveReservation,
} from "./signUpGate";

/**
 * The sample-data generator creates its users through the client SDK with a
 * password, which this gate would refuse. Its users all live at `example.com`,
 * a domain nobody can receive mail at. The exemption exists only inside the
 * emulator, where `FUNCTIONS_EMULATOR` is set, and never in production.
 *
 * It is limited to password sign-ups -- the generator's only method, and one
 * the app no longer offers -- so that trying a magic link or Google with an
 * `example.com` address in the emulator still meets the real gate. It first
 * admitted every `example.com` account, which let a Google sign-in as an
 * uninvited `play57@example.com` straight through during manual testing.
 *
 * @param {AuthBlockingEvent} event The account about to be created
 * @param {string} email Its address
 * @return {boolean} true for a dev seed account in the emulator
 */
function isEmulatorSeedAccount(
  event: AuthBlockingEvent,
  email: string
): boolean {
  return process.env.FUNCTIONS_EMULATOR === "true" &&
    event.eventType?.endsWith(":password") === true &&
    email.toLowerCase().endsWith("@example.com");
}

/**
 * Decides whether an account may be created. Exported for the tests; the
 * deployed trigger is `gateAccountCreation` below.
 *
 * Accounts come from invitations. Before this ran, anyone holding the public
 * API key could create an Auth account -- harmless, since membership was
 * already server-side (#1425), but not "invite only". Now creation needs a
 * live reservation for the account's email, left by `reserveSignUp` after it
 * checked an invitation, and a project under `MAX_ACCOUNTS`.
 *
 * Runs for every way an account is created from a client -- magic link,
 * Google, password -- and for none of the ways an existing account signs in.
 * The Admin SDK creates accounts without it.
 *
 * The reservation is consumed here, so one reservation makes one account.
 *
 * @param {AuthBlockingEvent} event The account about to be created
 */
export async function admitAccount(event: AuthBlockingEvent): Promise<void> {
  const email = event.data?.email;
  if (!email) {
    throw new HttpsError(
      "permission-denied",
      `${REFUSAL.inviteRequired}: Accounts need an email address.`
    );
  }

  if (isEmulatorSeedAccount(event, email)) return;

  const db = admin.firestore();
  const reservation = await findLiveReservation(db, email);
  if (!reservation) {
    throw new HttpsError(
      "permission-denied",
      `${REFUSAL.inviteRequired}: There is no account for this address. ` +
        "Accounts are created from an invitation link."
    );
  }

  if (await accountLimitReached()) {
    throw new HttpsError(
      "resource-exhausted",
      `${REFUSAL.accountsFull}: This site is not taking new accounts right ` +
        "now."
    );
  }

  await reservation.delete();
}

/** The deployed blocking trigger. */
export const gateAccountCreation = beforeUserCreated(
  {region: "europe-west1"},
  admitAccount
);
