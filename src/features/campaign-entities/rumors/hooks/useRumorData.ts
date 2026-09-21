// src/features/campaign-entities/rumors/hooks/useRumorData.ts
import { useState, useEffect, useCallback } from 'react';
import { Rumor } from '../types';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useGroups, useCampaigns } from 'features/user-management';
import { useCampaignContextStatus } from 'shared/hooks/useCampaignContextStatus';

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
  const { isResolving, hasRequiredContext, missingContext } = useCampaignContextStatus();

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

  /*
    Switching campaign must not leave the previous campaign's rumors on
    screen while the new ones load -- `loading` above stops counting once
    there is something to show, so the list is emptied the moment the
    context it belongs to changes.
  */
  useEffect(() => {
    setRumors([]);
  }, [activeGroupId, activeCampaignId]);

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
    /*
      `loading` means **"there is nothing to show yet"**, never "a fetch is in
      flight" -- see `useQuestData` for the measurement behind that. The
      in-flight flag only counts while there is nothing on screen, so the
      refresh every write ends with happens behind content someone is
      already reading instead of unmounting it.

      Folds in `isResolving` (bug #1413) unconditionally, since while auth
      and the campaign are still restoring, the list is empty for a
      reason no reader can distinguish from "none recorded".
    */
    loading: (Boolean(loading) && rumors.length === 0) || isResolving,
    error,
    refreshRumors: fetchRumors,
    hasRequiredContext,
    missingContext
  };
};

export default useRumorData;