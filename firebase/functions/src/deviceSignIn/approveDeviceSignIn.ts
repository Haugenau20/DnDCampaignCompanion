// functions/src/deviceSignIn/approveDeviceSignIn.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {normalizeEmail} from "../signUp/signUpGate";
import {
  DEVICE_SIGN_INS,
  DeviceSignInRequest,
  EXPIRED_MESSAGE,
  MAX_CODE_ATTEMPTS,
  isLive,
} from "./deviceSignIn";

interface ApproveDeviceSignInData {
  requestId: string;
  code: string;
}

/** What the transaction decided; errors are thrown after it commits. */
type Outcome =
  | {kind: "approved"}
  | {kind: "expired"}
  | {kind: "wrongAccount"}
  | {kind: "wrongCode"; attemptsLeft: number};

/**
 * Approves a request, so the device that opened it can sign in as the caller.
 *
 * Called by the device the magic link was opened on, signed in -- just for
 * this call -- by that link. Signing in with the link proves the caller owns
 * the address; the code proves they can see the device that asked.
 *
 * A wrong code costs an attempt, and the last attempt spends the request. The
 * count has to be written *and* the call refused, so the transaction only
 * decides, and the refusal is thrown once it has committed.
 */
export const approveDeviceSignIn = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest<ApproveDeviceSignInData>) => {
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "Sign in with the link before approving."
      );
    }
    const {requestId, code} = request.data ?? {};
    if (typeof requestId !== "string" || !requestId ||
        typeof code !== "string" || !code) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Enter the code shown on the other device."
      );
    }
    const callerEmail = request.auth.token.email;
    const uid = request.auth.uid;

    const db = admin.firestore();
    const ref = db.collection(DEVICE_SIGN_INS).doc(requestId);

    let outcome: Outcome;
    try {
      outcome = await db.runTransaction(async (tx): Promise<Outcome> => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) return {kind: "expired"};
        const stored = snapshot.data() as DeviceSignInRequest;
        if (stored.status !== "pending" || !isLive(stored, new Date())) {
          return {kind: "expired"};
        }
        if (typeof callerEmail !== "string" ||
            normalizeEmail(callerEmail) !== stored.email) {
          return {kind: "wrongAccount"};
        }
        if (code.trim() !== stored.code) {
          const attempts = stored.attempts + 1;
          tx.update(ref, {
            attempts,
            ...(attempts >= MAX_CODE_ATTEMPTS ? {status: "spent"} : {}),
          });
          return {
            kind: "wrongCode",
            attemptsLeft: MAX_CODE_ATTEMPTS - attempts,
          };
        }
        tx.update(ref, {status: "approved", uid});
        return {kind: "approved"};
      });
    } catch (error) {
      rethrowHttpsError(
        error,
        "Could not approve the other device.",
        (wrappedError) =>
          console.error("Error approving a device sign-in:", wrappedError)
      );
    }

    switch (outcome.kind) {
    case "approved":
      return {success: true};
    case "expired":
      throw new functions.HttpsError("failed-precondition", EXPIRED_MESSAGE);
    case "wrongAccount":
      throw new functions.HttpsError(
        "permission-denied",
        "This link was sent to a different address from the one the other " +
          "device asked for."
      );
    case "wrongCode":
      throw new functions.HttpsError(
        outcome.attemptsLeft > 0 ? "invalid-argument" : "failed-precondition",
        outcome.attemptsLeft > 0 ?
          "That code does not match the one on the other device. " +
            `${outcome.attemptsLeft} ${
              outcome.attemptsLeft === 1 ? "try" : "tries"} left.` :
          "That code does not match either, so this request is closed. " +
            "Ask for a new link on the other device."
      );
    }
  }
);
