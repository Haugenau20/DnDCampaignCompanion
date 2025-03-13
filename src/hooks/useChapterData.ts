// src/hooks/useChapterData.ts
import { useState, useEffect, useCallback } from 'react';
import { Chapter } from '../types/story';
import { useFirebaseData } from './useFirebaseData';
import { useAuth, useGroups, useCampaigns } from '../context/firebase';

/**
 * Hook for managing chapter data fetching and state with proper group/campaign context
 * @returns Object containing chapters data, loading state, error state, and refresh function
 */
export const useChapterData = () => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const { getData, loading, error, data } = useFirebaseData<Chapter>({ collection: 'chapters' });
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();

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

  // Update chapters when Firebase data changes
  useEffect(() => {
    if (data.length > 0) {
      // Sort chapters by order number
      const sortedChapters = [...data].sort((a, b) => a.order - b.order);
      setChapters(sortedChapters);
    } else if (!user || !activeGroupId || !activeCampaignId) {
      // Clear chapters when signed out or no group/campaign selected
      setChapters([]);
    }
  }, [data, user, activeGroupId, activeCampaignId]);

  return {
    chapters,
    loading,
    error,
    refreshChapters: fetchChapters,
    hasRequiredContext: !!activeGroupId && !!activeCampaignId
  };
};

export default useChapterData;