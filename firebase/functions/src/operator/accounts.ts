// functions/src/operator/accounts.ts
//
// Looking up one account for the operator page (T137): by exact email, and
// only what setting an allowance needs. No groups, names or usernames, and no
// listing or search: a page that can list every account can leak every one.

import {Auth} from "firebase-admin/auth";
import {Firestore} from "firebase-admin/firestore";
import {
  EffectiveLimits,
  effectiveLimits,
  readAllowance,
} from "../extractionAllowance";
import {UsageStatus, usageStatusOf} from "../extractionUsage";
import {Refusal} from "../shared/refusal";

/** The allowance stored on a profile, as the page shows it. */
export interface AllowanceView {
  unlimited: boolean;
  limits: {daily: number; weekly: number; monthly: number} | null;
  expiresAt: Date | null;
  setAt: Date | null;
  /** Stored but past its date, so the defaults apply. */
  expired: boolean;
}

/** One account, as the page shows it. */
export interface AccountView {
  uid: string;
  email: string;
  createdAt: Date | null;
  lastSignInAt: Date | null;
  /** Whether `users/{uid}` exists; without it the account is in no group. */
  hasProfile: boolean;
  /** The counters and the limits they are held to; null without a profile. */
  usage: UsageStatus | null;
  /** The limits in force. */
  limits: EffectiveLimits;
  /** The allowance stored, if any. */
  allowance: AllowanceView | null;
}

/** Long enough for any address, short enough to refuse junk. */
const EMAIL_MAX = 254;

/**
 * An address as Auth stores it.
 *
 * @param {string} email What the operator typed
 * @return {string} The address, trimmed and lower-cased
 * @throws {Refusal} `invalid_input`
 */
function checkedEmail(email: string): string {
  const normalized =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (normalized.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+$/.test(normalized)) {
    throw new Refusal("invalid_input", "That is not an email address.");
  }
  return normalized;
}

/**
 * A date Auth reports as a string, or null.
 *
 * @param {string | undefined} value Auth's metadata field
 * @return {Date | null} The date
 */
function authDate(value: string | undefined): Date | null {
  return value ? new Date(value) : null;
}

/**
 * The account with this exact email, or null when there is none.
 *
 * @param {Firestore} db Firestore
 * @param {Auth} auth Firebase Auth
 * @param {string} email The address, as typed
 * @param {Date} now The moment to judge limits and expiries against
 * @return {Promise<AccountView | null>} The account
 * @throws {Refusal} `invalid_input`
 */
export async function lookUpAccount(
  db: Firestore,
  auth: Auth,
  email: string,
  now: Date = new Date()
): Promise<AccountView | null> {
  const address = checkedEmail(email);
  let user;
  try {
    user = await auth.getUserByEmail(address);
  } catch (error) {
    if ((error as {code?: unknown}).code === "auth/user-not-found") return null;
    throw error;
  }

  const profileDoc = await db.collection("users").doc(user.uid).get();
  const profile = profileDoc.data();
  const stored = readAllowance(profile?.extractionAllowance);
  const expiresAt = stored?.expiresAt?.toDate() ?? null;

  return {
    uid: user.uid,
    email: user.email ?? address,
    createdAt: authDate(user.metadata.creationTime),
    lastSignInAt: authDate(user.metadata.lastSignInTime),
    hasProfile: profileDoc.exists,
    usage: profileDoc.exists ? usageStatusOf(profile, now) : null,
    limits: effectiveLimits(profile, now),
    allowance: stored ? {
      unlimited: stored.unlimited,
      limits: stored.limits,
      expiresAt,
      setAt: stored.setAt?.toDate?.() ?? null,
      expired: expiresAt !== null && expiresAt.getTime() <= now.getTime(),
    } : null,
  };
}
