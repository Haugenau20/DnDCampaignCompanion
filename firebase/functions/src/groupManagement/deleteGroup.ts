// functions/src/groupManagement/deleteGroup.ts
import * as functions from "firebase-functions/v2/https";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {finishGroupDeletion, groupDeletionRef} from "./groupDeletion";

interface DeleteGroupData {
  groupId: string;
}

/**
 * Deletes a group and everything stored for it (T037): its campaigns, its
 * members' profiles in it with their private notes, its invitations, and its
 * pictures. Members keep their accounts; the group is taken off each of
 * them, and someone left with no group lands where a new account does.
 *
 * Server-side for the reasons `deleteCampaign` gives: the client SDK cannot
 * enumerate subcollections, and the rules are path-scoped.
 *
 * Resumable: a call that fails partway leaves a record in
 * `groupDeletions/{groupId}`, and calling again finishes the job even once
 * the group document is gone -- as does the daily
 * `resumeGroupDeletionsDaily`, since the caller may by then have lost the
 * group from their account. The same transaction marks the group
 * `deleting`, which `redeemInvitation` and `reserveSignUp` refuse.
 */
export const deleteGroup = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest<DeleteGroupData>) => {
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "You must be logged in to delete a group."
      );
    }

    const groupId = request.data?.groupId;
    if (typeof groupId !== "string" || !groupId) {
      throw new functions.HttpsError("invalid-argument", "No group given.");
    }

    try {
      const callerUid = request.auth.uid;
      const db = getFirestore();
      const groupRef = db.collection("groups").doc(groupId);

      // A group admin or a global admin. Mirrors the isGroupAdmin() /
      // isGlobalAdmin() helpers in firebase/firestore.rules.prod.
      const [groupUserDoc, globalUserDoc] = await Promise.all([
        groupRef.collection("users").doc(callerUid).get(),
        db.collection("users").doc(callerUid).get(),
      ]);
      const isGroupAdmin =
        groupUserDoc.exists && groupUserDoc.data()?.role === "admin";
      const isGlobalAdmin =
        globalUserDoc.exists && globalUserDoc.data()?.isAdmin === true;

      const deletionRef = groupDeletionRef(groupId);

      await db.runTransaction(async (transaction) => {
        const [groupDoc, deletionDoc] = await Promise.all([
          transaction.get(groupRef),
          transaction.get(deletionRef),
        ]);
        // A deletion under way may be finished by whoever started it, even
        // once their admin profile has gone with the group.
        const startedBy = deletionDoc.get("requestedBy");
        if (!isGroupAdmin && !isGlobalAdmin && startedBy !== callerUid) {
          throw new functions.HttpsError(
            "permission-denied",
            "Only group admins can delete a group."
          );
        }
        if (!deletionDoc.exists && !groupDoc.exists) {
          throw new functions.HttpsError("not-found", "Group not found.");
        }
        if (groupDoc.exists && groupDoc.get("deleting") !== true) {
          transaction.update(groupRef, {deleting: true});
        }
        if (!deletionDoc.exists) {
          transaction.create(deletionRef, {
            requestedBy: callerUid,
            requestedAt: FieldValue.serverTimestamp(),
          });
        }
      });

      await finishGroupDeletion(groupId);

      return {success: true, message: "Group deleted successfully"};
    } catch (error) {
      rethrowHttpsError(
        error,
        `Failed to delete group: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        (wrappedError) => console.error("Error deleting group:", wrappedError)
      );
    }
  }
);
