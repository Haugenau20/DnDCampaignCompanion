// functions/src/signUp/reserveSignUp.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {registrationTokenProblem} from "../shared/registrationToken";
import {
  REFUSAL,
  RESERVATIONS,
  RESERVATION_LIFETIME_MS,
  accountLimitReached,
  normalizeEmail,
  reservationId,
} from "./signUpGate";

interface ReserveSignUpData {
  groupId: string;
  token: string;
  email: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lets `email` create an account, on the strength of an invitation.
 *
 * Called from the join page, anonymously, before the visitor signs in with a
 * magic link or Google. It checks the invitation -- exists, unused, unexpired
 * -- and records a reservation that `gateAccountCreation` looks for when Auth
 * is about to create the account. It spends nothing: the invitation is only
 * spent by `redeemInvitation`, once the account exists.
 *
 * Harmless for somebody who already has an account -- signing in creates
 * nothing, so the reservation is simply never used and expires.
 *
 * The account cap is checked here too, not only in the gate, so that a full
 * project says so on the join page instead of after the visitor has gone to
 * their inbox and back.
 */
export const reserveSignUp = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest<ReserveSignUpData>) => {
    const {groupId, token, email} = request.data ?? {};

    if (typeof groupId !== "string" || !groupId ||
        typeof token !== "string" || !token) {
      throw new functions.HttpsError(
        "invalid-argument",
        "This invitation link is incomplete."
      );
    }
    if (typeof email !== "string" || !EMAIL.test(email.trim())) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Enter a valid email address."
      );
    }

    const db = admin.firestore();

    try {
      const tokenDoc = await db
        .doc(`groups/${groupId}/registrationTokens/${token}`)
        .get();
      if (!tokenDoc.exists) {
        throw new functions.HttpsError(
          "not-found",
          "This invitation does not exist. Ask for a new link."
        );
      }
      const problem = registrationTokenProblem(tokenDoc.data() ?? {});
      if (problem !== null) {
        throw new functions.HttpsError(
          "failed-precondition",
          problem === "used" ?
            "This invitation has already been used. Ask for a new link." :
            "This invitation has expired. Ask for a new link."
        );
      }

      if (await accountLimitReached()) {
        throw new functions.HttpsError(
          "resource-exhausted",
          `${REFUSAL.accountsFull}: This site is not taking new accounts ` +
            "right now."
        );
      }

      const now = new Date();
      await db.collection(RESERVATIONS).doc(reservationId(groupId, token)).set({
        email: normalizeEmail(email),
        groupId,
        token,
        createdAt: now,
        expiresAt: new Date(now.getTime() + RESERVATION_LIFETIME_MS),
      });

      return {success: true};
    } catch (error) {
      rethrowHttpsError(
        error,
        `Failed to prepare your sign-up: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        (wrappedError) =>
          console.error("Error reserving a sign-up:", wrappedError)
      );
    }
  }
);
