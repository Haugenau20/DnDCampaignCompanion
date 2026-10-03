// src/shared/hooks/useCampaignCollection.ts
import { useCallback, useMemo } from 'react';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { campaignCollectionPath } from 'core/services/firebase/data/campaignCollectionPath';
import { useAuth, useGroups, useCampaigns } from 'features/user-management';
import { useCampaignContextStatus } from 'shared/hooks/useCampaignContextStatus';

/**
 * The active campaign's copy of one collection, kept current by a Firestore
 * listener (T032). The shared body of the five entity read hooks
 * (`useNPCData`, `useQuestData`, `useRumorData`, `useLocationData`,
 * `useChapterData`).
 *
 * The list is derived from the latest snapshot on every render, never copied
 * into state of its own: a player's own write, another player's edit and a
 * delete that empties the collection all reach the page the same way, with no
 * read. Signed out or unscoped, the list is empty and no listener is open.
 *
 * @param collection The collection inside the campaign, e.g. `npcs`
 * @param arrange Turns a snapshot into the list consumers see (sorting,
 *   repairing legacy fields). Must not mutate its input, and should be a
 *   module-level function so the list keeps its identity between snapshots.
 */
export function useCampaignCollection<T extends Record<string, any>>(
  collection: string,
  arrange: (documents: T[]) => T[]
) {
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const path = campaignCollectionPath(Boolean(user), activeGroupId, activeCampaignId, collection);
  const { data, loading, error, retry } = useFirebaseData<T>({ collection, subscribeTo: path });
  const { isResolving, hasRequiredContext, missingContext } = useCampaignContextStatus();

  // `path` is checked first: signed out or unscoped must never render records,
  // whatever the listener last held.
  const items = useMemo(() => (path === null ? [] : arrange(data)), [path, data, arrange]);

  /**
   * Retry after a failure: reopens the listener if Firestore closed it after an
   * error. A healthy listener already holds every change, so this reads
   * nothing and resolves with the current list.
   */
  const refresh = useCallback(async (): Promise<T[]> => {
    if (path === null) {
      return [];
    }
    return arrange(await retry());
  }, [path, retry, arrange]);

  return {
    items,
    /*
      `loading` means **"there is nothing to show yet"**, never "a read is in
      flight". Measured in Chrome on `/quests` (before listeners): a gate fed
      the raw flag swapped the directory for its skeleton on every save and
      closed the row under the cursor. So the flag only counts while there is
      nothing on screen.

      Folds in `isResolving` (bug #1413) -- see `useCampaignContextStatus` for
      why this can't just be `useGroups().loading`. That half is
      unconditional: while auth and the campaign are still restoring, the list
      is empty for a reason the reader has no way to distinguish from "none
      recorded".
    */
    loading: (Boolean(loading) && items.length === 0) || isResolving,
    error,
    refresh,
    hasRequiredContext,
    missingContext
  };
}
