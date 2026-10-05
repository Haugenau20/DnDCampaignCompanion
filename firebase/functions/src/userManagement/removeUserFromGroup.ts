// functions/src/userManagement/removeUserFromGroup.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {deleteGroupUserDocument} from "../shared/deleteUserSubtree";
import {LAST_ADMIN_MESSAGE, stepDownAsAdmin} from "../shared/groupAdmins";
import {releaseUsernames} from "../shared/usernameReservations";

export const removeUserFromGroup = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest<{groupId: string; userId: string}>) => {
    const {groupId, userId} = request.data;
    
    // Check if caller is authenticated
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "You must be logged in to remove users."
      );
    }
    
    try {
      const callerUid = request.auth.uid;
      const isSelfRemoval = callerUid === userId;
      
      // The last admin may not leave while anyone else is still in the group
      // (T035): nobody could invite, manage a campaign or reach /admin again.
      // Leaving an otherwise empty group is allowed -- there is nobody to hand
      // it to, and refusing would trap them in it.
      //
      // An admin who may leave is demoted first, in the same transaction as
      // the check, so two admins leaving at once cannot both count the other
      // (AUTH-001). The rest of the removal then concerns a plain member.
      if (isSelfRemoval && await stepDownAsAdmin([groupId], callerUid)) {
        throw new functions.HttpsError(
          "failed-precondition",
          LAST_ADMIN_MESSAGE
        );
      }

      // Allow self-removal or admin removal
      if (!isSelfRemoval) {
        // Verify caller is an admin of the group
        const adminProfileRef = admin
          .firestore()
          .collection("groups")
          .doc(groupId)
          .collection("users")
          .doc(callerUid);
        
        const adminProfile = await adminProfileRef.get();
        
        if (!adminProfile.exists || adminProfile.data()?.role !== "admin") {
          throw new functions.HttpsError(
            "permission-denied",
            "Only group admins can remove other users."
          );
        }
        
        // Check if target user is also an admin
        const targetUserRef = admin
          .firestore()
          .collection("groups")
          .doc(groupId)
          .collection("users")
          .doc(userId);
        
        const targetUser = await targetUserRef.get();
        
        if (targetUser.exists && targetUser.data()?.role === "admin") {
          throw new functions.HttpsError(
            "failed-precondition",
            "Cannot remove another admin from the group."
          );
        }
      }
      
      // Execute as a batch to ensure atomicity
      const batch = admin.firestore().batch();
      
      // Update the user's global profile to remove this group
      const globalUserRef = admin.firestore().collection("users").doc(userId);
      const globalUser = await globalUserRef.get();
      
      if (globalUser.exists) {
        const userData = globalUser.data();
        const updatedGroups = (userData?.groups || []).filter(
          (g: string) => g !== groupId
        );
        
        // Update the global user profile
        batch.update(globalUserRef, {
          groups: updatedGroups,
          // Clear activeGroupId if it matches the group being removed
          ...(userData?.activeGroupId === groupId ? { activeGroupId: null } : {})
        });
      }
      
      // Release the user's name reservations -- found by owner, never by
      // the profile's client-written `username` (SEC-005, T080).
      await releaseUsernames(batch, groupId, userId);
      
      // Leaving a group takes your private notes with you; they live in a
      // subcollection of this document, which a batched delete would orphan.
      //
      // This runs BEFORE the commit, mirroring deleteUser, and the ordering is
      // load-bearing. The batch strips this group from the user's global
      // `groups` array, so committing first and failing here would leave the
      // notes orphaned with no way back: the leave-group path no longer sees
      // the membership, so nothing would retry the subtree deletion. Failing
      // before the commit leaves the user in the group and the operation
      // retryable. The reservations were already read above, so deleting the
      // profile document here costs the batch nothing.
      await deleteGroupUserDocument(groupId, userId);

      // Commit all changes
      await batch.commit();

      return {
        success: true, 
        message: isSelfRemoval ? "Successfully left group" : "User successfully removed from group" 
      };
    } catch (error) {
      console.error("Error removing user from group:", error);
      rethrowHttpsError(
        error,
        `Failed to remove user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
);