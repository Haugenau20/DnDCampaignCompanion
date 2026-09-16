// src/features/user-management/groups/hooks/useJoinGroupCompletion.ts
import { useCallback } from "react";
import { useGroups } from "./useGroups";

/**
 * One success behaviour for joining a group, from either entrance.
 *
 * Refreshing alone left the user in the group they were already in, staring
 * at a list they had just changed. joinGroupWithToken returns void and no id
 * reaches us, so the new group is the one that appears in the list; if none
 * does -- a re-join, or a race -- refresh and say nothing rather than guess.
 *
 * `JoinGroupDialog` calls `onSuccess()` fire-and-forget, so a rejection here
 * would otherwise be an unhandled promise rejection. The group refresh has
 * already succeeded by this point -- the user is not stranded, only left in
 * whichever group they were already in -- and the switcher is a one-click
 * way back to the group they just joined, so this logs rather than
 * inventing new error UI for a landing failure, the same way
 * `handleSignOut` reports its own failures.
 *
 * Moved verbatim, comments included, from `Header.handleJoinedGroup` so a
 * second entrance (the account card's "Join another") can share the exact
 * same landing behaviour rather than reinventing it.
 */
export function useJoinGroupCompletion(): () => Promise<void> {
  const { groups, refreshGroups, setActiveGroup } = useGroups();

  return useCallback(async () => {
    const before = new Set(groups.map((group) => group.id));
    const after = await refreshGroups();
    const joined = after?.find((group) => !before.has(group.id));
    if (joined) {
      try {
        await setActiveGroup(joined.id);
      } catch (err) {
        console.error('Error switching to the newly joined group:', err);
      }
    }
  }, [groups, refreshGroups, setActiveGroup]);
}
