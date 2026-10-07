// functions/src/userManagement/deleteUser.ts
import * as functions from "firebase-functions/v2/https";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {deleteGroupUserDocument} from "../shared/deleteUserSubtree";
import {LAST_ADMIN_MESSAGE, stepDownAsAdmin} from "../shared/groupAdmins";
import {releaseUsernames} from "../shared/usernameReservations";

interface DeleteUserData {
  userId: string;
}

/**
 * Deletes the Auth account of a user whose profile is already gone.
 *
 * @param {string} userId The account to delete
 * @return {Promise<void>} Resolves once the account is gone
 * @throws {functions.HttpsError} `not-found` when there is no account either
 */
async function finishAuthDeletion(userId: string): Promise<void> {
  try {
    await getAuth().deleteUser(userId);
  } catch (error) {
    if ((error as {code?: string}).code === "auth/user-not-found") {
      throw new functions.HttpsError("not-found", "User profile not found.");
    }
    throw error;
  }
}

export const deleteUser = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest<DeleteUserData>) => {
    const data = request.data;
    // Check if the caller is authenticated
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "You must be logged in to delete users."
      );
    }
    
    try {
      const userIdToDelete = data.userId;

      // An account is deleted only by its holder. The global-admin flag
      // (`users/{uid}.isAdmin`) used to let its holder delete anyone; the
      // maintainer, who holds it, reaches every account through the console
      // and the Admin SDK anyway (T119).
      if (userIdToDelete !== request.auth.uid) {
        throw new functions.HttpsError(
          "permission-denied",
          "You can only delete your own account."
        );
      }

      // Get user's global profile to find group memberships
      const userDoc = await getFirestore()
        .collection("users")
        .doc(userIdToDelete)
        .get();
      
      if (!userDoc.exists) {
        // The global profile is the last Firestore record this function
        // deletes -- it lists the groups to clean up, so it goes only once
        // they are gone -- and the Auth account goes after it. A missing
        // profile with an Auth account still standing is therefore an earlier
        // call that failed at its last step: finish it, rather than refuse
        // the only retry there is (AUTH-002).
        await finishAuthDeletion(userIdToDelete);
        return {success: true, message: "User deleted successfully"};
      }
      
      const userData = userDoc.data();
      const groups = userData?.groups || [];

      // Deleting an account is the third door out of a group, after leaving
      // and demotion, and needs the same guard (T035). Checked before anything
      // is deleted, so a refusal changes nothing. Where it passes, the person
      // is demoted in every group in the same transaction as the check, so two
      // admins deleting their accounts at once cannot both count the other
      // (AUTH-001).
      if (await stepDownAsAdmin(groups, userIdToDelete)) {
        throw new functions.HttpsError("failed-precondition", LAST_ADMIN_MESSAGE);
      }

      // Create a batch for Firestore operations
      const batch = getFirestore().batch();
      
      // 1. Release the user's name reservations in every group -- found by
      // owner, never by the profile's client-written `username` (SEC-005,
      // T080).
      for (const groupId of groups) {
        await releaseUsernames(batch, groupId, userIdToDelete);
      }

      // 2. Delete global user profile
      batch.delete(userDoc.ref);

      // The group-user profile is deleted separately from the batch: it owns
      // a `notes` subcollection, and a batched delete would orphan every
      // note rather than remove it. recursiveDelete cannot join a
      // WriteBatch. It runs before the batch commit so that private notes
      // are confirmed gone before the account's own records (which are
      // trivially re-deletable on retry) are removed.
      await Promise.all(
        groups.map((groupId: string) =>
          deleteGroupUserDocument(groupId, userIdToDelete)
        )
      );

      // 3. Commit all Firestore changes
      await batch.commit();
      
      // 4. Delete from Firebase Authentication
      await getAuth().deleteUser(userIdToDelete);
      
      // Return success
      return {success: true, message: "User deleted successfully"};
    } catch (error) {
      console.error("Error deleting user:", error);
      rethrowHttpsError(
        error,
        `Failed to delete user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
);