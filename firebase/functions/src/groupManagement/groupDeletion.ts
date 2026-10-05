// functions/src/groupManagement/groupDeletion.ts
import * as admin from "firebase-admin";
import {onSchedule} from "firebase-functions/v2/scheduler";
// Modular, not `admin.firestore.*`: the functions emulator wraps the
// namespaced `admin.firestore` in a stand-in without these.
import {FieldPath, FieldValue, Timestamp} from "firebase-admin/firestore";
import {imageBucket} from "../shared/imageBucket";
import {checkedBulkWriter} from "../shared/checkedBulkWriter";
import {RESERVATIONS} from "../signUp/signUpGate";

/**
 * The record of a group deletion that has started and not yet finished.
 *
 * Top-level, because the group cannot record its own unfinished deletion:
 * everything beneath it goes, and `recursiveDelete` removes the root even
 * when a descendant failed. Clients cannot read or write `groupDeletions`;
 * the rules' default deny covers it.
 *
 * @param {string} groupId The group
 * @return {admin.firestore.DocumentReference} The record
 */
export function groupDeletionRef(
  groupId: string
): admin.firestore.DocumentReference {
  return admin.firestore().collection("groupDeletions").doc(groupId);
}

/**
 * Runs every stage of a group deletion whose record exists, and deletes the
 * record once all of them have succeeded (T037).
 *
 * Every stage is safe to repeat, so this is both the first run and every
 * retry: it throws on the first stage that fails, and the record stays for
 * the next attempt.
 *
 * The order closes the group before it empties it. A write that lands
 * before a stage is removed by a later one; none can land after:
 *  1. members lose the group from `users/{uid}.groups`, which is what the
 *     rules' `isGroupMember` reads -- no member read or write passes again;
 *  2. the group's member profiles go, with their private notes and reading
 *     progress -- `isGroupAdmin` reads `role` there, so the admin-only
 *     writes (invitations, the crest) close too;
 *  3. everything else beneath the group: campaigns and their contents,
 *     invitations, name reservations, upload ledgers;
 *  4. pending sign-ups for the group's invitations, which hold an email;
 *  5. the group's pictures, after the documents that show them (IMG-005).
 *
 * @param {string} groupId The group
 * @return {Promise<void>} Resolves once the group and the record are gone
 */
export async function finishGroupDeletion(groupId: string): Promise<void> {
  const db = admin.firestore();
  const groupRef = db.collection("groups").doc(groupId);

  // 1. Found by the array the rules read, not by the group's member
  // profiles: those are deleted in stage 2, and anyone holding the group
  // in `groups` without a profile still passes `isGroupMember`.
  const members = await db
    .collection("users")
    .where("groups", "array-contains", groupId)
    .get();
  const memberWriter = checkedBulkWriter();
  for (const member of members.docs) {
    memberWriter.update(member.ref, {
      groups: FieldValue.arrayRemove(groupId),
      ...(member.get("activeGroupId") === groupId ? {activeGroupId: null} : {}),
    });
  }
  await memberWriter.close("member account(s)");

  // 2 and 3. `recursiveDelete` finds descendants whether or not their
  // parent still exists, so a retry picks up whatever a failure left.
  await db.recursiveDelete(groupRef.collection("users"));
  await db.recursiveDelete(groupRef);

  // 4.
  const reservations = await db
    .collection(RESERVATIONS)
    .where("groupId", "==", groupId)
    .get();
  const reservationWriter = checkedBulkWriter();
  reservations.docs.forEach((doc) => reservationWriter.delete(doc.ref));
  await reservationWriter.close("pending sign-up(s)");

  // 5. The trailing slash matters: without it, "g1" would also take "g10".
  await imageBucket().deleteFiles({prefix: `groups/${groupId}/`});

  await groupDeletionRef(groupId).delete();
}

/** How long a deletion is left to its caller before the sweep resumes it. */
export const RESUME_AFTER_MS = 60 * 60 * 1000;

/** The most deletions one sweep resumes; the rest wait for the next run. */
export const RESUME_BUDGET = 10;

/** What one sweep did. */
export interface ResumeResult {
  /** The id of each group whose deletion it finished. */
  finished: string[];
  /** The id of each group whose deletion failed again. */
  failed: string[];
  /** Whether it stopped at its budget with records left unread. */
  more: boolean;
}

/**
 * Finishes group deletions nobody retried.
 *
 * A deletion that failed after the caller lost the group cannot be retried
 * from the app -- it is no longer theirs to see -- so without this its
 * leftovers would stay stored for good. Records younger than
 * {@link RESUME_AFTER_MS} are skipped: their deletion may still be running.
 * A record that fails again stays for the next run.
 *
 * @param {Date} now The time the sweep treats as now
 * @param {number} budget The most records to read
 * @return {Promise<ResumeResult>} What it did
 */
export async function resumeGroupDeletions(
  now: Date,
  budget = RESUME_BUDGET
): Promise<ResumeResult> {
  const records = await admin
    .firestore()
    .collection("groupDeletions")
    .orderBy(FieldPath.documentId())
    .limit(budget + 1)
    .get();

  const result: ResumeResult = {
    finished: [],
    failed: [],
    more: records.size > budget,
  };

  for (const record of records.docs.slice(0, budget)) {
    const requestedAt = record.get("requestedAt");
    const age = requestedAt instanceof Timestamp ?
      now.getTime() - requestedAt.toMillis() :
      Infinity;
    if (age < RESUME_AFTER_MS) continue;

    try {
      await finishGroupDeletion(record.id);
      result.finished.push(record.id);
    } catch (error) {
      console.error(`Could not finish deleting group ${record.id}:`, error);
      result.failed.push(record.id);
    }
  }
  return result;
}

/**
 * Runs once a day, before the image sweep, and finishes any group deletion
 * that failed and was never retried.
 */
export const resumeGroupDeletionsDaily = onSchedule(
  {
    schedule: "every day 03:15",
    timeZone: "Europe/Copenhagen",
    region: "europe-west1",
  },
  async () => {
    const result = await resumeGroupDeletions(new Date());
    console.log(
      `Group deletions resumed: finished ${result.finished.length}, ` +
        `failed ${result.failed.length}` +
        (result.more ? "; stopped at its budget, the rest is tomorrow's." : ".")
    );
  }
);
