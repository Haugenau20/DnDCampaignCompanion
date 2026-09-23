// functions/src/shared/groupAdmins.ts
import * as admin from "firebase-admin";

/**
 * Whether taking `userId` out of the group's administration -- by leaving,
 * deleting their account, or being demoted -- would leave nobody able to
 * administer it (T035).
 *
 * A group whose last admin is gone is not deleted, it is stranded: nobody can
 * invite a member, manage a campaign or reach `/admin`, and there is no way
 * back inside the product. So the answer is "yes" when `userId` is an admin
 * and no other member is.
 *
 * `allowEmptyGroup` exists for leaving: when the last admin is also the last
 * member, there is nobody to hand the group to, and refusing would trap them
 * in it forever. Demotion never passes it -- a lone admin demoting themselves
 * would strand a group they are still standing in.
 *
 * @param {string} groupId The group
 * @param {string} userId The admin who is stepping away
 * @param {boolean} allowEmptyGroup Permit it when nobody else is in the group
 * @return {Promise<boolean>} true when the change must be refused
 */
export async function wouldStrandGroup(
  groupId: string,
  userId: string,
  allowEmptyGroup: boolean
): Promise<boolean> {
  const users = await admin
    .firestore()
    .collection("groups")
    .doc(groupId)
    .collection("users")
    .get();

  const self = users.docs.find((doc) => doc.id === userId);
  if (!self || self.data().role !== "admin") return false;

  const others = users.docs.filter((doc) => doc.id !== userId);
  if (others.length === 0) return !allowEmptyGroup;

  return !others.some((doc) => doc.data().role === "admin");
}

/** The message every refusal from {@link wouldStrandGroup} carries. */
export const LAST_ADMIN_MESSAGE =
  "You are this group's only admin. Make another member an admin first, " +
  "so the group is not left without anyone who can run it.";
