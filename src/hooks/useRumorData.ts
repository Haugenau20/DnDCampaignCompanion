// src/hooks/useRumorData.ts
import { useState, useEffect, useCallback } from 'react';
import { Rumor } from '../types/rumor';
import { useFirebaseData } from './useFirebaseData';
import { useFirebase } from '../context/FirebaseContext';

export const useRumorData = () => {
  const [rumors, setRumors] = useState<Rumor[]>([]);
  const { getData, loading, error, data } = useFirebaseData<Rumor>({ collection: 'rumors' });
  const { user } = useFirebase();

  /**
   * Fetch rumors from Firebase
   */
  const fetchRumors = useCallback(async () => {
    try {
      const data = await getData();
      setRumors(data || []);
    } catch (err) {
      console.error('Error fetching rumors:', err);
    }
  }, [getData]);

  // Load rumors on mount
  useEffect(() => {
    fetchRumors();
  }, [fetchRumors]);

  // Update rumors when Firebase data changes
  useEffect(() => {
    if (data.length > 0) {
      setRumors(data);
    } else if (!user) {
      // Clear rumors when signed out
      setRumors([]);
    }
  }, [data, user]);

  return {
    rumors,
    loading,
    error,
    refreshRumors: fetchRumors
  };
};

export default useRumorData;