// src/context/firebase/hooks/useGroups.ts
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useFirebaseContext } from '../FirebaseContext';
import firebaseServices from '../../../services/firebase';

export function useGroups() {
  const { 
    user,
    groups, 
    activeGroupId, 
    activeGroupUserProfile,
    setError, 
    refreshGroups,
    loading: firebaseLoading
  } = useFirebaseContext();

  // Track a more accurate loading state
  const [fullyLoaded, setFullyLoaded] = useState(false);


  // Derive activeGroup directly from groups and activeGroupId
  const activeGroup = useMemo(() => {
    if (!groups.length || !activeGroupId) {
      console.log(`useGroups: No active group found. Groups: ${groups.length}, ActiveGroupId: ${activeGroupId}`);
      return null;
    }
    
    const found = groups.find(g => g.id === activeGroupId);
    console.log(`useGroups: Active group ${found ? 'found' : 'not found'} for ID ${activeGroupId}`);
    return found || null;
  }, [groups, activeGroupId]);

  // Memoized isAdmin status
  const isAdmin = useMemo(() => {
    if (!activeGroupUserProfile) return false;
    console.log("useGroups: activeGroupUserProfile.role =", activeGroupUserProfile.role);
    // Check if the role is admin (case-insensitive to avoid potential issues)
    return activeGroupUserProfile.role?.toLowerCase() === 'admin';
  }, [activeGroupUserProfile]);

  // When we have all the data we need, mark as fully loaded
  useEffect(() => {
    // Consider fully loaded when we have a user and either:
    // 1. We have groups loaded (even if empty array)
    // 2. We have an active group profile
    if (user && (groups.length > 0 || activeGroupUserProfile)) {
      console.log("useGroups: Setting fully loaded to true");
      setFullyLoaded(true);
    }
  }, [user, groups, activeGroupUserProfile]);

  // Create a new group
  const createGroup = useCallback(async (
    name: string, 
    description?: string
  ): Promise<string> => {
    try {
      setError(null);
      const groupId = await firebaseServices.group.createGroup(name, description);
      await refreshGroups();
      return groupId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
      throw err;
    }
  }, [setError, refreshGroups]);

  // Switch active group (alias for setActiveGroup for backward compatibility)
  const switchGroup = useCallback(async (
    groupId: string
  ): Promise<void> => {
    try {
      setError(null);
      // This will update both the service and context
      await firebaseServices.user.updateUserProfile(firebaseServices.auth.getCurrentUserId() || '', {
        activeGroupId: groupId
      });
      
      // Refresh all data
      await refreshGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch group');
      throw err;
    }
  }, [setError, refreshGroups]);

  // Set active group (original name)
  const setActiveGroup = switchGroup;

  // Join group with token
  const joinGroupWithToken = useCallback(async (
    token: string,
    username: string
  ): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.invitation.joinGroupWithToken(token, username);
      await refreshGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group with token');
      throw err;
    }
  }, [setError, refreshGroups]);

  // Get all users in the active group
  const getAllUsers = useCallback(async () => {
    try {
      setError(null);
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      // Use the memoized isAdmin value for this check
      if (!isAdmin) {
        throw new Error('Only admins can view user list');
      }
      
      return await firebaseServices.group.getGroupUsers(activeGroupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      throw err;
    }
  }, [activeGroupId, isAdmin, setError]);

  // Remove a user from the active group
  const removeUser = useCallback(async (
    userId: string
  ): Promise<void> => {
    try {
      setError(null);
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      await firebaseServices.group.removeUserFromGroup(activeGroupId, userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user');
      throw err;
    }
  }, [activeGroupId, setError]);

  // Delete a user from the active group
  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    try {
      setError(null);
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      await firebaseServices.group.removeUserFromGroup(activeGroupId, userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      throw err;
    }
  }, [activeGroupId, setError]);

  // Create an improved loading state that sets to false once we have all required data
  const loading = !fullyLoaded;

  return {
    user,
    groups,
    activeGroupId,
    activeGroup,
    activeGroupUserProfile,
    createGroup,
    setActiveGroup,
    switchGroup,          
    joinGroupWithToken,   
    refreshGroups,
    getAllUsers,
    removeUser,
    deleteUser,
    isAdmin,
    loading
  };
}