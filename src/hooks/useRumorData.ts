// src/hooks/useRumorData.ts
import { useState, useEffect, useCallback } from 'react';
import { Rumor } from '../types/rumor';
import { useFirebaseData } from './useFirebaseData';
import { useAuth, useGroups, useCampaigns } from '../context/firebase';

/**
 * Hook for managing rumor data fetching and state with proper group/campaign context
 * @returns Object containing rumors data, loading state, error state, and refresh function
 */
export const useRumorData = () => {
  const [rumors, setRumors] = useState<Rumor[]>([]);
  const { getData, loading, error, data } = useFirebaseData<Rumor>({ collection: 'rumors' });
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();

  /**
   * Fetch rumors from Firebase with appropriate group/campaign context
   */
  const fetchRumors = useCallback(async () => {
    try {
      if (!activeGroupId) {
        setRumors([]);
        return [];
      }
      
      if (!activeCampaignId) {
        // If group is selected but no campaign, return empty array
        setRumors([]);
        return [];
      }
      
      const data = await getData();
      setRumors(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching rumors:', err);
      setRumors([]);
      return [];
    }
  }, [getData, activeGroupId, activeCampaignId]);

  // Load rumors on mount and when group/campaign changes
  useEffect(() => {
    fetchRumors();
  }, [fetchRumors, activeGroupId, activeCampaignId]);

  // Update rumors when Firebase data changes
  useEffect(() => {
    if (data.length > 0) {
      setRumors(data);
    } else if (!user || !activeGroupId || !activeCampaignId) {
      // Clear rumors when signed out or no group/campaign selected
      setRumors([]);
    }
  }, [data, user, activeGroupId, activeCampaignId]);

  return {
    rumors,
    loading,
    error,
    refreshRumors: fetchRumors,
    hasRequiredContext: !!activeGroupId && !!activeCampaignId
  };
};

export default useRumorData;