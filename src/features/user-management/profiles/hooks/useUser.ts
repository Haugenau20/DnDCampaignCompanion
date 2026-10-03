// src/context/firebase/hooks/useUser.ts
import { useCallback } from 'react';
import { useFirebaseContext } from 'features/user-management/auth/context/FirebaseContext';
import firebaseServices from 'core/services/firebase';
import { UserProfile, GroupUserProfile, UsernameValidationResult } from 'core/types/user';

export function useUser() {
  const { 
    user, 
    userProfile, 
    activeGroupId, 
    activeGroupUserProfile, 
    setError,
    refreshUserProfile,
    applyUserProfileChanges,
    applyGroupUserProfileChanges
  } = useFirebaseContext();

  // Update user profile (global or group-specific)
  const updateUserProfile = useCallback(async (
    uid: string, 
    updates: Partial<UserProfile>
  ): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.user.updateUserProfile(uid, updates);

      // Reflect it locally if it is the current user's. What was written is
      // what is stored, so it is applied rather than read back (PERF-13) --
      // unless it moves the active group, which the full refresh switches to.
      if (user && user.uid === uid) {
        if ('activeGroupId' in updates) {
          await refreshUserProfile();
        } else {
          applyUserProfileChanges(updates);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user profile');
      throw err;
    }
  }, [user, setError, refreshUserProfile, applyUserProfileChanges]);

  // Update group user profile
  const updateGroupUserProfile = useCallback(async (
    uid: string, 
    updates: Partial<GroupUserProfile>
  ): Promise<void> => {
    try {
      setError(null);
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      await firebaseServices.user.updateGroupUserProfile(activeGroupId, uid, updates);

      // Applied rather than read back (PERF-13), unless it moves the active
      // campaign, which the full refresh switches to.
      if (user && user.uid === uid) {
        if ('activeCampaignId' in updates) {
          await refreshUserProfile();
        } else {
          applyGroupUserProfileChanges(updates);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group user profile');
      throw err;
    }
  }, [user, activeGroupId, setError, refreshUserProfile, applyGroupUserProfileChanges]);

  // Validate username
  const validateUsername = useCallback(async (
    username: string
  ): Promise<UsernameValidationResult> => {
    try {
      setError(null);
      
      // Get groupId from URL or use activeGroupId
      const urlParams = new URLSearchParams(window.location.search);
      const groupIdFromUrl = urlParams.get('groupId');
      const groupId = groupIdFromUrl || activeGroupId;
      
      if (!groupId) {
        throw new Error('No group ID available');
      }
      
      return await firebaseServices.user.validateGroupUsername(groupId, username);
    } catch (err) {
      console.error('Username validation error:', err);
      return {
        isValid: false,
        error: 'Error checking username'
      };
    }
  }, [activeGroupId, setError]);

  // Change username
  const changeUsername = useCallback(async (
    uid: string, 
    newUsername: string
  ): Promise<void> => {
    try {
      setError(null);
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      await firebaseServices.user.changeGroupUsername(activeGroupId, uid, newUsername);

      // The profile's only change is the name; applied, not read back (PERF-13).
      if (user && user.uid === uid) {
        applyGroupUserProfileChanges({ username: newUsername });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred changing username');
      throw err;
    }
  }, [activeGroupId, user, setError, applyGroupUserProfileChanges]);

  // Check if username is available
  const isUsernameAvailable = useCallback(async (
    username: string
  ): Promise<boolean> => {
    try {
      setError(null);
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      return await firebaseServices.user.isUsernameAvailableInGroup(activeGroupId, username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred checking username availability');
      throw err;
    }
  }, [activeGroupId, setError]);

  // Check if user is admin
  const isUserAdmin = useCallback(async (
    uid: string
  ): Promise<boolean> => {
    try {
      if (!activeGroupId) return false;
      return await firebaseServices.user.isUserAdmin(activeGroupId, uid);
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  }, [activeGroupId]);

  // Validate username in a specific group
  const validateGroupUsername = useCallback(async (
    groupId: string, 
    username: string
  ): Promise<UsernameValidationResult> => {
    try {
      setError(null);
      return await firebaseServices.user.validateGroupUsername(groupId, username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred validating username');
      throw err;
    }
  }, [setError]);

  return {
    userProfile,
    activeGroupUserProfile,
    updateUserProfile,
    updateGroupUserProfile,
    validateUsername,
    changeUsername,
    isUsernameAvailable,
    isUserAdmin,
    validateGroupUsername
  };
}