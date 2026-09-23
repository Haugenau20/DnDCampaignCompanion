// functions/src/groupManagement/redeemInvitation.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
// The modular import, not `admin.firestore.FieldValue`: inside the functions
// emulator the namespaced `admin.firestore` is a wrapped stand-in without
// `FieldValue`, so an existing account joining a second group failed there
// with "Cannot read properties of undefined (reading 'arrayUnion')".
import {FieldValue} from "firebase-admin/firestore";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {registrationTokenProblem} from "../shared/registrationToken";

interface RedeemInvitationData {
  groupId: string;
  token: string;
  username: string;
}

/** The bounds both join forms already enforce (`useUsernameCheck`). */
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

/**
 * Makes the caller a member of a group, in exchange for a registration token.
 *
 * This is the only way into a group other than creating it, and it has to run
 * server-side (T052). Group membership is `users/{uid}.groups`, which the
 * Firestore rules read to answer `isGroupMember` -- and while a client could
 * write that array itself, anyone who knew a group's id could make themselves
 * a member of it without ever holding a token. The rules now refuse any client
 * write to `groups`, and this function is where the token is actually checked:
 * it exists, it has not been used, and it has not expired.
 *
 * Serves both join paths. A brand-new account (the client has just created
 * the Auth user) has no global profile yet, so one is created here; an
 * existing account has the group appended to the one it has. The two paths
 * used to write different group themes, and still do, so that moving the
 * write server-side changes nothing a member can see.
 *
 * Everything -- the token check, the username check and all five writes --
 * happens in one transaction, so two people racing for the same token or the
 * same name cannot both win.
 */
export const redeemInvitation = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest<RedeemInvitationData>) => {
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "You must be signed in to join a group."
      );
    }

    const {groupId, token} = request.data ?? {};
    const username =
      typeof request.data?.username === "string" ?
        request.data.username.trim() :
        "";

    if (typeof groupId !== "string" || !groupId ||
        typeof token !== "string" || !token) {
      throw new functions.HttpsError(
        "invalid-argument",
        "This invitation link is incomplete."
      );
    }
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
      throw new functions.HttpsError(
        "invalid-argument",
        `Your name in this group must be ${USERNAME_MIN}-${USERNAME_MAX} ` +
          "characters."
      );
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const groupRef = db.collection("groups").doc(groupId);
    const tokenRef = groupRef.collection("registrationTokens").doc(token);
    const usernameRef = groupRef
      .collection("usernames")
      .doc(username.toLowerCase());
    const groupUserRef = groupRef.collection("users").doc(uid);
    const userRef = db.collection("users").doc(uid);

    try {
      await db.runTransaction(async (transaction) => {
        const [tokenDoc, groupDoc, userDoc, groupUserDoc, usernameDoc] =
          await Promise.all([
            transaction.get(tokenRef),
            transaction.get(groupRef),
            transaction.get(userRef),
            transaction.get(groupUserRef),
            transaction.get(usernameRef),
          ]);

        if (!tokenDoc.exists || !groupDoc.exists) {
          throw new functions.HttpsError(
            "not-found",
            "This invitation does not exist. Ask for a new link."
          );
        }

        const problem = registrationTokenProblem(tokenDoc.data() ?? {});
        if (problem === "used") {
          throw new functions.HttpsError(
            "failed-precondition",
            "This invitation has already been used. Ask for a new link."
          );
        }
        if (problem === "expired") {
          throw new functions.HttpsError(
            "failed-precondition",
            "This invitation has expired. Ask for a new link."
          );
        }

        const groups: string[] = userDoc.data()?.groups ?? [];
        if (groups.includes(groupId) || groupUserDoc.exists) {
          throw new functions.HttpsError(
            "already-exists",
            "You are already a member of this group."
          );
        }

        if (usernameDoc.exists && usernameDoc.data()?.userId !== uid) {
          throw new functions.HttpsError(
            "already-exists",
            "Username is already taken in this group."
          );
        }

        const now = new Date();

        if (userDoc.exists) {
          transaction.update(userRef, {
            groups: FieldValue.arrayUnion(groupId),
            activeGroupId: groupId,
          });
        } else {
          transaction.set(userRef, {
            id: uid,
            ...(request.auth?.token.email ?
              {email: request.auth.token.email} :
              {}),
            groups: [groupId],
            activeGroupId: groupId,
            lastLogin: now,
            createdAt: now,
          });
        }

        transaction.set(groupUserRef, {
          userId: uid,
          username,
          role: "member",
          joinedAt: now,
          preferences: {
            theme: userDoc.exists ? "default" : "light",
          },
        });

        transaction.set(usernameRef, {
          userId: uid,
          originalUsername: username,
          createdAt: now,
        });

        transaction.update(tokenRef, {
          used: true,
          usedAt: now,
          usedBy: uid,
        });
      });

      return {success: true, groupId};
    } catch (error) {
      rethrowHttpsError(
        error,
        `Failed to join the group: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        (wrappedError) =>
          console.error("Error redeeming invitation:", wrappedError)
      );
    }
  }
);
