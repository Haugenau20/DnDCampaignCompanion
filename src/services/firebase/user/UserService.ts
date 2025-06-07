// src/services/firebase/user/UserService.ts
import { 
    doc, 
    getDoc, 
    updateDoc, 
    setDoc, 
    runTransaction 
  } from 'firebase/firestore';
  import BaseFirebaseService from '../core/BaseFirebaseService';
  import { 
    UserProfile, 
    GroupUserProfile, 
    UsernameValidationResult 
  } from '../../../types/user';
  
  /**
   * UserService handles user profile operations, both global and group-specific
   */
  class UserService extends BaseFirebaseService {
    private static instance: UserService;
  
    private constructor() {
      super();
    }
  
    /**
     * Get singleton instance of UserService
     */
    public static getInstance(): UserService {
      if (!UserService.instance) {
        UserService.instance = new UserService();
      }
      return UserService.instance;
    }
  
    /**
     * Get a user's global profile
     * @param userId ID of the user
     * @returns Global user profile or null if not found
     */
    public async getUserProfile(userId: string): Promise<UserProfile | null> {
        const userDoc = await getDoc(doc(this.db, 'users', userId));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
            id: userId,
            email: userData.email || '',
            groups: userData.groups || [],
            activeGroupId: userData.activeGroupId || null,
            lastLogin: userData.lastLogin || new Date(),
            createdAt: userData.createdAt || new Date()
            };
        }
        
        return null;
        }
  
    /**
     * Update a user's global profile
     * @param userId ID of the user
     * @param updates Partial profile data to update
     */
    public async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
      await updateDoc(doc(this.db, 'users', userId), updates);
    }
  
    /**
     * Get a user's profile in a specific group
     * @param groupId ID of the group
     * @param userId ID of the user
     * @returns Group-specific user profile or null if not found
     */
    public async getGroupUserProfile(groupId: string, userId: string): Promise<GroupUserProfile | null> {
      const docRef = doc(this.db, 'groups', groupId, 'users', userId);
      const docSnapshot = await getDoc(docRef);
      
      if (docSnapshot.exists()) {
        return {
          ...docSnapshot.data(),
          userId
        } as GroupUserProfile;
      }
      
      return null;
    }
  
    /**
     * Update a user's profile in a specific group
     * @param groupId ID of the group
     * @param userId ID of the user
     * @param updates Object with fields to update
     */
    public async updateGroupUserProfile(groupId: string, userId: string, updates: Partial<GroupUserProfile>): Promise<void> {
      const docRef = doc(this.db, 'groups', groupId, 'users', userId);
      await updateDoc(docRef, updates);
    }
  
    /**
     * Validate a username format and check availability in a group
     * @param groupId ID of the group to check in
     * @param username Username to validate
     * @returns Validation result object
     */
    public async validateGroupUsername(groupId: string, username: string): Promise<UsernameValidationResult> {
      // Check username format first
      const usernameRegex = /^[a-zA-Z0-9æøåÆØÅ_-]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return {
          isValid: false,
          error: 'Allowed characters: a-z, æ, ø, å, 0-9, _ and -'
        };
      }
      
      try {
        // Check availability in group
        const isAvailable = await this.isUsernameAvailableInGroup(groupId, username);
        
        if (!isAvailable) {
          // Return a specific error for taken usernames
          return {
            isValid: true,
            isAvailable: false,
            error: 'Username already taken'
          };
        }
        
        // Username is valid and available
        return {
          isValid: true,
          isAvailable: true
        };
      } catch (err) {
        return {
          isValid: false,
          error: 'Error checking username availability'
        };
      }
    }
  
    /**
     * Check if a username is available in a specific group
     * @param groupId ID of the group to check in
     * @param username Username to check
     * @returns True if username is available, false otherwise
     */
    public async isUsernameAvailableInGroup(groupId: string, username: string): Promise<boolean> {
      const usernameLower = username.toLowerCase();
      const usernameDoc = await getDoc(doc(this.db, 'groups', groupId, 'usernames', usernameLower));
      return !usernameDoc.exists();
    }
  
    /**
     * Change a user's username in a specific group
     * @param groupId ID of the group
     * @param userId ID of the user
     * @param newUsername New username to set
     */
    public async changeGroupUsername(groupId: string, userId: string, newUsername: string): Promise<void> {
      // Validate username is available in this group
      const isAvailable = await this.isUsernameAvailableInGroup(groupId, newUsername);
      if (!isAvailable) {
        throw new Error('Username is already taken in this group');
      }
      
      // Get current username to delete after successful change
      const userDoc = await getDoc(doc(this.db, 'groups', groupId, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User profile not found in this group');
      }
      
      const userData = userDoc.data() as GroupUserProfile;
      const currentUsername = userData.username;
      const currentUsernameLower = currentUsername.toLowerCase();
      
      // Don't proceed if username isn't actually changing (case-insensitive check)
      const newUsernameLower = newUsername.toLowerCase();
      if (newUsernameLower === currentUsernameLower) {
        return;
      }
      
      // Execute as a transaction to ensure atomicity
      await runTransaction(this.db, async (transaction) => {
        // Reserve new username
        const newUsernameDocRef = doc(this.db, 'groups', groupId, 'usernames', newUsernameLower);
        const newUsernameSnapshot = await transaction.get(newUsernameDocRef);
        
        if (newUsernameSnapshot.exists()) {
          throw new Error('Username is already taken in this group');
        }
        
        // Update user profile
        const userDocRef = doc(this.db, 'groups', groupId, 'users', userId);
        transaction.update(userDocRef, {
          username: newUsername
        });
        
        // Create new username reservation
        transaction.set(newUsernameDocRef, {
          userId,
          originalUsername: newUsername,
          createdAt: new Date()
        });
        
        // Delete old username reservation
        const oldUsernameDocRef = doc(this.db, 'groups', groupId, 'usernames', currentUsernameLower);
        transaction.delete(oldUsernameDocRef);
      });
    }
  
    /**
     * Find a user by username in a group
     * @param groupId ID of the group
     * @param username Username to search for
     * @returns User ID if found, null otherwise
     */
    public async findUserByUsername(groupId: string, username: string): Promise<string | null> {
      const usernameLower = username.toLowerCase();
      const usernameDoc = await getDoc(doc(this.db, 'groups', groupId, 'usernames', usernameLower));
      
      if (usernameDoc.exists()) {
        const data = usernameDoc.data();
        return data.userId;
      }
      
      return null;
    }
  
    /**
     * Check if a user is an admin of a group
     * @param groupId ID of the group
     * @param userId ID of the user
     * @returns Whether the user is an admin
     */
    public async isUserAdmin(groupId: string, userId: string): Promise<boolean> {
      const profileData = await this.getGroupUserProfile(groupId, userId);
      return profileData?.role === 'admin';
    }
  }
  
  export default UserService;