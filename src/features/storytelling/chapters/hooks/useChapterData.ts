// src/features/storytelling/chapters/hooks/useChapterData.ts
import { useState, useEffect, useCallback } from 'react';
import { Chapter } from '../types';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useGroups, useCampaigns } from 'features/user-management';
import { useCampaignContextStatus } from 'shared/hooks/useCampaignContextStatus';

/**
 * Hook for managing chapter data fetching and state with proper group/campaign context
 * @returns Object containing chapters data, loading state, error state, and refresh function
 */
export const useChapterData = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  // `autoFetch: false` because this hook drives its own fetching below, and
  // does it with context the generic hook lacks -- gated on group and campaign,
  // sorted by order, and cleared when either changes. The generic mount fetch
  // fired regardless and was simply a second read of the same collection.
  const { getData, loading, error, data } = useFirebaseData<Chapter>({
    collection: 'chapters',
    autoFetch: false
  });
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { isResolving, hasRequiredContext } = useCampaignContextStatus();

  /**
   * Fetch chapters from Firebase with appropriate group/campaign context
   */
  const fetchChapters = useCallback(async () => {
    try {
      if (!activeGroupId) {
        setChapters([]);
        return [];
      }
      
      if (!activeCampaignId) {
        // If group is selected but no campaign, return empty array
        setChapters([]);
        return [];
      }
      
      const data = await getData();
      // Sort chapters by order number
      const sortedChapters = data.sort((a, b) => a.order - b.order);
      setChapters(sortedChapters);
      return sortedChapters;
    } catch (err) {
      console.error('Error fetching chapters:', err);
      setChapters([]);
      return [];
    }
  }, [getData, activeGroupId, activeCampaignId]);

  // Load chapters on mount and when group/campaign changes
  useEffect(() => {
    fetchChapters();
  }, [fetchChapters, activeGroupId, activeCampaignId]);

  /*
    Switching campaign must not leave the previous campaign's chapters on
    screen while the new ones load. `loading` below stops counting once there
    is something to show, so the list is emptied the moment the context it
    belongs to changes -- otherwise the window between the switch and the
    fetch resolving would show one campaign's story under another campaign's
    name.
  */
  useEffect(() => {
    setChapters([]);
  }, [activeGroupId, activeCampaignId]);

  // Update chapters when Firebase data changes.
  //
  // Signed out, or no group/campaign selected, is checked FIRST and returns:
  // `data` may still hold the previous user's or previous campaign's records,
  // since the generic hook no longer clears it on sign-out (autoFetch: false
  // above also drops its AUTH_STATE_CHANGED_EVENT listener), and stale
  // records must never outrank "you are signed out".
  useEffect(() => {
    if (!user || !activeGroupId || !activeCampaignId) {
      setChapters([]);
      return;
    }

    if (data.length > 0) {
      // Sort chapters by order number
      const sortedChapters = [...data].sort((a, b) => a.order - b.order);
      setChapters(sortedChapters);
    }
  }, [data, user, activeGroupId, activeCampaignId]);

  return {
    chapters,
    // `loading` means "there is nothing to show yet", never "a fetch is in
    // flight" (T044) -- every chapter write ends in `refreshChapters()`, and a
    // gate fed the raw flag swaps the page for its skeleton on every save.
    // `useQuestData` carries the full reasoning. The `isResolving` half
    // (bug #1413) stays unconditional -- see useNPCData's identical fold in
    // campaign-entities for why this can't just be `useGroups().loading`.
    loading: (Boolean(loading) && chapters.length === 0) || isResolving,
    error,
    refreshChapters: fetchChapters,
    hasRequiredContext
  };
};

export default useChapterData;