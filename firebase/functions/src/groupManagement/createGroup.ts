// functions/src/groupManagement/createGroup.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface CreateGroupData {
  name: string;
  description?: string;
}

/**
 * Creates a new group and the group creator's admin profile.
 *
 * This has to run server-side with the Admin SDK because it writes the
 * caller's own group profile with `role: "admin"`. Production Firestore
 * rules deny clients that write entirely (see bug #1409): a member could
 * otherwise delete their own group profile -- permitted, as "leave group" --
 * and recreate it with an escalated role, because rules cannot distinguish
 * "the group creator, right after creating the group" from "any member,
 * rewriting their own profile" once both writes originate from the client.
 */
export const createGroup = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest<CreateGroupData>) => {
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "You must be logged in to create a group."
      );
    }

    const {name, description} = request.data;
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      throw new functions.HttpsError(
        "invalid-argument",
        "Group name is required."
      );
    }

    try {
      const callerUid = request.auth.uid;
      const callerEmail = request.auth.token.email;
      const groupId = admin.firestore().collection("groups").doc().id;

      await admin.firestore().runTransaction(async (transaction) => {
        const now = new Date();

        // Create the group document.
        const groupDocRef = admin.firestore().collection("groups").doc(groupId);
        transaction.set(groupDocRef, {
          name: trimmedName,
          description: description || "",
          createdAt: now,
          createdBy: callerUid,
        });

        // Add the group to the caller's global profile.
        const userDocRef = admin.firestore().collection("users").doc(callerUid);
        const userDoc = await transaction.get(userDocRef);

        // Default username to use if we can't find one.
        let usernameToUse = "Admin";

        if (userDoc.exists) {
          const userData = userDoc.data() || {};
          const updatedGroups = [...(userData.groups || []), groupId];

          transaction.update(userDocRef, {
            groups: updatedGroups,
            activeGroupId: groupId, // Set as the active group.
          });

          // If the caller has a username in their global profile, use it.
          if (userData.username) {
            usernameToUse = userData.username;
          }
        } else {
          // If the user document doesn't exist (shouldn't happen), create it.
          transaction.set(userDocRef, {
            id: callerUid,
            email: callerEmail,
            groups: [groupId],
            activeGroupId: groupId,
            lastLogin: now,
            createdAt: now,
          });
        }

        // Create the caller's group profile as an admin.
        const groupUserDocRef = admin
          .firestore()
          .collection("groups")
          .doc(groupId)
          .collection("users")
          .doc(callerUid);
        transaction.set(groupUserDocRef, {
          userId: callerUid,
          username: usernameToUse,
          role: "admin",
          joinedAt: now,
          preferences: {
            theme: "default",
          },
        });

        // Reserve the username.
        const usernameLower = usernameToUse.toLowerCase();
        const usernameDocRef = admin
          .firestore()
          .collection("groups")
          .doc(groupId)
          .collection("usernames")
          .doc(usernameLower);
        transaction.set(usernameDocRef, {
          userId: callerUid,
          originalUsername: usernameToUse,
          createdAt: now,
        });
      });

      return {success: true, groupId};
    } catch (error) {
      // Preserve specific error codes instead of collapsing every failure
      // into "internal" -- callers need to be able to tell "bad input" from
      // "something broke".
      if (error instanceof functions.HttpsError) {
        throw error;
      }
      console.error("Error creating group:", error);
      throw new functions.HttpsError(
        "internal",
        `Failed to create group: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
);
