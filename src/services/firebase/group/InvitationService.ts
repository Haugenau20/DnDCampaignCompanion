// src/services/firebase/group/InvitationService.ts
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    limit, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    collectionGroup,
    runTransaction
  } from 'firebase/firestore';
  import { 
    createUserWithEmailAndPassword 
  } from 'firebase/auth';
  import BaseFirebaseService from '../core/BaseFirebaseService';
  import ServiceRegistry from '../core/ServiceRegistry';
  import UserService from '../user/UserService';
  import GroupService from './GroupService';
  
  /**
   * InvitationService manages registration tokens and group invitations
   */
  class InvitationService extends BaseFirebaseService {
    private static instance: InvitationService;
    private userService: UserService;
    private groupService: GroupService;
  
    private constructor() {
      super();
      const registry = ServiceRegistry.getInstance();
      this.userService = registry.get('userService');
      this.groupService = registry.get('groupService');
    }
  
    /**
     * Get singleton instance of InvitationService
     */
    public static getInstance(): InvitationService {
      if (!InvitationService.instance) {
        InvitationService.instance = new InvitationService();
      }
      return InvitationService.instance;
    }
  
    /**
     * Generate a registration token for a specific group (admin only)
     * @param groupId ID of the group to generate token for
     * @param notes Optional notes about the token's purpose
     * @returns The generated token
     */
    public async generateGroupRegistrationToken(groupId: string, notes: string = ''): Promise<string> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }
      
      // Check if user is admin of this group
      const isAdmin = await this.userService.isUserAdmin(groupId, userId);
      if (!isAdmin) {
        throw new Error('Only group admins can generate tokens');
      }
      
      // Generate a unique token
      const token = this.generateSecureToken();
      
      // Store token in the group's registrationTokens collection
      await setDoc(doc(this.db, 'groups', groupId, 'registrationTokens', token), {
        token,
        createdAt: new Date(),
        createdBy: userId,
        notes,
        used: false
      });
      
      return token;
    }
  
  /**
   * Validate a registration token and get its associated group ID
   * @param token The token to validate
   * @returns Object with validation result and group ID
   */
  public async validateRegistrationToken(token: string): Promise<{isValid: boolean, groupId?: string}> {
    try {
      // Extract group ID from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const groupId = urlParams.get('groupId');
      
      // If no groupId provided, token cannot be validated
      if (!groupId) {
        return { isValid: false };
      }
      
      // Direct document lookup with groupId and token
      const docRef = doc(this.db, 'groups', groupId, 'registrationTokens', token);
      const docSnap = await getDoc(docRef);
      
      // Check if token exists and hasn't been used
      if (docSnap.exists() && docSnap.data().used !== true) {
        return { isValid: true, groupId };
      }
      
      return { isValid: false };
    } catch (error) {
      return { isValid: false };
    }
  }
  
    /**
     * Get registration tokens for a specific group (admin only)
     * @param groupId ID of the group to get tokens for
     * @returns Array of registration token objects
     */
    public async getGroupRegistrationTokens(groupId: string): Promise<any[]> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }
      
      // Check if user is admin of this group
      const isAdmin = await this.userService.isUserAdmin(groupId, userId);
      if (!isAdmin) {
        throw new Error('Only group admins can view registration tokens');
      }
      
      // Get tokens from the group's collection
      const tokensCollection = collection(this.db, 'groups', groupId, 'registrationTokens');
      const snapshot = await getDocs(tokensCollection);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        
        return {
          token: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          usedAt: data.usedAt?.toDate ? data.usedAt.toDate() : data.usedAt
        };
      });
    }
  
    /**
     * Delete a registration token from a specific group (admin only)
     * @param groupId ID of the group
     * @param token ID of the token to delete
     */
    public async deleteGroupRegistrationToken(groupId: string, token: string): Promise<void> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }
      
      // Check if user is admin of this group
      const isAdmin = await this.userService.isUserAdmin(groupId, userId);
      if (!isAdmin) {
        throw new Error('Only group admins can delete registration tokens');
      }
      
      await deleteDoc(doc(this.db, 'groups', groupId, 'registrationTokens', token));
    }
  
    /**
     * Join an existing account to a new group using an invitation token
     * @param token Registration token for the group
     * @param username Username to use in the new group
     */
    public async joinGroupWithToken(token: string, username: string): Promise<void> {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('You must be signed in to join a group');
      }
      
      // Validate the token and get the group ID
      const { isValid, groupId } = await this.validateRegistrationToken(token);
      
      if (!isValid || !groupId) {
        throw new Error('Invalid or expired invitation token');
      }
      
      // Join the group
      await this.groupService.joinGroup(groupId, username);
      
      // Mark token as used
      await updateDoc(doc(this.db, 'groups', groupId, 'registrationTokens', token), {
        used: true,
        usedAt: new Date(),
        usedBy: user.uid
      });
    }
  
    /**
     * Sign up with an invite token and user-provided email
     * @param token Registration token for the group
     * @param email User's email address
     * @param password User's password
     * @param username Username to use in the group
     * @param groupId Optional groupId (if already known from URL)
     * @returns The created user
     */
    public async signUpWithToken(
      token: string, 
      email: string, 
      password: string, 
      username: string,
      groupId?: string
    ): Promise<any> {
      // First, validate the token and get the group ID if not provided
      let targetGroupId = groupId;
      if (!targetGroupId) {
        const { isValid, groupId: validatedGroupId } = await this.validateRegistrationToken(token);
        
        if (!isValid || !validatedGroupId) {
          throw new Error('Invalid or expired invitation token');
        }
        
        targetGroupId = validatedGroupId;
      } else {
        // If groupId was provided, still verify the token is valid
        const docRef = doc(this.db, 'groups', targetGroupId, 'registrationTokens', token);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists() || docSnap.data().used === true) {
          throw new Error('Invalid or expired invitation token');
        }
      }

      // Validate the username is available in this group
      const isUsernameAvailable = await this.userService.isUsernameAvailableInGroup(targetGroupId, username);
      if (!isUsernameAvailable) {
        throw new Error('Username is already taken in this group');
      }

      try {
        // Create Firebase Auth user first (outside the transaction)
        const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
        const user = userCredential.user;
        
        // Use a transaction for Firestore operations
        await runTransaction(this.db, async (transaction) => {
          const now = new Date();
          
          // Create global user profile
          const globalUserDocRef = doc(this.db, 'users', user.uid);
          transaction.set(globalUserDocRef, {
            id: user.uid,
            email: email,
            groups: [targetGroupId],
            activeGroupId: targetGroupId,
            lastLogin: now,
            createdAt: now
          });
          
          // Create group-specific user profile
          const groupUserDocRef = doc(this.db, 'groups', targetGroupId, 'users', user.uid);
          transaction.set(groupUserDocRef, {
            userId: user.uid,
            username: username,
            role: 'member',
            joinedAt: now,
            preferences: {
              theme: 'light'
            }
          });
          
          // Create username reservation in group
          const usernameLower = username.toLowerCase();
          const usernameDocRef = doc(this.db, 'groups', targetGroupId, 'usernames', usernameLower);
          transaction.set(usernameDocRef, {
            userId: user.uid,
            originalUsername: username,
            createdAt: now
          });
          
          // Mark token as used
          const tokenDocRef = doc(this.db, 'groups', targetGroupId, 'registrationTokens', token);
          transaction.update(tokenDocRef, {
            used: true,
            usedAt: now,
            usedBy: user.uid
          });
        });
        
        // Set the active group context
        this.setActiveGroup(targetGroupId);
        
        return user;
      } catch (error) {
        // If transaction fails, try to delete the auth user to avoid orphaned accounts
        try {
          const currentUser = this.auth.currentUser;
          if (currentUser) {
            await currentUser.delete();
          }
        } catch (deleteError) {
          console.error("Error cleaning up auth user after failed transaction:", deleteError);
        }
        
        throw error;
      }
    }
  }
  
  export default InvitationService;