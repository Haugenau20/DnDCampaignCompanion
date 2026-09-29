// functions/src/deviceSignIn/approveDeviceSignIn.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {normalizeEmail} from "../signUp/signUpGate";
import {
  DEVICE_SIGN_INS,
  DeviceSignInRequest,
  EXPIRED_MESSAGE,
  isLive,
  newCode,
} from "./deviceSignIn";

interface ApproveDeviceSignInData {
  requestId: string;
}

/** What the transaction decided; errors are thrown after it commits. */
type Outcome =
  | {kind: "approved"; code: string}
  | {kind: "expired"}
  | {kind: "wrongAccount"};

/**
 * Approves a request, and returns the code the device that opened it must
 * type to sign in as the caller.
 *
 * Called by the page the magic link was opened on, signed in -- just for this
 * call -- by that link. Signing in with the link proves the caller owns the
 * address, which is why the code is made here and handed only to them: the
 * device that opened the request knows its id, so nothing short of the link
 * may reveal the code.
 *
 * Asking again for a request the caller already approved returns the same
 * code, so a page that asks twice does not strand the first answer. The link
 * can only be used once, so that is the one page that asked.
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
    const {requestId} = request.data ?? {};
    if (typeof requestId !== "string" || !requestId) {
      throw new functions.HttpsError(
        "invalid-argument",
        "This sign-in request is incomplete."
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
        if (!isLive(stored, new Date())) return {kind: "expired"};
        if (typeof callerEmail !== "string" ||
            normalizeEmail(callerEmail) !== stored.email) {
          return {kind: "wrongAccount"};
        }
        if (stored.status === "approved" && stored.uid === uid && stored.code) {
          return {kind: "approved", code: stored.code};
        }
        if (stored.status !== "pending") return {kind: "expired"};
        const code = newCode();
        tx.update(ref, {status: "approved", uid, code});
        return {kind: "approved", code};
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
      return {code: outcome.code};
    case "expired":
      throw new functions.HttpsError("failed-precondition", EXPIRED_MESSAGE);
    case "wrongAccount":
      throw new functions.HttpsError(
        "permission-denied",
        "This link was sent to a different address from the one the other " +
          "device asked for."
      );
    }
  }
);
