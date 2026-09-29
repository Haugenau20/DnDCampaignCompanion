// functions/src/deviceSignIn/claimDeviceSignIn.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {
  DEVICE_SIGN_INS,
  DeviceSignInRequest,
  MAX_CODE_ATTEMPTS,
  hashSecret,
  isLive,
} from "./deviceSignIn";

interface ClaimDeviceSignInData {
  requestId: string;
  secret: string;
  code: string;
}

/** What the asking device learns. */
type ClaimResult =
  | {status: "pending"}
  | {status: "expired"}
  | {status: "approved"; token: string};

/** What the transaction decided; a wrong code is thrown after it commits. */
type Outcome = ClaimResult | {status: "wrongCode"; attemptsLeft: number};

/**
 * Trades the code the reader typed for a one-time sign-in token for the
 * approved account.
 *
 * Called anonymously by the device that opened the request, with the secret
 * `startDeviceSignIn` gave it and the code the approving page showed. Answers
 * "pending" while the link has not been opened (there is no code to match
 * yet), "expired" once the request can no longer be used, and hands the token
 * over exactly once -- the request is marked claimed in the same transaction.
 *
 * A wrong code costs an attempt, and the last attempt spends the request. The
 * count has to be written *and* the call refused, so the transaction only
 * decides, and the refusal is thrown once it has committed.
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
    const {requestId, secret, code} = request.data ?? {};
    if (typeof requestId !== "string" || !requestId ||
        typeof secret !== "string" || !secret) {
      throw new functions.HttpsError(
        "invalid-argument",
        "This sign-in request is incomplete."
      );
    }
    if (typeof code !== "string" || !code.trim()) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Enter the code from the email link."
      );
    }

    const db = admin.firestore();
    const ref = db.collection(DEVICE_SIGN_INS).doc(requestId);

    let outcome: Outcome;
    try {
      outcome = await db.runTransaction(async (tx): Promise<Outcome> => {
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
        if (stored.status !== "approved" || !stored.uid || !stored.code) {
          return {status: "expired"};
        }

        if (code.trim() !== stored.code) {
          const attempts = stored.attempts + 1;
          tx.update(ref, {
            attempts,
            ...(attempts >= MAX_CODE_ATTEMPTS ? {status: "spent"} : {}),
          });
          return {
            status: "wrongCode",
            attemptsLeft: MAX_CODE_ATTEMPTS - attempts,
          };
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

    if (outcome.status !== "wrongCode") return outcome;
    throw new functions.HttpsError(
      outcome.attemptsLeft > 0 ? "invalid-argument" : "failed-precondition",
      outcome.attemptsLeft > 0 ?
        "That code does not match. " +
          `${outcome.attemptsLeft} ${
            outcome.attemptsLeft === 1 ? "try" : "tries"} left.` :
        "That code does not match either, so this request is closed. " +
          "Send a new link."
    );
  }
);
