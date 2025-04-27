// src/context/firebase/hooks/useUsernameLookup.ts
import { useState, useEffect, useCallback } from 'react';
import { useGroups } from './useGroups';
import firebaseServices from '../../../services/firebase';

/**
 * Cache for storing username lookups to minimize Firebase calls
 * This object persists across component re-renders
 */
const usernameCache: Record<string, Record<string, string>> = {};

/**
 * Custom hook for looking up usernames from UIDs
 * @returns Methods and state for username lookup
 */
export const useUsernameLookup = () => {
  const { activeGroupId } = useGroups();
  const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  /**
   * Lookup usernames for a set of UIDs
   * @param uids Array of user IDs to look up
   */
  const lookupUsernames = useCallback(async (uids: string[]) => {
    if (!activeGroupId || uids.length === 0) return;
    
    // Initialize cache for this group if needed
    if (!usernameCache[activeGroupId]) {
      usernameCache[activeGroupId] = {};
    }
    
    // Filter to only uncached UIDs
    const uncachedUids = uids.filter(uid => !usernameCache[activeGroupId][uid]);
    
    if (uncachedUids.length === 0) {
      // All UIDs are cached, use the cache
      setUsernameMap({ ...usernameCache[activeGroupId] });
      return;
    }
    
    // Need to fetch some usernames
    setLoading(true);
    
    try {
      const newUsernames: Record<string, string> = {};
      
      await Promise.all(
        uncachedUids.map(async (uid) => {
          try {
            const userProfile = await firebaseServices.user.getGroupUserProfile(activeGroupId, uid);
            if (userProfile?.username) {
              newUsernames[uid] = userProfile.username;
              // Update the cache
              usernameCache[activeGroupId][uid] = userProfile.username;
            }
          } catch (error) {
            console.error(`Error loading username for ${uid}:`, error);
          }
        })
      );
      
      // Combine new usernames with cached ones for this group
      setUsernameMap({ 
        ...usernameCache[activeGroupId], 
        ...newUsernames 
      });
    } catch (error) {
      console.error('Error fetching usernames:', error);
    } finally {
      setLoading(false);
    }
  }, [activeGroupId]);

  return {
    usernameMap,
    lookupUsernames,
    loading,
    
    /**
     * Get a username for a specific UID (returns from cache or empty string)
     */
    getUsernameForUid: useCallback((uid: string): string => {
      if (!activeGroupId || !uid) return '';
      return usernameCache[activeGroupId]?.[uid] || '';
    }, [activeGroupId])
  };
};