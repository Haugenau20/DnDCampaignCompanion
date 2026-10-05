// functions/src/userManagement/deleteUser.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {deleteGroupUserDocument} from "../shared/deleteUserSubtree";
import {LAST_ADMIN_MESSAGE, stepDownAsAdmin} from "../shared/groupAdmins";
import {releaseUsernames} from "../shared/usernameReservations";

interface DeleteUserData {
  userId: string;
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
      const callerUid = request.auth.uid;
      
      // Determine if self-deletion or admin deletion
      const isSelfDeletion = userIdToDelete === callerUid;
      
      // For admin deletion, verify admin status
      if (!isSelfDeletion) {
        const callerDoc = await admin
          .firestore()
          .collection("users")
          .doc(callerUid)
          .get();
          
        if (!callerDoc.exists || !callerDoc.data()?.isAdmin) {
          throw new functions.HttpsError(
            "permission-denied",
            "Only administrators can delete other users."
          );
        }
      }
      
      // Get user's global profile to find group memberships
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(userIdToDelete)
        .get();
      
      if (!userDoc.exists) {
        throw new functions.HttpsError(
          "not-found",
          "User profile not found."
        );
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
        throw new functions.HttpsError(
          "failed-precondition",
          isSelfDeletion ?
            LAST_ADMIN_MESSAGE :
            "This user is the only admin of one of their groups. Make " +
              "another member of that group an admin first."
        );
      }

      // Create a batch for Firestore operations
      const batch = admin.firestore().batch();
      
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
      await admin.auth().deleteUser(userIdToDelete);
      
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