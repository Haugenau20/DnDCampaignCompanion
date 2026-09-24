// functions/src/deviceSignIn/claimDeviceSignIn.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {
  DEVICE_SIGN_INS,
  DeviceSignInRequest,
  hashSecret,
  isLive,
} from "./deviceSignIn";

interface ClaimDeviceSignInData {
  requestId: string;
  secret: string;
}

/** What the asking device learns. */
type ClaimResult =
  | {status: "pending"}
  | {status: "expired"}
  | {status: "approved"; token: string};

/**
 * Collects an approved request: a one-time sign-in token for the approved
 * account.
 *
 * Polled anonymously by the device that opened the request, with the secret
 * `startDeviceSignIn` gave it. Answers "pending" until the request is
 * approved, "expired" once it can no longer be used, and hands the token over
 * exactly once -- the request is marked claimed in the same transaction.
 *
 * Only ever signs in an account that exists: the uid was put there by an
 * approval from that account, and it is checked again here in case the
 * account was deleted since. A custom token for a missing uid would otherwise
 * create an account, around the invitation gate.
 */
export const claimDeviceSignIn = functions.onCall(
  {
    region: "europe-west1",
  },
  async (
    request: functions.CallableRequest<ClaimDeviceSignInData>
  ): Promise<ClaimResult> => {
    const {requestId, secret} = request.data ?? {};
    if (typeof requestId !== "string" || !requestId ||
        typeof secret !== "string" || !secret) {
      throw new functions.HttpsError(
        "invalid-argument",
        "This sign-in request is incomplete."
      );
    }

    const db = admin.firestore();
    const ref = db.collection(DEVICE_SIGN_INS).doc(requestId);

    try {
      return await db.runTransaction(async (tx): Promise<ClaimResult> => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) return {status: "expired"};
        const stored = snapshot.data() as DeviceSignInRequest;
        if (hashSecret(secret) !== stored.secretHash) {
          throw new functions.HttpsError(
            "permission-denied",
            "This sign-in request belongs to another device."
          );
        }
        if (!isLive(stored, new Date())) return {status: "expired"};
        if (stored.status === "pending") return {status: "pending"};
        if (stored.status !== "approved" || !stored.uid) {
          return {status: "expired"};
        }

        try {
          await admin.auth().getUser(stored.uid);
        } catch {
          tx.update(ref, {status: "spent"});
          return {status: "expired"};
        }
        const token = await admin.auth().createCustomToken(stored.uid);
        tx.update(ref, {status: "claimed"});
        return {status: "approved", token};
      });
    } catch (error) {
      rethrowHttpsError(
        error,
        "Could not finish signing in.",
        (wrappedError) =>
          console.error("Error claiming a device sign-in:", wrappedError)
      );
    }
  }
);
