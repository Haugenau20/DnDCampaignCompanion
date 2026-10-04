// functions/src/shared/usernameReservations.ts
import * as admin from "firebase-admin";

/**
 * Adds to `batch` the deletion of every username reservation in a group that
 * belongs to `userId` -- the reservations a departing member releases.
 *
 * Found by owner, not by the profile's `username`: that field is
 * client-written, and trusting it let a member who took another member's name
 * release that member's reservation by leaving (SEC-005, T080). By owner also
 * catches names the profile no longer shows: the profile editor used to rename
 * without moving the reservation, so a member can hold an old name too.
 *
 * Each delete is conditional on the reservation being unchanged since it was
 * read, so one released and re-reserved by somebody else in between fails the
 * commit instead of being deleted.
 *
 * @param {admin.firestore.WriteBatch} batch - Batch the deletions join.
 * @param {string} groupId - Group whose reservations to release.
 * @param {string} userId - Uid of the departing member.
 * @return {Promise<void>} Resolves once the deletions are in the batch.
 */
export async function releaseUsernames(
  batch: admin.firestore.WriteBatch,
  groupId: string,
  userId: string
): Promise<void> {
  const owned = await admin
    .firestore()
    .collection("groups")
    .doc(groupId)
    .collection("usernames")
    .where("userId", "==", userId)
    .get();

  for (const reservation of owned.docs) {
    batch.delete(reservation.ref, {lastUpdateTime: reservation.updateTime});
  }
}
