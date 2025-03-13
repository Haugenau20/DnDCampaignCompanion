// src/services/firebase/group/GroupService.ts
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    runTransaction, 
    query, 
    where 
  } from 'firebase/firestore';
import BaseFirebaseService from '../core/BaseFirebaseService';
import ServiceRegistry from '../core/ServiceRegistry';
import UserService from '../user/UserService';
import { Group } from '../../../types/user';
import { getFunctions, httpsCallable } from 'firebase/functions';

  /**
   * GroupService manages group operations
   */
  class GroupService extends BaseFirebaseService {
    private static instance: GroupService;
    private userService: UserService;
  
    private constructor() {
      super();
      this.userService = ServiceRegistry.getInstance().get('userService');
    }
  
    /**
     * Get singleton instance of GroupService
     */
    public static getInstance(): GroupService {
      if (!GroupService.instance) {
        GroupService.instance = new GroupService();
      }
      return GroupService.instance;
    }
  
    /**
     * Create a new group
     * @param name Name of the group
     * @param description Optional description of the group
     * @returns The ID of the newly created group
     */
    public async createGroup(name: string, description?: string): Promise<string> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }
      
      // Generate a unique ID for the group
      const groupId = doc(collection(this.db, 'groups')).id;
      
      // Use a transaction to create all necessary documents
      await runTransaction(this.db, async (transaction) => {
        const now = new Date();
        
        // Create the group document
        const groupDocRef = doc(this.db, 'groups', groupId);
        transaction.set(groupDocRef, {
          name,
          description: description || '',
          createdAt: now,
          createdBy: userId
        });
        
        // Add the group to the user's global profile
        const userDocRef = doc(this.db, 'users', userId);
        const userDoc = await transaction.get(userDocRef);
        
        // Default username to use if we can't find one
        let usernameToUse = 'Admin';
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const updatedGroups = [...(userData.groups || []), groupId];
          
          transaction.update(userDocRef, {
            groups: updatedGroups,
            activeGroupId: groupId // Set as the active group
          });
          
          // If the user has a username in their global profile, use it
          if (userData.username) {
            usernameToUse = userData.username;
          }
        } else {
          // If user document doesn't exist (shouldn't happen), create it
          transaction.set(userDocRef, {
            id: userId,
            email: this.getCurrentUser()?.email,
            groups: [groupId],
            activeGroupId: groupId,
            lastLogin: now,
            createdAt: now
          });
        }
        
        // Create the user's group profile as an admin
        const groupUserDocRef = doc(this.db, 'groups', groupId, 'users', userId);
        transaction.set(groupUserDocRef, {
          userId,
          username: usernameToUse, // Use the username we determined above
          role: 'admin',
          joinedAt: now,
          preferences: {
            theme: 'default'
          }
        });
        
        // Reserve the username
        const usernameLower = usernameToUse.toLowerCase();
        const usernameDocRef = doc(this.db, 'groups', groupId, 'usernames', usernameLower);
        transaction.set(usernameDocRef, {
          userId,
          originalUsername: usernameToUse,
          createdAt: now
        });
      });
      
      // Set the active group context
      this.setActiveGroup(groupId);
      
      return groupId;
    }
  
    /**
     * Get all groups the current user is a member of
     * @returns Array of group objects with IDs
     */
    public async getGroups(): Promise<Group[]> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) return [];
      
      // Get user's global profile to find group memberships
      const userDoc = await getDoc(doc(this.db, 'users', userId));
      if (!userDoc.exists()) return [];
      
      const userData = userDoc.data();
      const groupIds = userData.groups || [];
      
      // Fetch each group's metadata
      const groups: Group[] = [];
      for (const groupId of groupIds) {
        const groupDoc = await getDoc(doc(this.db, 'groups', groupId));
        if (groupDoc.exists()) {
          groups.push({
            id: groupId,
            ...groupDoc.data()
          } as Group);
        }
      }
      
      return groups;
    }
  
    /**
     * Get all users in a specific group (admin only)
     * @param groupId ID of the group to get users for
     * @returns Array of group user profile objects
     */
    public async getGroupUsers(groupId: string): Promise<any[]> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }
      
      // Check if user is admin of this group or a member
      const userProfileDoc = await getDoc(doc(this.db, 'groups', groupId, 'users', userId));
      if (!userProfileDoc.exists()) {
        throw new Error('You are not a member of this group');
      }
      
      // Get users from the group's collection
      const usersCollection = collection(this.db, 'groups', groupId, 'users');
      const snapshot = await getDocs(usersCollection);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        
        return {
          id: doc.id,
          ...data,
          joinedAt: data.joinedAt?.toDate ? data.joinedAt.toDate() : data.joinedAt
        };
      });
    }
  
    /**
     * Remove a user from a specific group (admin only)
     * @param groupId ID of the group
     * @param userId ID of the user to remove
     */
    public async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
      const currentUserId = this.getCurrentUser()?.uid;
      if (!currentUserId) {
        throw new Error('Not authenticated');
      }
      
      try {
        // Call the Cloud Function instead of attempting to modify data directly
        const functions = getFunctions();
        const removeUserFn = httpsCallable(functions, 'removeUserFromGroup');
        
        const result = await removeUserFn({ groupId, userId });
        console.log('User removal result:', result.data);
      } catch (err) {
        console.error('Error removing user from group:', err);
        throw err;
      }
    }
  
    /**
     * Join an existing account to a new group using an invitation token
     * @param groupId ID of the group to join
     * @param username Username to use in the new group
     */
    public async joinGroup(groupId: string, username: string): Promise<void> {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('You must be signed in to join a group');
      }
      
      // Check if user is already a member of this group
      const userDoc = await getDoc(doc(this.db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      const userData = userDoc.data();
      if (userData.groups && userData.groups.includes(groupId)) {
        throw new Error('You are already a member of this group');
      }
      
      // Validate the username is available in this group
      const isUsernameAvailable = await this.userService.isUsernameAvailableInGroup(groupId, username);
      if (!isUsernameAvailable) {
        throw new Error('Username is already taken in this group');
      }
      
      // Use a transaction to update all necessary documents
      await runTransaction(this.db, async (transaction) => {
        const now = new Date();
        
        // Update global user profile to add the new group
        const globalUserDocRef = doc(this.db, 'users', user.uid);
        const userSnapshot = await transaction.get(globalUserDocRef);
        if (!userSnapshot.exists()) {
          throw new Error('User profile not found');
        }
        
        const userData = userSnapshot.data();
        const updatedGroups = [...(userData.groups || []), groupId];
        
        transaction.update(globalUserDocRef, {
          groups: updatedGroups,
          activeGroupId: groupId, // Set as the active group
        });
        
        // Create group-specific user profile
        const groupUserDocRef = doc(this.db, 'groups', groupId, 'users', user.uid);
        transaction.set(groupUserDocRef, {
          userId: user.uid,
          username: username,
          role: 'member',
          joinedAt: now,
          preferences: {
            theme: 'default'
          }
        });
        
        // Create username reservation in group
        const usernameLower = username.toLowerCase();
        const usernameDocRef = doc(this.db, 'groups', groupId, 'usernames', usernameLower);
        transaction.set(usernameDocRef, {
          userId: user.uid,
          originalUsername: username,
          createdAt: now
        });
      });
      
      // Set the active group context
      this.setActiveGroup(groupId);
    }
  }
  
  export default GroupService;