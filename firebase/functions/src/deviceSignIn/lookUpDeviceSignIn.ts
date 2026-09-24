// functions/src/deviceSignIn/lookUpDeviceSignIn.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {
  DEVICE_SIGN_INS,
  DeviceSignInRequest,
  EXPIRED_MESSAGE,
  isLive,
} from "./deviceSignIn";

interface LookUpDeviceSignInData {
  requestId: string;
}

/**
 * The address a request's magic link was sent to, so the device approving it
 * need not ask its reader to type it again.
 *
 * Called anonymously by the approving device, which has only the link. Firebase
 * needs the address to use the link, and the request already holds it; asking
 * here keeps it out of the link's URL.
 *
 * This reveals nothing new. The id is 128 random bits that travel only inside
 * the email sent to that same address, so whoever has the id can already read
 * that inbox -- and use the link itself. It answers only for a request that can
 * still be approved, so an old link reveals nothing.
 *
 * Only the approving path may use the answer. Signing *this* device in must
 * still ask for the address: it is Firebase's guard against being sent someone
 * else's link and landing in their account.
 */
export const lookUpDeviceSignIn = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest<LookUpDeviceSignInData>) => {
    const {requestId} = request.data ?? {};
    if (typeof requestId !== "string" || !requestId) {
      throw new functions.HttpsError(
        "invalid-argument",
        "This sign-in request is incomplete."
      );
    }

    let stored: DeviceSignInRequest | undefined;
    try {
      const snapshot = await admin.firestore()
        .collection(DEVICE_SIGN_INS)
        .doc(requestId)
        .get();
      stored = snapshot.data() as DeviceSignInRequest | undefined;
    } catch (error) {
      rethrowHttpsError(
        error,
        "Could not look up the sign-in request.",
        (wrappedError) =>
          console.error("Error looking up a device sign-in:", wrappedError)
      );
    }

    if (!stored || stored.status !== "pending" || !isLive(stored, new Date())) {
      throw new functions.HttpsError("failed-precondition", EXPIRED_MESSAGE);
    }
    return {email: stored.email};
  }
);
