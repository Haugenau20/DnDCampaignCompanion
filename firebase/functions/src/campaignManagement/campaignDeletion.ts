// functions/src/campaignManagement/campaignDeletion.ts
import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {imageBucket} from "../shared/imageBucket";

/**
 * The record of a campaign deletion that has started and not yet finished,
 * kept outside the subtree it deletes (T037).
 *
 * @param {string} groupId The group
 * @param {string} campaignId The campaign
 * @return {admin.firestore.DocumentReference} The record
 */
export function campaignDeletionRef(
  groupId: string,
  campaignId: string
): admin.firestore.DocumentReference {
  return admin
    .firestore()
    .collection("groups")
    .doc(groupId)
    .collection("campaignDeletions")
    .doc(campaignId);
}

/**
 * Runs every stage of a campaign deletion whose record exists, and deletes
 * the record once all of them have succeeded.
 *
 * Every stage is safe to repeat, so this is both the first run and every
 * retry: it throws on the first stage that fails, and the record stays for
 * the next attempt.
 *
 * @param {string} groupId The group
 * @param {string} campaignId The campaign
 * @return {Promise<void>} Resolves once the campaign and the record are gone
 */
export async function finishCampaignDeletion(
  groupId: string,
  campaignId: string
): Promise<void> {
  const groupRef = admin.firestore().collection("groups").doc(groupId);
  const campaignRef = groupRef.collection("campaigns").doc(campaignId);
  const deletionRef = campaignDeletionRef(groupId, campaignId);

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
}

/** How long a deletion is left to its caller before the sweep resumes it. */
export const RESUME_AFTER_MS = 60 * 60 * 1000;

/** The most deletions one sweep resumes; the rest wait for the next run. */
export const RESUME_BUDGET = 20;

/** What one sweep did. */
export interface ResumeResult {
  /** `groupId/campaignId` of each deletion it finished. */
  finished: string[];
  /** `groupId/campaignId` of each deletion that failed again. */
  failed: string[];
  /** Whether it stopped at its budget with records left unread. */
  more: boolean;
}

/**
 * Finishes campaign deletions nobody retried.
 *
 * A deletion that failed after the campaign document went cannot be retried
 * from the app -- the campaign no longer appears in it -- so without this its
 * leftovers would stay stored for good. Records younger than
 * {@link RESUME_AFTER_MS} are skipped: their deletion may still be running.
 * A record that fails again stays for the next run.
 *
 * @param {Date} now The time the sweep treats as now
 * @param {number} budget The most records to read
 * @return {Promise<ResumeResult>} What it did
 */
export async function resumeCampaignDeletions(
  now: Date,
  budget = RESUME_BUDGET
): Promise<ResumeResult> {
  const records = await admin
    .firestore()
    .collectionGroup("campaignDeletions")
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(budget + 1)
    .get();

  const result: ResumeResult = {
    finished: [],
    failed: [],
    more: records.size > budget,
  };

  for (const record of records.docs.slice(0, budget)) {
    const requestedAt = record.get("requestedAt");
    const age = requestedAt instanceof admin.firestore.Timestamp ?
      now.getTime() - requestedAt.toMillis() :
      Infinity;
    if (age < RESUME_AFTER_MS) continue;

    const groupId = record.ref.parent.parent?.id;
    if (!groupId) continue;
    const key = `${groupId}/${record.id}`;
    try {
      await finishCampaignDeletion(groupId, record.id);
      result.finished.push(key);
    } catch (error) {
      console.error(`Could not finish deleting campaign ${key}:`, error);
      result.failed.push(key);
    }
  }
  return result;
}

/**
 * Runs once a day, before the image sweep, and finishes any campaign
 * deletion that failed and was never retried.
 */
export const resumeCampaignDeletionsDaily = onSchedule(
  {
    schedule: "every day 03:30",
    timeZone: "Europe/Copenhagen",
    region: "europe-west1",
  },
  async () => {
    const result = await resumeCampaignDeletions(new Date());
    console.log(
      `Campaign deletions resumed: finished ${result.finished.length}, ` +
        `failed ${result.failed.length}` +
        (result.more ? "; stopped at its budget, the rest is tomorrow's." : ".")
    );
  }
);
