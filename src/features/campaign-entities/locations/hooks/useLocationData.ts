// src/features/campaign-entities/locations/hooks/useLocationData.ts
import { useState, useEffect, useCallback } from 'react';
import { Location } from '../types';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useGroups, useCampaigns } from 'features/user-management';
import { useCampaignContextStatus } from 'shared/hooks/useCampaignContextStatus';

/**
 * Hook for managing location data fetching and state with proper group/campaign context
 * @returns Object containing locations data, loading state, error state, and refresh function
 */
export const useLocationData = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const { getData, loading, error, data } = useFirebaseData<Location>({ collection: 'locations' });
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { isResolving, hasRequiredContext, missingContext } = useCampaignContextStatus();

  /**
   * Fetch locations from Firebase with appropriate group/campaign context
   */
  const fetchLocations = useCallback(async () => {
    try {
      if (!activeGroupId) {
        setLocations([]);
        return [];
      }
      
      if (!activeCampaignId) {
        // If group is selected but no campaign, return empty array or show guidance
        setLocations([]);
        return [];
      }
      
      const data = await getData();
      setLocations(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching locations:', err);
      setLocations([]);
      return [];
    }
  }, [getData, activeGroupId, activeCampaignId]);

  // Load locations on mount and when group/campaign changes
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations, activeGroupId, activeCampaignId]);

  /*
    Switching campaign must not leave the previous campaign's locations on
    screen while the new ones load -- `loading` above stops counting once
    there is something to show, so the list is emptied the moment the
    context it belongs to changes.
  */
  useEffect(() => {
    setLocations([]);
  }, [activeGroupId, activeCampaignId]);

  // Update locations when Firebase data changes
  useEffect(() => {
    if (data.length > 0) {
      setLocations(data);
    } else if (!user || !activeGroupId || !activeCampaignId) {
      // Clear locations when signed out or no group/campaign selected
      setLocations([]);
    }
  }, [data, user, activeGroupId, activeCampaignId]);

  return {
    locations,
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
    loading: (Boolean(loading) && locations.length === 0) || isResolving,
    error,
    refreshLocations: fetchLocations,
    hasRequiredContext,
    missingContext
  };
};

export default useLocationData;