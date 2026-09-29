// functions/src/deviceSignIn/deviceSignIn.ts
//
// What the three halves of signing in on another device share.
//
// The flow: a device asks for a magic link and, alongside it, opens a request
// here (`startDeviceSignIn`). The link carries the request's id. When the link
// is opened anywhere other than the browser that asked -- a phone, where the
// inbox is -- that page approves the request instead of signing itself in
// (`approveDeviceSignIn`) and shows the code the approval returns. The reader
// types that code on the device that asked, which trades it, with a secret
// only it holds, for a one-time sign-in token (`claimDeviceSignIn`).
//
// The code exists only once the link has been used. Whoever opens a request
// learns its id and holds its secret, so the link is the only proof of the
// inbox: without it, anyone could type someone else's address and read the
// code back. Only the approving page -- signed in, for that call alone, by the
// link -- is ever given it.

import {createHash, randomBytes, randomInt} from "crypto";
import {Timestamp} from "firebase-admin/firestore";

/** Where requests live. No client can read or write it (catch-all deny). */
export const DEVICE_SIGN_INS = "deviceSignIns";

/** How long a request stays usable -- asking, approving and collecting. */
export const REQUEST_LIFETIME_MS = 15 * 60 * 1000;

/**
 * The most requests one address may have open at once. Open means pending and
 * unexpired, so the count empties by itself as requests expire or are used:
 * at most this many in any rolling `REQUEST_LIFETIME_MS`.
 */
export const MAX_OPEN_REQUESTS = 5;

/**
 * Wrong codes a request survives. The last one spends it. With six digits,
 * a device guessing has 3 in a million per link its owner opens.
 */
export const MAX_CODE_ATTEMPTS = 3;

/** Where a request is in its life. */
export type RequestStatus = "pending" | "approved" | "claimed" | "spent";

/** A request as stored. */
export interface DeviceSignInRequest {
  /** The address the link was sent to, normalised. */
  email: string;
  /** sha256 of the secret only the asking device holds. */
  secretHash: string;
  /**
   * The code the approving device shows and the asking device types. Set by
   * `approveDeviceSignIn`; there is none while the request is pending.
   */
  code?: string;
  attempts: number;
  status: RequestStatus;
  /** The approved account; set by `approveDeviceSignIn`. */
  uid?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

/** Said whenever a request cannot be used any more, whatever the reason. */
export const EXPIRED_MESSAGE =
  "This sign-in request has expired. Ask for a new link on the device you " +
  "are signing in on.";

/**
 * A fresh request id. 128 random bits: it travels in the link, so it must not
 * be guessable, but it grants nothing on its own.
 *
 * @return {string} Hex id
 */
export function newRequestId(): string {
  return randomBytes(16).toString("hex");
}

/**
 * A fresh secret for the asking device. Only its hash is stored.
 *
 * @return {string} base64url secret
 */
export function newSecret(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * A fresh 6-digit code, zero-padded.
 *
 * @return {string} e.g. "048213"
 */
export function newCode(): string {
  return randomInt(0, 1000000).toString().padStart(6, "0");
}

/**
 * How a secret is stored and compared.
 *
 * @param {string} secret The secret
 * @return {string} Hex sha256
 */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * Whether a request can still be approved or collected.
 *
 * @param {DeviceSignInRequest} request The stored request
 * @param {Date} now The moment to judge against
 * @return {boolean} true when unexpired
 */
export function isLive(request: DeviceSignInRequest, now: Date): boolean {
  return request.expiresAt.toDate().getTime() > now.getTime();
}
