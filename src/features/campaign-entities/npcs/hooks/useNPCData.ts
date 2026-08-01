// src/features/campaign-entities/npcs/hooks/useNPCData.ts
import { useState, useEffect, useCallback } from 'react';
import { NPC } from '../types';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useGroups, useCampaigns } from 'features/user-management';
import { useCampaignContextStatus } from 'shared/hooks/useCampaignContextStatus';

/**
 * Hook for managing NPC data fetching and state with proper group/campaign context
 * @returns Object containing NPCs data, loading state, error state, and refresh function
 */
export const useNPCData = () => {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const { getData, loading, error, data } = useFirebaseData<NPC>({ collection: 'npcs' });
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { isResolving, hasRequiredContext, missingContext } = useCampaignContextStatus();

  /**
   * Fetch NPCs from Firebase with appropriate group/campaign context
   */
  const fetchNPCs = useCallback(async () => {
    try {
      if (!activeGroupId) {
        setNpcs([]);
        return [];
      }
      
      if (!activeCampaignId) {
        // If group is selected but no campaign, return empty array or show guidance
        setNpcs([]);
        return [];
      }
      
      const data = await getData();
      // Sort NPCs alphabetically by name
      const sortedNPCs = data.sort((a, b) => a.name.localeCompare(b.name));
      setNpcs(sortedNPCs);
      return sortedNPCs;
    } catch (err) {
      console.error('Error fetching NPCs:', err);
      setNpcs([]);
      return [];
    }
  }, [getData, activeGroupId, activeCampaignId]);

  // Load NPCs on mount and when group/campaign changes
  useEffect(() => {
    fetchNPCs();
  }, [fetchNPCs, activeGroupId, activeCampaignId]);

  // Update NPCs when Firebase data changes
  useEffect(() => {
    if (data.length > 0) {
      // Sort NPCs alphabetically by name
      const sortedNPCs = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setNpcs(sortedNPCs);
    } else if (!user || !activeGroupId || !activeCampaignId) {
      // Clear NPCs when signed out or no group/campaign selected
      setNpcs([]);
    }
  }, [data, user, activeGroupId, activeCampaignId]);

  return {
    npcs,
    // Folds in `isResolving` (bug #1413): while auth/group/campaign restoration
    // is still in flight, `activeGroupId`/`activeCampaignId` being null does not
    // mean "nothing selected", so callers must keep showing their loading state
    // rather than fall through to a "no context" error. See
    // `useCampaignContextStatus`'s doc comment for why this can't just be
    // `useGroups().loading`.
    loading: Boolean(loading) || isResolving,
    error,
    refreshNPCs: fetchNPCs,
    hasRequiredContext,
    missingContext
  };
};

export default useNPCData;