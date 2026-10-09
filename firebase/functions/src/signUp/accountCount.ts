// functions/src/signUp/accountCount.ts
//
// How many accounts the project holds, kept in one document (T128). The cap
// it enforces is a backstop, not the gate -- the gate is the invitation -- but
// a backstop has to hold under load: the cap used to be checked by listing
// Auth accounts on every sign-up, which two sign-ups at once could both pass,
// and which listed up to the cap's worth of accounts each time.

import {getAuth} from "firebase-admin/auth";
import {DocumentSnapshot, Firestore, Transaction, getFirestore} from "firebase-admin/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";

/**
 * The most Auth accounts the project will hold (the onboarding plan, D2,
 * decided 2026-10-08). It only bounds the damage if invitations leak faster
 * than anyone notices. Raise it here and redeploy.
 */
export const MAX_ACCOUNTS = 300;

/**
 * The count's document. No client rule matches it, so the default deny keeps
 * every client out.
 */
export const ACCOUNT_COUNT = "signUpCounters/accounts";

/** Auth's largest page of accounts. */
const PAGE_SIZE = 1000;

/**
 * Every Auth account, counted by listing them all. The truth the count
 * document is set from: once, when it does not exist yet, and every day.
 *
 * @return {Promise<number>} How many accounts exist
 */
export async function countAccounts(): Promise<number> {
  let total = 0;
  let pageToken: string | undefined;
  do {
    const page = await getAuth().listUsers(PAGE_SIZE, pageToken);
    total += page.users.length;
    pageToken = page.pageToken;
  } while (pageToken);
  return total;
}

/**
 * The count as stored, or, before there is one, counted.
 *
 * @param {DocumentSnapshot} snapshot The count's document
 * @return {Promise<number>} The count
 */
async function countIn(snapshot: DocumentSnapshot): Promise<number> {
  return snapshot.exists ? Number(snapshot.get("count")) || 0 : await countAccounts();
}

/**
 * Whether the project already holds `MAX_ACCOUNTS` accounts. For saying so
 * early (`reserveSignUp`); the gate's {@link takeAccountSlot} decides.
 * Writes nothing.
 *
 * @param {Firestore} db Firestore
 * @return {Promise<boolean>} true when no further account may be created
 */
export async function accountLimitReached(db: Firestore = getFirestore()): Promise<boolean> {
  return (await countIn(await db.doc(ACCOUNT_COUNT).get())) >= MAX_ACCOUNTS;
}

/**
 * Counts one more account, inside the caller's transaction, unless the
 * project is full. Two sign-ups racing for the last slot cannot both have
 * it: the transaction that reads the count also writes it.
 *
 * Reads before it writes, so the caller may write after it, not read.
 *
 * @param {Transaction} transaction The caller's transaction
 * @param {Firestore} db Firestore
 * @param {Date} now The moment, recorded with the count
 * @return {Promise<boolean>} false when the project is full, and nothing counted
 */
export async function takeAccountSlot(
  transaction: Transaction,
  db: Firestore,
  now: Date = new Date()
): Promise<boolean> {
  const ref = db.doc(ACCOUNT_COUNT);
  const count = await countIn(await transaction.get(ref));
  if (count >= MAX_ACCOUNTS) return false;
  transaction.set(ref, {count: count + 1, updatedAt: now}, {merge: true});
  return true;
}

/**
 * Counts one account fewer, for one that was deleted. Never below zero, and
 * nothing before there is a count: the first count is taken from Auth.
 *
 * @param {Firestore} db Firestore
 * @param {Date} now The moment, recorded with the count
 */
export async function releaseAccountSlot(
  db: Firestore = getFirestore(),
  now: Date = new Date()
): Promise<void> {
  const ref = db.doc(ACCOUNT_COUNT);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return;
    const count = Number(snapshot.get("count")) || 0;
    transaction.update(ref, {count: Math.max(0, count - 1), updatedAt: now});
  });
}

/**
 * Sets the count from Auth itself. The count drifts when an account is
 * created or deleted by a path that does not keep it -- the console, the
 * Admin SDK, or the browser deleting an account whose invitation failed --
 * and this puts it right.
 *
 * A sign-up between the listing and the write is counted once by the gate and
 * missed by the listing, leaving the count one low until the next run; the
 * cap is a backstop, so a day of that is acceptable.
 *
 * @param {Date} now The moment, recorded with the count
 * @param {Firestore} db Firestore
 * @return {Promise<number>} The count now stored
 */
export async function recountAccounts(
  now: Date,
  db: Firestore = getFirestore()
): Promise<number> {
  const count = await countAccounts();
  await db.doc(ACCOUNT_COUNT).set({count, updatedAt: now, recountedAt: now}, {merge: true});
  return count;
}

/** {@link recountAccounts}, every day. */
export const recountAccountsDaily = onSchedule(
  {
    schedule: "every day 04:20",
    timeZone: "Europe/Copenhagen",
    region: "europe-west1",
  },
  async () => {
    const count = await recountAccounts(new Date());
    console.log(`Accounts recounted: ${count} of at most ${MAX_ACCOUNTS}.`);
  }
);
