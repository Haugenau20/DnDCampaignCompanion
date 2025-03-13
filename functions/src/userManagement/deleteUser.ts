// functions/src/userManagement/deleteUser.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface DeleteUserData {
  userId: string;
}

export const deleteUser = functions.onCall(
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
      
      // Create a batch for Firestore operations
      const batch = admin.firestore().batch();
      
      // 1. Remove from all groups
      for (const groupId of groups) {
        // Delete group user profile
        const groupUserRef = admin
          .firestore()
          .collection("groups")
          .doc(groupId)
          .collection("users")
          .doc(userIdToDelete);
        
        const groupUserDoc = await groupUserRef.get();
        
        // If user has a username in this group, delete the reservation
        if (groupUserDoc.exists && groupUserDoc.data()?.username) {
          const username = groupUserDoc.data()?.username;
          const usernameRef = admin
            .firestore()
            .collection("groups")
            .doc(groupId)
            .collection("usernames")
            .doc(username.toLowerCase());
          
          batch.delete(usernameRef);
        }
        
        // Delete group user profile
        batch.delete(groupUserRef);
      }
      
      // 2. Delete global user profile
      batch.delete(userDoc.ref);
      
      // 3. Commit all Firestore changes
      await batch.commit();
      
      // 4. Delete from Firebase Authentication
      await admin.auth().deleteUser(userIdToDelete);
      
      // Return success
      return {success: true, message: "User deleted successfully"};
    } catch (error) {
      console.error("Error deleting user:", error);
      throw new functions.HttpsError(
        "internal",
        `Failed to delete user: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
);