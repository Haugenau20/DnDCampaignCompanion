// functions/src/shared/groupAdmins.ts
import {
  DocumentSnapshot,
  getFirestore,
  QuerySnapshot,
  Transaction,
} from "firebase-admin/firestore";

/**
 * The reads that decide whether a group keeps an admin, taken inside a
 * transaction so the decision and the write it guards commit together.
 */
interface AdminSnapshot {
  /** The member stepping away, or undefined when they are not in the group. */
  self: DocumentSnapshot;
  /** Every admin of the group, `self` included when they are one. */
  admins: QuerySnapshot;
  /** Up to two members of the group -- enough to tell "anyone else?". */
  anyMembers: QuerySnapshot;
}

/**
 * Reads, inside `transaction`, what {@link strandsGroup} needs for one group.
 *
 * Only the admins are read in full, plus at most two members: a large group's
 * other members are neither fetched nor locked.
 *
 * Read in a server-side transaction, these documents are locked until it
 * commits. Two admins stepping away at once each read the other's document and
 * write their own, so their transactions conflict, one retries, and the retry
 * sees the first one's demotion (AUTH-001).
 *
 * @param {Transaction} transaction The transaction to read in
 * @param {string} groupId The group
 * @param {string} userId The member stepping away
 * @return {Promise<AdminSnapshot>} The reads
 */
export async function readAdmins(
  transaction: Transaction,
  groupId: string,
  userId: string
): Promise<AdminSnapshot> {
  const users = getFirestore()
    .collection("groups")
    .doc(groupId)
    .collection("users");

  const admins = await transaction.get(users.where("role", "==", "admin"));
  const anyMembers = await transaction.get(users.limit(2));
  const self = await transaction.get(users.doc(userId));
  return {self, admins, anyMembers};
}

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
 * Decide only from reads taken in the transaction that makes the change
 * ({@link readAdmins}); a decision from reads outside it lets two admins
 * stepping away at once both pass (AUTH-001).
 *
 * @param {AdminSnapshot} snapshot The group's admins, read in the transaction
 * @param {string} userId The admin who is stepping away
 * @param {boolean} allowEmptyGroup Permit it when nobody else is in the group
 * @return {boolean} true when the change must be refused
 */
export function strandsGroup(
  snapshot: AdminSnapshot,
  userId: string,
  allowEmptyGroup: boolean
): boolean {
  if (!snapshot.self.exists || snapshot.self.data()?.role !== "admin") {
    return false;
  }

  const othersExist = snapshot.anyMembers.docs.some((doc) => doc.id !== userId);
  if (!othersExist) return !allowEmptyGroup;

  return !snapshot.admins.docs.some((doc) => doc.id !== userId);
}

/**
 * Takes `userId` out of the administration of every group in `groupIds`, in
 * one transaction, before they leave those groups or delete their account.
 *
 * The guard and the demotion commit together, which is what makes the guard
 * hold under concurrency (AUTH-001): the leave or account deletion that
 * follows can run outside any transaction, because by then the person is a
 * plain member and nothing it does can strand a group. If it fails partway,
 * the person stays behind as a member, and a retry passes the guard because
 * they are no longer an admin.
 *
 * All groups or none: if any group would be stranded, nothing is demoted.
 * A member who is not an admin, or not in a group, is left untouched there.
 *
 * @param {string[]} groupIds The groups they are stepping away from
 * @param {string} userId The person stepping away
 * @return {Promise<string | null>} The first group that refused, or null
 *   when every demotion committed
 */
export async function stepDownAsAdmin(
  groupIds: string[],
  userId: string
): Promise<string | null> {
  if (groupIds.length === 0) return null;

  return getFirestore().runTransaction(async (transaction) => {
    const snapshots: AdminSnapshot[] = [];
    for (const groupId of groupIds) {
      snapshots.push(await readAdmins(transaction, groupId, userId));
    }

    const refused = groupIds.find((groupId, index) =>
      strandsGroup(snapshots[index], userId, true)
    );
    if (refused !== undefined) return refused;

    for (const {self} of snapshots) {
      if (self.exists && self.data()?.role === "admin") {
        transaction.update(self.ref, {role: "member"});
      }
    }
    return null;
  });
}

/** The message every refusal from {@link strandsGroup} carries. */
export const LAST_ADMIN_MESSAGE =
  "You are this group's only admin. Make another member an admin first, " +
  "so the group is not left without anyone who can run it.";
