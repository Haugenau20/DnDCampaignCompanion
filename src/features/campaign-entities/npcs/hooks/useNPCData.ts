// src/features/campaign-entities/npcs/hooks/useNPCData.ts
import { useState, useEffect, useCallback } from 'react';
import { NPC } from '../types';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { campaignCollectionPath } from 'core/services/firebase/data/campaignCollectionPath';
import { useAuth, useGroups, useCampaigns } from 'features/user-management';
import { useCampaignContextStatus } from 'shared/hooks/useCampaignContextStatus';

/**
 * Hook for managing NPC data fetching and state with proper group/campaign context
 * @returns Object containing NPCs data, loading state, error state, and refresh function
 */
export const useNPCData = () => {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  // A listener on the active campaign's collection (T032), or none while
  // signed out or unscoped. The list follows every change, a player's own
  // writes included, so the refresh each write ends with reads nothing.
  const { getData, loading, error, data } = useFirebaseData<NPC>({
    collection: 'npcs',
    subscribeTo: campaignCollectionPath(Boolean(user), activeGroupId, activeCampaignId, 'npcs')
  });
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

  /*
    Switching campaign must not leave the previous campaign's npcs on
    screen while the new ones load -- `loading` above stops counting once
    there is something to show, so the list is emptied the moment the
    context it belongs to changes.
  */
  useEffect(() => {
    setNpcs([]);
  }, [activeGroupId, activeCampaignId]);

  // Update NPCs when Firebase data changes.
  //
  // Signed out, or no group/campaign selected, is checked FIRST and returns:
  // `data` may still hold the previous user's or previous campaign's records,
  // until the listener above has closed and emptied it a render later, and stale
  // records must never outrank "you are signed out".
  useEffect(() => {
    if (!user || !activeGroupId || !activeCampaignId) {
      setNpcs([]);
      return;
    }

    if (data.length > 0) {
      // Sort NPCs alphabetically by name
      const sortedNPCs = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setNpcs(sortedNPCs);
    }
  }, [data, user, activeGroupId, activeCampaignId]);

  return {
    npcs,
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
    loading: (Boolean(loading) && npcs.length === 0) || isResolving,
    error,
    refreshNPCs: fetchNPCs,
    hasRequiredContext,
    missingContext
  };
};

export default useNPCData;