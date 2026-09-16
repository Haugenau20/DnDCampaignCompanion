// src/features/user-management/admin/types.ts

/**
 * A member of the active group, as `useGroups().getAllUsers()` returns them.
 *
 * Typed here rather than `any[]` at every call site, which is what the two
 * views this replaced used. The service is untyped, so these are the fields
 * the admin surfaces actually read -- not a claim about the whole document.
 */
export interface GroupMember {
  /**
   * The document id, which **is** the Firebase uid.
   *
   * Group profiles live at `groups/{groupId}/users/{userId}`, so the id of the
   * document is the uid of the person. `GroupService.getGroupUsers` maps it to
   * `id`; use {@link memberId} rather than reaching for either field directly.
   */
  id?: string;
  /**
   * A `userId` field on the document itself, which in practice is absent.
   *
   * Kept because nothing guarantees it always will be, and honoured first by
   * {@link memberId} where it exists.
   */
  userId?: string;
  username?: string;
  role?: string;
  joinedAt?: Date | string | number;
}

/**
 * The uid for a member, from whichever field carries it.
 *
 * Exists because getting this wrong is silent and expensive. The view this
 * replaced read `userData.userId`, which no group-user document actually
 * carries -- so it was `undefined` for everyone, nobody ever matched the
 * signed-in user, and the consequences were that the Remove button appeared on
 * your own row and that pressing it called `deleteUser(undefined)`.
 */
export function memberId(member: GroupMember): string | undefined {
  return member.userId ?? member.id;
}

/**
 * A registration token for the active group.
 *
 * Only unaccepted ones are ever rendered: a used token *is* the member row
 * above it, and no action on it is available -- you cannot un-use one.
 */
export interface RegistrationToken {
  token: string;
  notes?: string;
  used?: boolean;
  createdAt?: Date | string | number;
  usedAt?: Date | string | number;
  usedBy?: string;
}
