// src/hooks/useLocationData.ts
import { useState, useEffect, useCallback } from 'react';
import { Location } from '../types/location';
import { useFirebaseData } from './useFirebaseData';
import { useAuth, useGroups, useCampaigns } from '../context/firebase';

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
    loading,
    error,
    refreshLocations: fetchLocations,
    hasRequiredContext: !!activeGroupId && !!activeCampaignId
  };
};

export default useLocationData;