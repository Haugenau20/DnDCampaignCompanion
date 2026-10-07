// functions/src/campaignManagement/deleteCampaign.ts
import * as functions from "firebase-functions/v2/https";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {
  campaignDeletionRef,
  finishCampaignDeletion,
} from "./campaignDeletion";

interface DeleteCampaignData {
  groupId: string;
  campaignId: string;
}

/**
 * Deletes a campaign and everything that belongs to it.
 * That includes its images in Storage.
 *
 * This has to run server-side with the Admin SDK for two reasons:
 *  - Firestore does not cascade-delete subcollections when a parent document
 *    is deleted, and the client SDK cannot enumerate subcollections at all,
 *    so a client-side cascade would need a hardcoded (and driftable) list of
 *    them.
 *  - Notes and reading progress belonging to the campaign live outside the
 *    campaign subtree entirely (groups/{groupId}/users/{uid}/notes, keyed by
 *    a campaignId FIELD, and .../story-progress/{campaignId}), and production Firestore rules are path-scoped, so a
 *    collectionGroup query for them would be denied even from the client.
 *
 * It is resumable: a call that fails partway leaves a record in
 * `groups/{groupId}/campaignDeletions/{campaignId}`, and calling again
 * finishes the job even once the campaign document itself is gone (T037).
 * So does the daily `resumeCampaignDeletionsDaily`, for a deletion nobody
 * retries -- the campaign may already have vanished from the app.
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

      // Caller must be a group admin. Mirrors the isGroupAdmin() helper in
      // firebase/firestore.rules.prod.
      const groupUserDoc = await getFirestore()
        .collection("groups")
        .doc(groupId)
        .collection("users")
        .doc(callerUid)
        .get();

      const isGroupAdmin =
        groupUserDoc.exists && groupUserDoc.data()?.role === "admin";

      if (!isGroupAdmin) {
        throw new functions.HttpsError(
          "permission-denied",
          "Only group admins can delete a campaign."
        );
      }

      const campaignRef = getFirestore()
        .collection("groups")
        .doc(groupId)
        .collection("campaigns")
        .doc(campaignId);
      const deletionRef = campaignDeletionRef(groupId, campaignId);

      // 0. Record the deletion before touching anything, OUTSIDE the
      // campaign's subtree. No stage below is atomic and the campaign
      // document cannot be the record of an unfinished deletion:
      // `recursiveDelete` removes the root even when a descendant failed
      // (DATA-004), after which "the campaign exists" was the only test a
      // retry had and it answered not-found. A retry now resumes whenever
      // this record exists, campaign or no campaign, and the record goes
      // last, once every stage has succeeded. Clients cannot read or write
      // `campaignDeletions`; the rules' default deny covers it.
      //
      // The same transaction marks the campaign `deleting`, which closes it
      // to writes (DATA-010): the production rules refuse any note, reading
      // progress or content written into a campaign that is marked, or that
      // no longer exists, so nothing can land behind the cleanup's back.
      await getFirestore().runTransaction(async (transaction) => {
        const [campaignDoc, deletionDoc] = await Promise.all([
          transaction.get(campaignRef),
          transaction.get(deletionRef),
        ]);
        if (!deletionDoc.exists && !campaignDoc.exists) {
          throw new functions.HttpsError("not-found", "Campaign not found.");
        }
        if (campaignDoc.exists && campaignDoc.get("deleting") !== true) {
          transaction.update(campaignRef, {deleting: true});
        }
        if (!deletionDoc.exists) {
          transaction.create(deletionRef, {
            requestedBy: callerUid,
            requestedAt: FieldValue.serverTimestamp(),
          });
        }
      });

      await finishCampaignDeletion(groupId, campaignId);

      return {success: true, message: "Campaign deleted successfully"};
    } catch (error) {
      // Preserve specific error codes (permission-denied, not-found) instead
      // of collapsing every failure into "internal" -- callers need to be
      // able to tell "you don't have access" from "something broke".
      rethrowHttpsError(
        error,
        `Failed to delete campaign: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        (wrappedError) =>
          console.error("Error deleting campaign:", wrappedError)
      );
    }
  }
);
