// src/context/firebase/hooks/useAuth.ts
import { useState, useCallback } from 'react';
import { useFirebaseContext } from '../context/FirebaseContext';
import firebaseServices from 'core/services/firebase';
import type {
  PendingEmailSignIn,
  SignInMethod,
  SignInResult
} from 'core/services/firebase/auth/AuthService';

export function useAuth() {
  const { user, loading, error, setError, reloadUserContext } = useFirebaseContext();
  const [sessionExpired, setSessionExpired] = useState(false);

  /**
   * Email a passwordless sign-in link.
   * @param email Where to send it
   * @param continueUrl The absolute `/auth/link` URL the link opens
   * @param rememberMe Whether the session should outlive the browser
   */
  const sendSignInLink = useCallback(async (
    email: string,
    continueUrl: string,
    rememberMe: boolean = false
  ): Promise<void> => {
    try {
      setError(null);
      await firebaseServices.auth.sendSignInLink(email, continueUrl, rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the sign-in link');
      throw err;
    }
  }, [setError]);

  /**
   * Finish a sign-in from a magic link.
   * @param email The address the link was sent to
   * @param url The link as opened
   * @param rememberMe Whether the session should outlive the browser
   */
  const completeSignInLink = useCallback(async (
    email: string,
    url: string,
    rememberMe: boolean = false
  ): Promise<SignInResult> => {
    try {
      setError(null);
      const result = await firebaseServices.auth.completeSignInLink(email, url, rememberMe);
      setSessionExpired(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
      throw err;
    }
  }, [setError]);

  /**
   * Sign in with a Google account.
   * @param rememberMe Whether the session should outlive the browser
   * @param loginHint The Google address to pre-select
   */
  const signInWithGoogle = useCallback(async (
    rememberMe: boolean = false,
    loginHint?: string
  ): Promise<SignInResult> => {
    try {
      setError(null);
      const result = await firebaseServices.auth.signInWithGoogle(rememberMe, loginHint);
      setSessionExpired(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
      throw err;
    }
  }, [setError]);

  /** Attach Google to the signed-in account. */
  const linkGoogle = useCallback(async (): Promise<void> => {
    await firebaseServices.auth.linkGoogle();
  }, []);

  /** The ways the signed-in account can sign in. */
  const getSignInMethods = useCallback((): SignInMethod[] => {
    return firebaseServices.auth.getSignInMethods();
  }, []);

  /** The sign-in link this browser is waiting on, if any. */
  const getPendingEmailSignIn = useCallback((): PendingEmailSignIn | null => {
    return firebaseServices.auth.getPendingEmailSignIn();
  }, []);

  /** Whether `url` is a sign-in link. */
  const isSignInLink = useCallback((url: string): boolean => {
    return firebaseServices.auth.isSignInLink(url);
  }, []);

  /** Remove an account created moments ago whose invitation then failed. */
  const deleteFreshAccount = useCallback(async (): Promise<void> => {
    await firebaseServices.auth.deleteFreshAccount();
  }, []);

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
    sendSignInLink,
    completeSignInLink,
    signInWithGoogle,
    linkGoogle,
    getSignInMethods,
    getPendingEmailSignIn,
    isSignInLink,
    deleteFreshAccount,
    reloadUserContext,
    signOut,
    refreshSession,
    sessionExpired,
    checkSessionExpired,
    renewSession,
    isAuthenticated: !!user
  };
}
