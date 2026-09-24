// functions/src/deviceSignIn/startDeviceSignIn.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {normalizeEmail} from "../signUp/signUpGate";
import {
  DEVICE_SIGN_INS,
  DeviceSignInRequest,
  MAX_OPEN_REQUESTS,
  REQUEST_LIFETIME_MS,
  hashSecret,
  isLive,
  newCode,
  newRequestId,
  newSecret,
} from "./deviceSignIn";

interface StartDeviceSignInData {
  email: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Opens a request to sign this device in from another one.
 *
 * Called anonymously by the sign-in page, just before it sends a magic link to
 * `email`. Returns the request's id (which goes into the link), a secret the
 * caller keeps to collect the sign-in with, and the code it shows its reader.
 *
 * Says nothing about whether `email` has an account -- the answer is the same
 * either way, so this cannot be used to probe for addresses. A request for an
 * address without one can simply never be approved.
 *
 * At most `MAX_OPEN_REQUESTS` per address are open at once. Expired requests
 * found on the way are deleted, so the count empties by itself.
 */
export const startDeviceSignIn = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest<StartDeviceSignInData>) => {
    const {email} = request.data ?? {};
    if (typeof email !== "string" || !EMAIL.test(email.trim())) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Enter a valid email address."
      );
    }

    const db = admin.firestore();
    const address = normalizeEmail(email);
    const now = new Date();

    try {
      // One field only, so no composite index is needed; the few requests an
      // address can have are filtered here.
      const existing = await db
        .collection(DEVICE_SIGN_INS)
        .where("email", "==", address)
        .get();

      let open = 0;
      for (const doc of existing.docs) {
        const stored = doc.data() as DeviceSignInRequest;
        if (!isLive(stored, now)) {
          await doc.ref.delete();
        } else if (stored.status === "pending") {
          open++;
        }
      }
      if (open >= MAX_OPEN_REQUESTS) {
        throw new functions.HttpsError(
          "resource-exhausted",
          "Too many sign-in requests. Wait a few minutes and try again."
        );
      }

      const requestId = newRequestId();
      const secret = newSecret();
      const code = newCode();
      const stored: DeviceSignInRequest = {
        email: address,
        secretHash: hashSecret(secret),
        code,
        attempts: 0,
        status: "pending",
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromMillis(now.getTime() + REQUEST_LIFETIME_MS),
      };
      await db.collection(DEVICE_SIGN_INS).doc(requestId).set(stored);

      return {requestId, secret, code, expiresAt: stored.expiresAt.toMillis()};
    } catch (error) {
      rethrowHttpsError(
        error,
        "Could not prepare signing in from another device.",
        (wrappedError) =>
          console.error("Error starting a device sign-in:", wrappedError)
      );
    }
  }
);
