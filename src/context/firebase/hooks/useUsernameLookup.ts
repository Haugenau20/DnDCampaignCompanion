// src/context/firebase/hooks/useUsernameLookup.ts

import { useState, useCallback } from 'react';
import { useFirebaseContext } from '../FirebaseContext';
import firebaseServices from '../../../services/firebase';
import { fetchAttributionUsernames } from '../../../utils/attribution-utils';

/**
 * Hook for looking up usernames and active character names for user IDs
 * Used primarily for attribution displays
 */
export function useUsernameLookup() {
  const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { activeGroupId, error, setError } = useFirebaseContext();

  /**
   * Look up usernames and character names for an array of user IDs
   * @param userIds Array of user IDs to look up
   * @returns Promise that resolves when lookups are complete
   */
  const lookupUsernames = useCallback(async (userIds: string[]): Promise<void> => {
    if (!activeGroupId || !userIds.length) return;
    
    setLoading(true);
    try {
      setError(null);
      
      // Use the centralized attribution username fetcher
      const results = await fetchAttributionUsernames(
        activeGroupId,
        userIds,
        firebaseServices
      );
      
      setUsernameMap(prevMap => ({
        ...prevMap,
        ...results
      }));
    } catch (err) {
      console.error('Error looking up usernames:', err);
      setError(err instanceof Error ? err.message : 'Error looking up usernames');
    } finally {
      setLoading(false);
    }
  }, [activeGroupId, setError]);

  return {
    usernameMap,
    lookupUsernames,
    loading,
    error
  };
}