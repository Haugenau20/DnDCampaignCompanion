// src/hooks/useQuestData.ts
import { useState, useEffect, useCallback } from 'react';
import { Quest } from '../types/quest';
import { useFirebaseData } from './useFirebaseData';
import { useAuth } from '../context/firebase';

/**
 * Hook for managing Quest data fetching and state
 * @returns Object containing Quests data, loading state, error state, and refresh function
 */
export const useQuestData = () => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const { getData, loading, error, data } = useFirebaseData<Quest>({ collection: 'quests' });
  const { user } = useAuth();

  /**
   * Fetch Quests from Firebase
   */
  const fetchQuests = useCallback(async () => {
    try {
      const data = await getData();
      setQuests(data || []);
    } catch (err) {
      console.error('Error fetching quests:', err);
    }
  }, [getData]);

  // Load quests on mount
  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  // Update quests when Firebase data changes
  useEffect(() => {
    if (data.length > 0) {
      setQuests(data);
    } else if (!user) {
      // Clear quests when signed out
      setQuests([]);
    }
  }, [data, user]);

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
    refreshQuests: fetchQuests
  };
};

export default useQuestData;