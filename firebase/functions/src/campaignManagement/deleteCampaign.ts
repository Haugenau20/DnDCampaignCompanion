// functions/src/campaignManagement/deleteCampaign.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

interface DeleteCampaignData {
  groupId: string;
  campaignId: string;
}

/**
 * Deletes a campaign and everything that belongs to it.
 *
 * This has to run server-side with the Admin SDK for two reasons:
 *  - Firestore does not cascade-delete subcollections when a parent document
 *    is deleted, and the client SDK cannot enumerate subcollections at all,
 *    so a client-side cascade would need a hardcoded (and driftable) list of
 *    them.
 *  - Notes belonging to the campaign live outside the campaign subtree
 *    entirely (groups/{groupId}/users/{uid}/notes, keyed by a campaignId
 *    FIELD), and production Firestore rules are path-scoped, so a
 *    collectionGroup query for them would be denied even from the client.
 */
export const deleteCampaign = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest<DeleteCampaignData>) => {
    const {groupId, campaignId} = request.data;

    // Check if the caller is authenticated
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "You must be logged in to delete a campaign."
      );
    }

    try {
      const callerUid = request.auth.uid;

      // Caller must be a group admin or a global admin. Mirrors the
      // isGroupAdmin() / isGlobalAdmin() helpers in
      // firebase/firestore.rules.prod.
      const [groupUserDoc, globalUserDoc] = await Promise.all([
        admin
          .firestore()
          .collection("groups")
          .doc(groupId)
          .collection("users")
          .doc(callerUid)
          .get(),
        admin.firestore().collection("users").doc(callerUid).get(),
      ]);

      const isGroupAdmin =
        groupUserDoc.exists && groupUserDoc.data()?.role === "admin";
      const isGlobalAdmin =
        globalUserDoc.exists && globalUserDoc.data()?.isAdmin === true;

      if (!isGroupAdmin && !isGlobalAdmin) {
        throw new functions.HttpsError(
          "permission-denied",
          "Only group admins can delete a campaign."
        );
      }

      const campaignRef = admin
        .firestore()
        .collection("groups")
        .doc(groupId)
        .collection("campaigns")
        .doc(campaignId);

      const campaignDoc = await campaignRef.get();
      if (!campaignDoc.exists) {
        throw new functions.HttpsError("not-found", "Campaign not found.");
      }

      // 1. Notes are NOT under the campaign document -- they live at
      // groups/{groupId}/users/{uid}/notes with a campaignId FIELD -- so a
      // recursive delete of the campaign never reaches them. Walk each group
      // member's profile: delete their notes for this campaign, and clear
      // activeCampaignId on any profile that still points at it.
      //
      // ORDERING IS DELIBERATE: this runs BEFORE recursiveDelete. Neither step
      // is atomic, so one of them has to be able to fail first, and it must be
      // the recoverable one. If this fails, the campaign still exists and the
      // whole call can simply be retried. If recursiveDelete ran first and
      // this failed, the campaign would be gone and its notes stranded --
      // which is precisely the orphaning this function exists to prevent.
      //
      // BulkWriter rather than WriteBatch: a batch caps at 500 operations, and
      // a long-running campaign can exceed that (a weekly game with 5 players
      // reaches it in two years of session notes). BulkWriter chunks and
      // retries on its own, so there is no limit to trip over.
      const groupUsersSnapshot = await admin
        .firestore()
        .collection("groups")
        .doc(groupId)
        .collection("users")
        .get();

      const writer = admin.firestore().bulkWriter();

      for (const userDoc of groupUsersSnapshot.docs) {
        if (userDoc.data()?.activeCampaignId === campaignId) {
          writer.update(userDoc.ref, {activeCampaignId: null});
        }

        const notesSnapshot = await userDoc.ref
          .collection("notes")
          .where("campaignId", "==", campaignId)
          .get();

        notesSnapshot.docs.forEach((noteDoc) => {
          writer.delete(noteDoc.ref);
        });
      }

      // Rejects if any queued write exhausted its retries.
      await writer.close();

      // 2. Recursively delete the campaign document and every subcollection
      // beneath it (npcs, locations, quests, rumors, chapters,
      // story-progress, saga -- and any subcollection added later).
      // `recursiveDelete` enumerates subcollections via `listCollections()`,
      // so this stays correct by construction instead of relying on a
      // hardcoded list.
      await admin.firestore().recursiveDelete(campaignRef);

      return {success: true, message: "Campaign deleted successfully"};
    } catch (error) {
      // Preserve specific error codes (permission-denied, not-found) instead
      // of collapsing every failure into "internal" -- callers need to be
      // able to tell "you don't have access" from "something broke".
      if (error instanceof functions.HttpsError) {
        throw error;
      }
      console.error("Error deleting campaign:", error);
      throw new functions.HttpsError(
        "internal",
        `Failed to delete campaign: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
);
