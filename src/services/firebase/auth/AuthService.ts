// src/services/firebase/auth/AuthService.ts
import { 
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
  } from 'firebase/auth';
  import { doc, updateDoc, getDoc } from 'firebase/firestore';
  import BaseFirebaseService from '../core/BaseFirebaseService';
  import ServiceRegistry from '../core/ServiceRegistry';
  import UserService from '../user/UserService';
  import { SESSION_DURATION, REMEMBER_ME_DURATION, INACTIVITY_TIMEOUT } from '../config/firebaseConfig';
  
  /**
   * AuthService handles all authentication-related operations
   */
  class AuthService extends BaseFirebaseService {
    private static instance: AuthService;
    private userService: UserService;
  
    private constructor() {
      super();
      this.userService = ServiceRegistry.getInstance().get('userService');
    }
  
    /**
     * Get singleton instance of AuthService
     */
    public static getInstance(): AuthService {
      if (!AuthService.instance) {
        AuthService.instance = new AuthService();
      }
      return AuthService.instance;
    }
  
    /**
     * Get the auth instance
     */
    public getAuth() {
      return this.auth;
    }

    /**
     * Get the current authenticated user's ID
     * @returns User ID or null if not authenticated
     */
    public getCurrentUserId(): string | null {
        return this.getCurrentUser()?.uid || null;
    }
    
    /**
     * Get the current authenticated user
     * @returns User object or null if not authenticated
     */
    public getUser(): User | null {
        return this.getCurrentUser();
    }

    /**
     * Renew the current session with updated timing
     * @param rememberMe Whether to use extended session duration
     */
    public async renewSession(rememberMe: boolean = false): Promise<void> {
        try {
        const user = this.getCurrentUser();
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
        const persistenceType = rememberMe 
            ? browserLocalPersistence 
            : browserSessionPersistence;
        
        // Try to set persistence - may fail if user's session isn't fresh enough
        try {
            await setPersistence(this.auth, persistenceType);
        } catch (err) {
            console.log('Could not change persistence level - continuing with current level');
        }
        } catch (err) {
        console.error('Failed to renew session:', err);
        throw err;
        }
    }
  
    /**
     * Updates the last activity timestamp for the current session
     * Used for the sliding window session timeout
     */
    public updateLastActivity(): void {
      const sessionInfoStr = localStorage.getItem('sessionInfo');
      if (sessionInfoStr) {
        try {
          const sessionInfo = JSON.parse(sessionInfoStr);
          sessionInfo.lastActivityAt = new Date().getTime();
          localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
        } catch (e) {
          console.error('Error updating last activity:', e);
        }
      }
    }
  
    /**
     * Checks if the current session has expired based on inactivity
     * @returns true if the session has expired, false otherwise
     */
    public checkSessionExpired(): boolean {
      const sessionInfoStr = localStorage.getItem('sessionInfo');
      if (!sessionInfoStr) return false; // No session info, let Firebase handle it
      
      try {
        const sessionInfo = JSON.parse(sessionInfoStr);
        const now = new Date().getTime();
        
        // Check absolute expiry (30 days for rememberMe, 24 hours for session)
        if (now > sessionInfo.expiresAt) {
          return true;
        }
        
        // Check inactivity timeout (24 hours of inactivity)
        if (now - sessionInfo.lastActivityAt > INACTIVITY_TIMEOUT) {
          return true;
        }
        
        return false;
      } catch (e) {
        console.error('Error checking session expiry:', e);
        return false;
      }
    }
  
    /**
     * Sign in with email and password
     * @param email User's email address
     * @param password User's password
     * @param rememberMe Whether to persist the session across browser restarts
     * @returns The authenticated User object
     */
    public async signIn(email: string, password: string, rememberMe: boolean = false): Promise<User> {
      try {
        // Set the appropriate persistence based on rememberMe
        const persistenceType = rememberMe 
          ? browserLocalPersistence   // Persists session across browser restarts
          : browserSessionPersistence; // Session only persists until tab/window closes
        
        // Set persistence before signing in
        await setPersistence(this.auth, persistenceType);
        
        // Proceed with sign in
        const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
        
        // Store the session creation time and settings in local storage
        const sessionInfo = {
          createdAt: new Date().getTime(),
          expiresAt: new Date().getTime() + (rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION),
          lastActivityAt: new Date().getTime(),
          rememberMe: rememberMe
        };
        localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
        
        // Update last login date in global user profile
        const userDoc = doc(this.db, 'users', userCredential.user.uid);
        await updateDoc(userDoc, {
          lastLogin: new Date()
        });
        
        // Get user's global profile to find active group
        const userDocSnapshot = await getDoc(userDoc);
        if (userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();
          
          // Set active group from user preferences
          if (userData.activeGroupId) {
            this.setActiveGroup(userData.activeGroupId);
            
            // If user has a group profile, get active campaign ID
            const groupUserDoc = await this.userService.getGroupUserProfile(userData.activeGroupId, userCredential.user.uid);
            if (groupUserDoc && groupUserDoc.activeCampaignId) {
              this.setActiveCampaign(groupUserDoc.activeCampaignId);
            }
          }
        }
        
        return userCredential.user;
      } catch (error) {
        console.error("Sign in error:", error);
        throw error;
      }
    }
    
    /**
     * Sign out and clear session data
     */
    public async signOut(): Promise<void> {
      // Clear the session info from local storage
      localStorage.removeItem('sessionInfo');
      
      // Clear group/campaign context
      this.setActiveGroup(null);
      this.setActiveCampaign(null);
      
      // Sign out from Firebase Auth
      await firebaseSignOut(this.auth);
    }
  }
  
  export default AuthService;