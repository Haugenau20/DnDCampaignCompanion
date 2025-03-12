// src/hooks/useLocationData.ts
import { useState, useEffect, useCallback } from 'react';
import { Location } from '../types/location';
import { useFirebaseData } from './useFirebaseData';
import { useAuth } from '../context/firebase';

/**
 * Hook for managing location data fetching and state
 * @returns Object containing locations data, loading state, error state, and refresh function
 */
export const useLocationData = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const { getData, loading, error, data } = useFirebaseData<Location>({ collection: 'locations' });
  const { user } = useAuth();

  /**
   * Fetch locations from Firebase
   */
  const fetchLocations = useCallback(async () => {
    try {
      const data = await getData();
      setLocations(data || []);
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  }, [getData]);

  // Load locations on mount
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Update locations when Firebase data changes
  useEffect(() => {
    if (data.length > 0) {
      setLocations(data);
    } else if (!user) {
      // Clear locations when signed out
      setLocations([]);
    }
  }, [data, user]);

  return {
    locations,
    loading,
    error,
    refreshLocations: fetchLocations
  };
};

export default useLocationData;