// src/hooks/useQuestData.ts
import { useState, useEffect, useCallback } from 'react';
import { Quest } from '../types/quest';
import { useFirebaseData } from './useFirebaseData';
import { useAuth, useGroups, useCampaigns } from '../context/firebase';

/**
 * Hook for managing Quest data fetching and state with proper group/campaign context
 * @returns Object containing Quests data, loading state, error state, and refresh function
 */
export const useQuestData = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const { getData, loading, error, data } = useFirebaseData<Quest>({ collection: 'quests' });
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();

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

  // Update quests when Firebase data changes
  useEffect(() => {
    if (data.length > 0) {
      setQuests(data);
    } else if (!user || !activeGroupId || !activeCampaignId) {
      // Clear quests when signed out or no group/campaign selected
      setQuests([]);
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
    loading,
    error,
    getQuestById,
    refreshQuests: fetchQuests,
    hasRequiredContext: !!activeGroupId && !!activeCampaignId
  };
};

export default useQuestData;