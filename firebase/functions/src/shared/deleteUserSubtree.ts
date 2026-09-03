// functions/src/shared/deleteUserSubtree.ts
import * as admin from "firebase-admin";

/**
 * Deletes a user's profile document inside a group, together with everything
 * beneath it.
 *
 * A plain `batch.delete()` on the group-user document leaves its
 * subcollections behind: Firestore has no cascade, and orphaned documents
 * stay readable by anything holding their path. The only per-user
 * subcollection today is `notes`, which holds private notes -- so the plain
 * delete was silently retaining the most personal data in the product after
 * a user asked for it to be gone.
 *
 * `recursiveDelete` walks the whole subtree, so it stays correct if another
 * per-user subcollection is added later. It cannot participate in a
 * WriteBatch, so callers must invoke it alongside their batch rather than
 * inside it.
 *
 * @param {string} groupId - Group holding the user profile.
 * @param {string} userId - User whose profile and subtree should be removed.
 * @return {Promise<void>} Resolves once the whole subtree is gone.
 */
export async function deleteGroupUserDocument(
  groupId: string,
  userId: string
): Promise<void> {
  const groupUserRef = admin
    .firestore()
    .collection("groups")
    .doc(groupId)
    .collection("users")
    .doc(userId);

  await admin.firestore().recursiveDelete(groupUserRef);
}
