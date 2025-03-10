/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// functions/src/index.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {sendContactEmail} from "./contact";

admin.initializeApp();

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
      // Verify the caller is an admin
      const callerUid = request.auth.uid;
      const callerDoc = await admin
        .firestore()
        .collection("users")
        .doc(callerUid)
        .get();
      if (!callerDoc.exists || !callerDoc.data()?.isAdmin) {
        throw new functions.HttpsError(
          "permission-denied",
          "Only administrators can delete users."
        );
      }
      const userIdToDelete = data.userId;
      // Don't allow deleting self
      if (userIdToDelete === callerUid) {
        throw new functions.HttpsError(
          "failed-precondition",
          "You cannot delete your own account through this method."
        );
      }
      // Delete from Firebase Authentication
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

export {sendContactEmail};
