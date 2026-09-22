// src/features/campaign-entities/quests/hooks/useQuestData.ts
import { useState, useEffect, useCallback } from 'react';
import { Quest } from '../types';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useGroups, useCampaigns } from 'features/user-management';
import { useCampaignContextStatus } from 'shared/hooks/useCampaignContextStatus';

/**
 * Hook for managing Quest data fetching and state with proper group/campaign context
 * @returns Object containing Quests data, loading state, error state, and refresh function
 */
export const useQuestData = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  // `autoFetch: false` because this hook drives its own fetching below, and
  // does it with context the generic hook lacks -- gated on group and campaign,
  // and cleared when either changes. The generic mount fetch fired regardless
  // and was simply a second read of the same collection.
  const { getData, loading, error, data } = useFirebaseData<Quest>({
    collection: 'quests',
    autoFetch: false
  });
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { isResolving, hasRequiredContext, missingContext } = useCampaignContextStatus();

  /**
   * Fetch Quests from Firebase with appropriate group/campaign context
   */
  const fetchQuests = useCallback(async () => {
    try {
      if (!activeGroupId) {
        setQuests([]);
        return [];
      }
      
      if (!activeCampaignId) {
        // If group is selected but no campaign, return empty array
        setQuests([]);
        return [];
      }
      
      const data = await getData();
      setQuests(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching quests:', err);
      setQuests([]);
      return [];
    }
  }, [getData, activeGroupId, activeCampaignId]);

  // Load quests on mount and when group/campaign changes
  useEffect(() => {
    fetchQuests();
  }, [fetchQuests, activeGroupId, activeCampaignId]);

  /*
    Switching campaign must not leave the previous campaign's quests on
    screen while the new ones load. `loading` above stops counting once there
    is something to show, so the list is emptied the moment the context it
    belongs to changes -- otherwise the window between the switch and the
    fetch resolving would show one campaign's records under another
    campaign's name.
  */
  useEffect(() => {
    setQuests([]);
  }, [activeGroupId, activeCampaignId]);

  // Update quests when Firebase data changes.
  //
  // Signed out, or no group/campaign selected, is checked FIRST and returns:
  // `data` may still hold the previous user's or previous campaign's records,
  // since the generic hook no longer clears it on sign-out (autoFetch: false
  // above also drops its AUTH_STATE_CHANGED_EVENT listener), and stale
  // records must never outrank "you are signed out".
  useEffect(() => {
    if (!user || !activeGroupId || !activeCampaignId) {
      setQuests([]);
      return;
    }

    if (data.length > 0) {
      setQuests(data);
    }
  }, [data, user, activeGroupId, activeCampaignId]);

  /**
   * Get a quest by ID
   */
  const getQuestById = useCallback((id: string) => {
    return quests.find(quest => quest.id === id);
  }, [quests]);

  return {
    quests,
    /*
      `loading` means **"there is nothing to show yet"**, never "a fetch is in
      flight". `useFirebaseData` cannot tell the two apart -- it raises the
      same flag for the first read and for the refresh that every write in
      this app ends with -- and a consumer that passes this straight to a
      gate therefore swaps its content for a skeleton on every save.
      Measured in Chrome on `/quests`: ticking an objective in an open row
      unmounted the directory and closed the row under the cursor, while the
      write itself succeeded.

      So the in-flight flag only counts while there is nothing on screen. A
      refetch behind content someone is already reading is invisible, which
      is what it should always have been.

      Folds in `isResolving` (bug #1413) -- see `useCampaignContextStatus`
      for why this can't just be `useGroups().loading`. That half is
      unconditional: while auth and the campaign are still restoring, the list
      is empty for a reason the reader has no way to distinguish from "none
      recorded".
    */
    loading: (Boolean(loading) && quests.length === 0) || isResolving,
    error,
    getQuestById,
    refreshQuests: fetchQuests,
    hasRequiredContext,
    missingContext
  };
};

export default useQuestData;