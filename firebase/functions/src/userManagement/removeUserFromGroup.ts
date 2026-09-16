// functions/src/userManagement/removeUserFromGroup.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {deleteGroupUserDocument} from "../shared/deleteUserSubtree";

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
      
      // Get the user's profile
      const userProfileRef = admin
        .firestore()
        .collection("groups")
        .doc(groupId)
        .collection("users")
        .doc(userId);
      
      const userProfile = await userProfileRef.get();
      
      // Get username to delete reservation
      let username = null;
      if (userProfile.exists && userProfile.data()?.username) {
        username = userProfile.data()?.username;
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
      
      // Delete username reservation if it exists
      if (username) {
        const usernameRef = admin
          .firestore()
          .collection("groups")
          .doc(groupId)
          .collection("usernames")
          .doc(username.toLowerCase());
        
        batch.delete(usernameRef);
      }
      
      // Leaving a group takes your private notes with you; they live in a
      // subcollection of this document, which a batched delete would orphan.
      //
      // This runs BEFORE the commit, mirroring deleteUser, and the ordering is
      // load-bearing. The batch strips this group from the user's global
      // `groups` array, so committing first and failing here would leave the
      // notes orphaned with no way back: the leave-group path no longer sees
      // the membership, so nothing would retry the subtree deletion. Failing
      // before the commit leaves the user in the group and the operation
      // retryable. The username was already read above, so deleting the
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