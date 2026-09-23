// functions/src/groupManagement/setMemberRole.ts
import * as functions from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {rethrowHttpsError} from "../shared/httpsErrors";
import {LAST_ADMIN_MESSAGE, wouldStrandGroup} from "../shared/groupAdmins";

type Role = "admin" | "member";

interface SetMemberRoleData {
  groupId: string;
  userId: string;
  role: Role;
}

/**
 * Makes a member an admin, or an admin a member (T034).
 *
 * Only a group admin may call it. It runs server-side rather than as a client
 * write -- which the rules used to permit a group admin -- because of the one
 * thing a rule cannot check: whether the change would leave the group with no
 * admin at all (T035). That needs every member's role, and rules cannot count.
 * So the rules now refuse any client write to `role`, and this is the only
 * path that changes one.
 *
 * Setting the role someone already has succeeds and writes nothing.
 */
export const setMemberRole = functions.onCall(
  {
    region: "europe-west1",
  },
  async (request: functions.CallableRequest<SetMemberRoleData>) => {
    if (!request.auth) {
      throw new functions.HttpsError(
        "unauthenticated",
        "You must be signed in to change a member's role."
      );
    }

    const {groupId, userId, role} = request.data ?? {};
    if (typeof groupId !== "string" || !groupId ||
        typeof userId !== "string" || !userId ||
        (role !== "admin" && role !== "member")) {
      throw new functions.HttpsError(
        "invalid-argument",
        "A group, a member and a role of \"admin\" or \"member\" are required."
      );
    }

    try {
      const usersRef = admin
        .firestore()
        .collection("groups")
        .doc(groupId)
        .collection("users");

      const caller = await usersRef.doc(request.auth.uid).get();
      if (!caller.exists || caller.data()?.role !== "admin") {
        throw new functions.HttpsError(
          "permission-denied",
          "Only group admins can change a member's role."
        );
      }

      const targetRef = usersRef.doc(userId);
      const target = await targetRef.get();
      if (!target.exists) {
        throw new functions.HttpsError(
          "not-found",
          "That person is not a member of this group."
        );
      }

      if (target.data()?.role === role) {
        return {success: true};
      }

      if (role === "member" && await wouldStrandGroup(groupId, userId, false)) {
        throw new functions.HttpsError(
          "failed-precondition",
          LAST_ADMIN_MESSAGE
        );
      }

      await targetRef.update({role});
      return {success: true};
    } catch (error) {
      rethrowHttpsError(
        error,
        `Failed to change the role: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        (wrappedError) =>
          console.error("Error setting member role:", wrappedError)
      );
    }
  }
);
