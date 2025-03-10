// src/context/FirebaseContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged, browserLocalPersistence, browserSessionPersistence, setPersistence } from 'firebase/auth';
import FirebaseService from '../services/firebase/FirebaseService';
import { UserProfile, UsernameValidationResult } from '../types/user';
import { REMEMBER_ME_DURATION, SESSION_DURATION } from '../constants/time';

// Define a custom event for auth state changes
export const AUTH_STATE_CHANGED_EVENT = 'auth-state-changed';

interface FirebaseContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  signOut: () => Promise<void>;
  validateUsername: (username: string) => Promise<UsernameValidationResult>;
  changeUsername: (uid: string, newUsername: string) => Promise<void>;
  isUsernameAvailable: (username: string) => Promise<boolean>;
  isUserAdmin: (uid: string) => Promise<boolean>;
  generateRegistrationToken: (notes?: string) => Promise<string>;
  validateToken: (token: string) => Promise<boolean>;
  signUpWithToken: (token: string, email: string, password: string, username: string) => Promise<void>;
  getRegistrationTokens: () => Promise<any[]>;
  deleteRegistrationToken: (token: string) => Promise<void>;
  getAllUsers: () => Promise<any[]>;
  deleteUser: (userId: string) => Promise<void>;
  refreshSession: () => void;
  sessionExpired: boolean;
  renewSession: (rememberMe?: boolean) => Promise<void>;
  updateUserProfile: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState({
      isOpen: false,
      userEmail: ''
    });
  const [sessionExpired, setSessionExpired] = useState(false);

  const firebaseService = FirebaseService.getInstance();

  // Fetch user profile
  const fetchUserProfile = useCallback(async (user: User) => {
    try {
      const profile = await firebaseService.getPlayerProfile(user.uid);
      setUserProfile(profile);
      
      // Check if user is admin
      if (profile?.isAdmin) {
        setIsAdmin(true);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
    }
  }, []);

  // Dispatch an auth state change event
  const dispatchAuthStateChangedEvent = useCallback((authenticated: boolean) => {
    const event = new CustomEvent(AUTH_STATE_CHANGED_EVENT, { 
      detail: { authenticated } 
    });
    window.dispatchEvent(event);
  }, []);

  // Listen to authentication state changes
  useEffect(() => {
    const auth = firebaseService.getAuth();
    const unsubscribe = onAuthStateChanged(auth, 
      async (user) => {
        // Check if auth state has actually changed
        const wasAuthenticated = !!user;
        const wasAuthenticatedBefore = !!user;
        
        setUser(user);
        
        if (user) {
          await fetchUserProfile(user);
        } else {
          setUserProfile(null);
          setIsAdmin(false);
        }
        
        setLoading(false); // Set loading to false once we have the auth state
        
        // Dispatch auth state changed event only if there was an actual change
        if (wasAuthenticated !== wasAuthenticatedBefore) {
          dispatchAuthStateChangedEvent(wasAuthenticated);
        }
      },
      (error) => {
        console.error('Auth state error:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, [fetchUserProfile, dispatchAuthStateChangedEvent]);

  const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
    try {
      setError(null);
      // Update the user profile in Firestore
      await firebaseService.updateDocument('users', uid, updates);
      
      // Update local state if the user is the current user
      if (user && user.uid === uid) {
        setUserProfile(prevProfile => 
          prevProfile ? { ...prevProfile, ...updates } : null
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user profile');
      throw err;
    }
  };

  const generateRegistrationToken = async (notes: string = ''): Promise<string> => {
    try {
      setError(null);
      // Check if current user is admin
      if (!isAdmin || !user) {
        throw new Error('Only admins can generate registration tokens');
      }
      
      return await firebaseService.generateRegistrationToken(notes, user.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate registration token');
      throw err;
    }
  };
  
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      setError(null);
      return await firebaseService.isTokenValid(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred validating the invitation');
      return false;
    }
  };
  
  const signUpWithToken = async (token: string, email: string, password: string, username: string) => {
    try {
      setError(null);
      // First validate token
      const isValid = await firebaseService.isTokenValid(token);
      if (!isValid) {
        throw new Error('Invalid or expired invitation token');
      }
      
      const user = await firebaseService.signUpWithToken(token, email, password, username);
      setUser(user);
      await fetchUserProfile(user);
      
      // Dispatch auth state changed event
      dispatchAuthStateChangedEvent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up');
      throw err;
    }
  };

  const getRegistrationTokens = async () => {
    try {
      setError(null);
      // Check if current user is admin
      if (!isAdmin) {
        throw new Error('Only admins can view registration tokens');
      }
      
      return await firebaseService.getRegistrationTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get registration tokens');
      throw err;
    }
  };
  
  const deleteRegistrationToken = async (token: string) => {
    try {
      setError(null);
      // Check if current user is admin
      if (!isAdmin) {
        throw new Error('Only admins can delete registration tokens');
      }
      
      await firebaseService.deleteRegistrationToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete registration token');
      throw err;
    }
  };

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setError(null);
      // Get user from Firebase auth with rememberMe option
      const user = await firebaseService.signIn(email, password, rememberMe);
      // Update application state
      setUser(user);
      setSessionExpired(false);
      
      // Try to fetch profile, but don't let it affect sign-in success
      try {
        await fetchUserProfile(user);
      } catch (profileErr) {
        console.error("Error fetching profile, but user is authenticated:", profileErr);
      }
      
      // Dispatch auth state changed event
      dispatchAuthStateChangedEvent(true);
      
      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseService.signOut();
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      
      // Dispatch auth state changed event
      dispatchAuthStateChangedEvent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign out');
      throw err;
    }
  };

  const refreshSession = useCallback(() => {
    if (user) {
      firebaseService.updateLastActivity();
    }
  }, [user]);

  // Add session check on mount and periodically
  useEffect(() => {
    if (!user) return;
    
    const checkSessionStatus = () => {
      const isExpired = firebaseService.checkSessionExpired();
      if (isExpired) {
        setSessionExpired(true);
        signOut();
      }
    };
    
    // Check on mount
    checkSessionStatus();
    
    // Check every 5 minutes
    const intervalId = setInterval(checkSessionStatus, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [user]);

  /**
   * Renews the session without requiring re-authentication
   * Used when approaching the absolute session timeout
   */
  const renewSession = async (rememberMe: boolean = false) => {
    try {
      setError(null);
      
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      // Create a new session with updated timing
      const sessionInfo = {
        createdAt: new Date().getTime(),
        expiresAt: new Date().getTime() + (rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION),
        lastActivityAt: new Date().getTime(),
        rememberMe: rememberMe
      };
      localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
      
      // Update Firebase Auth persistence if different from current setting
      const auth = firebaseService.getAuth();
      const persistenceType = rememberMe 
        ? browserLocalPersistence 
        : browserSessionPersistence;
      
      // Try to set persistence - may fail if user's session isn't fresh enough
      try {
        await setPersistence(auth, persistenceType);
      } catch (err) {
        console.log('Could not change persistence level - continuing with current level');
      }
      
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to renew session');
      throw err;
    }
  };

  const getAllUsers = async () => {
    try {
      setError(null);
      // Check if current user is admin
      if (!isAdmin) {
        throw new Error('Only admins can view user list');
      }
      
      return await firebaseService.getAllUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      throw err;
    }
  };
  
  const deleteUser = async (userId: string) => {
    try {
      setError(null);
      // Check if current user is admin
      if (!isAdmin) {
        throw new Error('Only admins can delete users');
      }
      
      // Prevent admins from deleting themselves
      if (user && userId === user.uid) {
        throw new Error('Cannot delete your own account');
      }
      
      // Use the complete deletion method instead
      await firebaseService.deleteUser(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      throw err;
    }
  };

  // Validate username format and availability
  const validateUsername = async (username: string): Promise<UsernameValidationResult> => {
    try {
      setError(null);
      return await firebaseService.validateUsername(username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred validating username');
      throw err;
    }
  };

  // Change username
  const changeUsername = async (uid: string, newUsername: string): Promise<void> => {
    try {
      setError(null);
      await firebaseService.changeUsername(uid, newUsername);
      
      // Update the profile in state
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          username: newUsername
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred changing username');
      throw err;
    }
  };

  // Check if username is available
  const isUsernameAvailable = async (username: string): Promise<boolean> => {
    try {
      setError(null);
      return await firebaseService.isUsernameAvailable(username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred checking username availability');
      throw err;
    }
  };

  // Check if user is admin
  const isUserAdmin = async (uid: string): Promise<boolean> => {
    try {
      return await firebaseService.isUserAdmin(uid);
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    error,
    renewSession,
    signIn,
    signOut,
    refreshSession,
    sessionExpired,
    validateUsername,
    changeUsername,
    isUsernameAvailable,
    isUserAdmin,
    generateRegistrationToken,
    validateToken,
    signUpWithToken,
    getRegistrationTokens,
    deleteRegistrationToken,
    getAllUsers,
    deleteUser,
    updateUserProfile,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};