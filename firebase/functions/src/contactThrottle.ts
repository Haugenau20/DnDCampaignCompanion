// functions/src/contactThrottle.ts
import * as admin from "firebase-admin";
import {createHash} from "crypto";
import {Timestamp} from "firebase-admin/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";

/**
 * Where the contact form's budgets live. No client rule matches it, so the
 * default deny keeps every client out; only this function writes it.
 */
export const CONTACT_THROTTLE = "contactThrottle";

/** How far back a budget counts sends. */
export const THROTTLE_WINDOW_MS = 60 * 60 * 1000;

/** Sends one signed-in account may make in a window. */
export const PER_ACCOUNT_LIMIT = 5;
/** Sends one network address may make in a window, while signed out. */
export const PER_ADDRESS_LIMIT = 5;
/**
 * Sends every signed-out caller together may make in a window: the bound no
 * new address, reply-to or function instance can reset (SEC-006).
 */
export const ANONYMOUS_LIMIT = 20;

/** One budget: a document and how many sends it allows in a window. */
interface Budget {
  id: string;
  limit: number;
}

/** A budget's stored form: the times of the sends still in the window. */
interface BudgetDoc {
  sent: Timestamp[];
  /** When the document stops mattering; the daily sweep deletes it after. */
  expiresAt: Timestamp;
}

/**
 * The address a signed-out caller is counted by.
 *
 * Google's front end appends the address it received the request from to
 * `X-Forwarded-For`; anything to the left of it came from the caller and can
 * be invented. So this takes the last entry, not the first (which is what
 * Express's `req.ip` gives when it trusts the proxy). If the last entry turns
 * out to be one of Google's own, every signed-out caller shares one budget:
 * tighter, never looser.
 *
 * @param {object} rawRequest The callable's underlying HTTP request
 * @return {string} The address, or "unknown"
 */
export function callerAddress(rawRequest?: {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
}): string {
  const header = rawRequest?.headers?.["x-forwarded-for"];
  const forwarded = (Array.isArray(header) ? header.join(",") : header ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return forwarded[forwarded.length - 1] || rawRequest?.ip || "unknown";
}

/**
 * The budgets one send draws on: the account's, or, signed out, the
 * address's and the shared signed-out one. The address is stored only as a
 * hash.
 *
 * @param {string | undefined} uid The caller's uid, if signed in
 * @param {string} address The caller's address, from {@link callerAddress}
 * @return {Budget[]} The budgets
 */
export function budgetsFor(uid: string | undefined, address: string): Budget[] {
  if (uid) {
    return [{id: `account_${uid}`, limit: PER_ACCOUNT_LIMIT}];
  }
  const hashed = createHash("sha256").update(address).digest("hex");
  return [
    {id: `address_${hashed}`, limit: PER_ADDRESS_LIMIT},
    {id: "anonymous", limit: ANONYMOUS_LIMIT},
  ];
}

/**
 * Takes one send from every budget, or from none.
 *
 * The budgets are Firestore documents read and written in one transaction,
 * so two instances, or two calls at once, cannot both take the last send.
 * A refused call takes nothing. A send that later fails still counts: the
 * budget limits attempts, which is what costs mail quota.
 *
 * @param {Budget[]} budgets From {@link budgetsFor}
 * @param {Date} now The current time; injected for tests
 * @return {Promise<boolean>} Whether the send may go ahead
 */
export async function takeSend(
  budgets: Budget[],
  now: Date = new Date()
): Promise<boolean> {
  const db = admin.firestore();
  const refs = budgets.map((budget) =>
    db.collection(CONTACT_THROTTLE).doc(budget.id)
  );
  const windowStart = now.getTime() - THROTTLE_WINDOW_MS;

  return db.runTransaction(async (transaction) => {
    const snapshots = await transaction.getAll(...refs);
    const recent = snapshots.map((snapshot) =>
      ((snapshot.data() as BudgetDoc | undefined)?.sent ?? [])
        .filter((sent) => sent.toMillis() > windowStart)
    );
    if (recent.some((sent, i) => sent.length >= budgets[i].limit)) {
      return false;
    }
    const stamp = Timestamp.fromDate(now);
    const expiresAt = Timestamp.fromMillis(now.getTime() + THROTTLE_WINDOW_MS);
    refs.forEach((ref, i) => {
      const doc: BudgetDoc = {sent: [...recent[i], stamp], expiresAt};
      transaction.set(ref, doc);
    });
    return true;
  });
}

/** How many expired budgets one sweep reads per page. */
const SWEEP_PAGE = 500;
/** Pages one sweep may read before leaving the rest to the next day. */
const SWEEP_MAX_PAGES = 200;

/**
 * Deletes every budget whose last send left the window, so a signed-out
 * caller's hashed address is kept for a day at most after it stops mattering
 * (the privacy page says so).
 *
 * Each delete is conditional on the document being unchanged since it was
 * read: a budget that took a send meanwhile is current again, and is kept.
 *
 * @param {Date} now The current time; injected for tests
 * @return {Promise<{deleted: number, more: boolean}>} How many were deleted,
 *   and whether the sweep stopped at its page budget with more to do
 */
export async function sweepContactThrottle(
  now: Date
): Promise<{deleted: number; more: boolean}> {
  const db = admin.firestore();
  const expired = db.collection(CONTACT_THROTTLE)
    .where("expiresAt", "<=", Timestamp.fromDate(now))
    .orderBy("expiresAt")
    .limit(SWEEP_PAGE);

  let deleted = 0;
  for (let page = 0; page < SWEEP_MAX_PAGES; page++) {
    const snapshot = await expired.get();
    if (snapshot.empty) return {deleted, more: false};

    const writer = db.bulkWriter();
    // A refused precondition means the budget is in use again: keep it.
    writer.onWriteError(() => false);
    const results = snapshot.docs.map((doc) =>
      writer.delete(doc.ref, {lastUpdateTime: doc.updateTime})
        .then(() => true, () => false)
    );
    await writer.close();
    deleted += (await Promise.all(results)).filter(Boolean).length;

    if (snapshot.size < SWEEP_PAGE) return {deleted, more: false};
  }
  return {deleted, more: true};
}

/** Runs {@link sweepContactThrottle} once a day. */
export const sweepContactThrottleDaily = onSchedule(
  {
    schedule: "every day 04:10",
    timeZone: "Europe/Copenhagen",
    region: "europe-west1",
  },
  async () => {
    const result = await sweepContactThrottle(new Date());
    console.log(
      `Contact budgets swept: deleted ${result.deleted}` +
        (result.more ? "; stopped at its budget, the rest is tomorrow's." : ".")
    );
  }
);
