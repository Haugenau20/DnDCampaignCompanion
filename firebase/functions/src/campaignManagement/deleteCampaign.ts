// functions/src/campaignManagement/deleteCampaign.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {imageBucket} from "../shared/imageBucket";

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

      const groupRef = admin.firestore().collection("groups").doc(groupId);
      const campaignRef = groupRef.collection("campaigns").doc(campaignId);
      const deletionRef = groupRef
        .collection("campaignDeletions")
        .doc(campaignId);

      // 0. Record the deletion before touching anything, OUTSIDE the
      // campaign's subtree. No stage below is atomic and the campaign
      // document cannot be the record of an unfinished deletion:
      // `recursiveDelete` removes the root even when a descendant failed
      // (DATA-004), after which "the campaign exists" was the only test a
      // retry had and it answered not-found. A retry now resumes whenever
      // this record exists, campaign or no campaign, and the record goes
      // last, once every stage has succeeded. Clients cannot read or write
      // `campaignDeletions`; the rules' default deny covers it.
      await admin.firestore().runTransaction(async (transaction) => {
        const [campaignDoc, deletionDoc] = await Promise.all([
          transaction.get(campaignRef),
          transaction.get(deletionRef),
        ]);
        if (deletionDoc.exists) return;
        if (!campaignDoc.exists) {
          throw new functions.HttpsError("not-found", "Campaign not found.");
        }
        transaction.create(deletionRef, {
          requestedBy: callerUid,
          requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // 1. Notes and reading progress are NOT under the campaign document --
      // they live at groups/{groupId}/users/{uid}/notes (with a campaignId
      // FIELD) and .../story-progress/{campaignId} -- so a recursive delete of
      // the campaign never reaches them. Walk each group member's profile:
      // delete their notes and progress for this campaign, and clear
      // activeCampaignId on any profile that still points at it.
      //
      // BulkWriter rather than WriteBatch: a batch caps at 500 operations, and
      // a long-running campaign can exceed that (a weekly game with 5 players
      // reaches it in two years of session notes). BulkWriter chunks and
      // retries on its own, so there is no limit to trip over.
      //
      // `close()` never rejects: a write that exhausted its retries rejects
      // only its own promise (DATA-004). So every write's outcome is kept,
      // caught on the spot so none goes unhandled, and checked after.
      const groupUsersSnapshot = await groupRef.collection("users").get();

      const writer = admin.firestore().bulkWriter();
      const outcomes: Promise<{error: unknown} | null>[] = [];
      const observe = (write: Promise<unknown>) => {
        outcomes.push(write.then(() => null, (error) => ({error})));
      };

      for (const userDoc of groupUsersSnapshot.docs) {
        if (userDoc.data()?.activeCampaignId === campaignId) {
          observe(writer.update(userDoc.ref, {activeCampaignId: null}));
        }

        const notesSnapshot = await userDoc.ref
          .collection("notes")
          .where("campaignId", "==", campaignId)
          .get();

        notesSnapshot.docs.forEach((noteDoc) => {
          observe(writer.delete(noteDoc.ref));
        });

        // Each member's reading progress for this campaign (T073), which
        // sits beside their notes, keyed by the campaign's id. Deleting a
        // document that does not exist succeeds, so no read is needed.
        observe(writer.delete(
          userDoc.ref.collection("story-progress").doc(campaignId)
        ));
      }

      await writer.close();
      const failures = (await Promise.all(outcomes))
        .filter((outcome): outcome is {error: unknown} => outcome !== null);
      if (failures.length > 0) {
        const first = failures[0].error;
        throw new Error(
          `${failures.length} member record(s) could not be cleaned up: ${
            first instanceof Error ? first.message : String(first)
          }`
        );
      }

      // 2. Recursively delete the campaign document and every subcollection
      // beneath it (npcs, locations, quests, rumors, chapters,
      // story-progress, saga -- and any subcollection added later).
      // `recursiveDelete` enumerates subcollections via `listCollections()`,
      // so this stays correct by construction instead of relying on a
      // hardcoded list. It finds descendants whether or not the root still
      // exists, so a retry after a partial failure picks up the rest.
      await admin.firestore().recursiveDelete(campaignRef);

      // 3. The campaign's images (T021). They are keyed by the same path as
      // the campaign, so one prefix covers every entity's files. The trailing
      // slash matters: without it, deleting "c1" would also take "c10".
      //
      // AFTER the documents (IMG-005): files deleted first and documents
      // that then failed to go left a live campaign whose every picture was
      // broken. This way round a failure leaves files nothing points at, and
      // the retry -- or the monthly orphan sweep -- removes them.
      await imageBucket().deleteFiles({
        prefix: `groups/${groupId}/campaigns/${campaignId}/`,
      });

      // 4. Everything is gone: the deletion is finished.
      await deletionRef.delete();

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
