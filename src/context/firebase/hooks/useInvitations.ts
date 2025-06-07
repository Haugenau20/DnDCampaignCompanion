// src/context/firebase/hooks/useInvitations.ts
import { useCallback } from 'react';
import { useFirebaseContext } from '../FirebaseContext';
import firebaseServices from '../../../services/firebase';

export function useInvitations() {
  const { 
    activeGroupId, 
    activeGroupUserProfile,
    setError, 
    refreshGroups 
  } = useFirebaseContext();

  // Generate registration token
  const generateRegistrationToken = useCallback(async (
    notes: string = ''
  ): Promise<string> => {
    try {
      setError(null);
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      // Check if current user is admin
      if (!activeGroupUserProfile || activeGroupUserProfile.role !== 'admin') {
        throw new Error('Only admins can generate registration tokens');
      }
      
      return await firebaseServices.invitation.generateGroupRegistrationToken(activeGroupId, notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate registration token');
      throw err;
    }
  }, [activeGroupId, activeGroupUserProfile, setError]);

  // Validate token
  const validateToken = useCallback(async (
    token: string
  ): Promise<boolean> => {
    try {
      setError(null);
      const result = await firebaseServices.invitation.validateRegistrationToken(token);
      return result.isValid;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred validating the invitation');
      return false;
    }
  }, [setError]);

  // Sign up with token
  const signUpWithToken = useCallback(async (
    token: string, 
    email: string, 
    password: string, 
    username: string
  ): Promise<void> => {
    try {
      setError(null);
      
      // Create the user and join the group
      await firebaseServices.invitation.signUpWithToken(token, email, password, username);
      
      // Refresh groups
      await refreshGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up');
      throw err;
    }
  }, [setError, refreshGroups]);

  // Join group with token
  const joinGroupWithToken = useCallback(async (
    token: string, 
    username: string
  ): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.invitation.joinGroupWithToken(token, username);
      
      // Refresh groups
      await refreshGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
      throw err;
    }
  }, [setError, refreshGroups]);

  // Get registration tokens
  const getRegistrationTokens = useCallback(async () => {
    try {
      setError(null);
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      return await firebaseServices.invitation.getGroupRegistrationTokens(activeGroupId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get registration tokens');
      throw err;
    }
  }, [activeGroupId, setError]);

  // Delete registration token
  const deleteRegistrationToken = useCallback(async (
    token: string
  ): Promise<void> => {
    try {
      setError(null);
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      await firebaseServices.invitation.deleteGroupRegistrationToken(activeGroupId, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete registration token');
      throw err;
    }
  }, [activeGroupId, setError]);

  return {
    generateRegistrationToken,
    validateToken,
    signUpWithToken,
    joinGroupWithToken,
    getRegistrationTokens,
    deleteRegistrationToken
  };
}