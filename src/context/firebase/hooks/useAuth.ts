// src/context/firebase/hooks/useAuth.ts
import { useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { useFirebaseContext } from '../FirebaseContext';
import firebaseServices from '../../../services/firebase';

export function useAuth() {
  const { user, loading, error, setError, refreshUserProfile } = useFirebaseContext();
  const [sessionExpired, setSessionExpired] = useState(false);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean = false): Promise<User> => {
    try {
      setError(null);
      const user = await firebaseServices.auth.signIn(email, password, rememberMe);
      setSessionExpired(false);
      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
      throw err;
    }
  }, [setError]);

  // Sign out
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.auth.signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign out');
      throw err;
    }
  }, [setError]);

  // Refresh session activity
  const refreshSession = useCallback(() => {
    if (user) {
      firebaseServices.auth.updateLastActivity();
    }
  }, [user]);

  const renewSession = useCallback(async (rememberMe: boolean = false): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.auth.renewSession(rememberMe);
      setSessionExpired(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to renew session');
      throw err;
    }
  }, [setError]);

  // Check session expiration
  const checkSessionExpired = useCallback((): boolean => {
    return firebaseServices.auth.checkSessionExpired();
  }, []);

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    refreshSession,
    sessionExpired,
    checkSessionExpired,
    renewSession,
    isAuthenticated: !!user
  };
}