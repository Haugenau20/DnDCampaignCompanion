// functions/src/userManagement/deleteUser.ts
import * as functions from "firebase-functions/v2/https";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {deleteAccount} from "./accountDeletion";

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

      // An account is deleted only by its holder. The global-admin flag
      // (`users/{uid}.isAdmin`) used to let its holder delete anyone (T119).
      // The maintainer deletes an account on request with
      // `scripts/delete-account.js`, which runs the same `deleteAccount`.
      if (userIdToDelete !== request.auth.uid) {
        throw new functions.HttpsError(
          "permission-denied",
          "You can only delete your own account."
        );
      }

      await deleteAccount(userIdToDelete);

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