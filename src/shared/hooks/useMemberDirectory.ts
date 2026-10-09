// src/shared/hooks/useMemberDirectory.ts
import { useCallback, useSyncExternalStore } from 'react';
import firebaseServices from 'core/services/firebase';
import { useGroups } from 'features/user-management';
import type { DirectoryMember, MemberDirectory } from '../utils/author-name';

/** One group's directory: its members, whoever is reading, and the listener. */
interface GroupStore {
  members: MemberDirectory;
  readers: Set<() => void>;
  close: (() => void) | null;
}

const stores = new Map<string, GroupStore>();

/**
 * The store for a group, opening its listener with the first reader and
 * closing it with the last: every attribution line on a page shares one
 * listener, which a group of at most ten members makes one small read.
 */
function storeFor(groupId: string): GroupStore {
  let store = stores.get(groupId);
  if (!store) {
    store = { members: undefined, readers: new Set(), close: null };
    stores.set(groupId, store);
  }
  return store;
}

function subscribe(groupId: string | null, onChange: () => void): () => void {
  if (!groupId) return () => undefined;
  const store = storeFor(groupId);
  store.readers.add(onChange);
  if (!store.close) {
    try {
      store.close = openListener(groupId, store);
    } catch (error) {
      // As for a listener that fails: names fall back to the stored ones.
      console.error('Could not follow the group members for attribution:', error);
    }
  }
  return () => {
    store.readers.delete(onChange);
    if (store.readers.size === 0) {
      store.close?.();
      stores.delete(groupId);
    }
  };
}

/** The group's profile listener, feeding `store`. */
function openListener(groupId: string, store: GroupStore): () => void {
  return firebaseServices.group.subscribeToGroupProfiles(
    groupId,
    (profiles) => {
      store.members = new Map(
        profiles.map((profile): [string, DirectoryMember] => [
          profile.id,
          {
            username: typeof profile.username === 'string' ? profile.username : undefined,
            characters: Array.isArray(profile.characters) ? profile.characters : undefined,
          },
        ])
      );
      store.readers.forEach((reader) => reader());
    },
    (error) => {
      // Without the directory, names fall back to the ones stored with each
      // record; nothing on the page breaks.
      console.error('Could not follow the group members for attribution:', error);
      store.close = null;
    }
  );
}

/**
 * The active group's members, live, for crediting authors under the names
 * they have now (T132). Undefined while loading, and when there is no group.
 */
export function useMemberDirectory(): MemberDirectory {
  const { activeGroupId } = useGroups();
  const groupId = activeGroupId ?? null;
  // Stable per group: a new function on every render would make React
  // unsubscribe and resubscribe each time, closing the listener before its
  // first answer arrived.
  const subscribeToGroup = useCallback((onChange: () => void) => subscribe(groupId, onChange), [groupId]);
  const read = useCallback(() => (groupId ? stores.get(groupId)?.members : undefined), [groupId]);
  return useSyncExternalStore(subscribeToGroup, read);
}

export default useMemberDirectory;
