// functions/src/shared/registrationToken.ts
//
// When a group registration token can still be redeemed.
//
// This mirrors `src/core/utils/registration-token.ts` in the web app, which the
// admin view uses to label a pending invitation. The two packages cannot share
// a module, so the rule is written twice -- keep them in step. This copy is the
// one that is enforced: before T052 the client's copy was the only check, and
// the Firestore rules read neither `used` nor `expiresAt`.

/** Why a token cannot be redeemed, or `null` when it can. */
export type TokenProblem = "used" | "expired" | null;

/**
 * A stored date as a `Date`. The Admin SDK hands back a `Timestamp` for what
 * was written as a `Date`, and the sample-data generator writes strings.
 *
 * @param {unknown} value A `Date`, a `Timestamp`, a date string or epoch millis
 * @return {Date | undefined} The date, or `undefined` when nothing is stored
 */
function toDate(value: unknown): Date | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof (value as {toDate?: unknown}).toDate === "function") {
    return (value as {toDate: () => Date}).toDate();
  }
  return value instanceof Date ? value : new Date(value as string | number);
}

/**
 * Whether a stored token can be redeemed, and if not, why.
 *
 * A token with no `expiresAt` never expires: every token minted before T013
 * carries none, and treating those as expired would silently revoke every
 * invitation already sent.
 *
 * @param {object} data The token document's data
 * @param {Date} now The moment to judge against
 * @return {TokenProblem} `null` when redeemable
 */
export function registrationTokenProblem(
  data: {used?: unknown; expiresAt?: unknown},
  now: Date = new Date()
): TokenProblem {
  if (data.used === true) return "used";
  const expiry = toDate(data.expiresAt);
  if (expiry !== undefined && expiry.getTime() <= now.getTime()) {
    return "expired";
  }
  return null;
}
