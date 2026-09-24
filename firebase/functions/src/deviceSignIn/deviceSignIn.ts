// functions/src/deviceSignIn/deviceSignIn.ts
//
// What the three halves of signing in on another device share.
//
// The flow: a device asks for a magic link and, alongside it, opens a request
// here (`startDeviceSignIn`). The link carries the request's id. When the link
// is opened on a *different* device -- a phone, where the inbox is -- that
// device can approve the request instead of signing itself in
// (`approveDeviceSignIn`), and the device that asked collects a one-time
// sign-in token for the approved account (`claimDeviceSignIn`).
//
// The approving device must type a code that only the asking device shows.
// Without it, anyone could open a request on their own machine, send a genuine
// magic link to someone else's address, and hope the owner taps "approve".

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

/** Wrong codes a request survives. The last one spends it. */
export const MAX_CODE_ATTEMPTS = 3;

/** Where a request is in its life. */
export type RequestStatus = "pending" | "approved" | "claimed" | "spent";

/** A request as stored. */
export interface DeviceSignInRequest {
  /** The address the link was sent to, normalised. */
  email: string;
  /** sha256 of the secret only the asking device holds. */
  secretHash: string;
  /** The code the asking device shows and the approving device types. */
  code: string;
  attempts: number;
  status: RequestStatus;
  /** The approved account; set by `approveDeviceSignIn`. */
  uid?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

/** Said whenever a request cannot be used any more, whatever the reason. */
export const EXPIRED_MESSAGE =
  "This sign-in request has expired. Ask for a new link on the other device.";

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
 * A fresh 4-digit code, zero-padded.
 *
 * @return {string} e.g. "0471"
 */
export function newCode(): string {
  return randomInt(0, 10000).toString().padStart(4, "0");
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
