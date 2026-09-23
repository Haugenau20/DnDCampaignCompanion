// src/core/services/firebase/group/InvitationService.ts
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc
  } from 'firebase/firestore';
  import { 
    createUserWithEmailAndPassword 
  } from 'firebase/auth';
  import { httpsCallable } from 'firebase/functions';
  import BaseFirebaseService from '../core/BaseFirebaseService';
  import ServiceRegistry from '../core/ServiceRegistry';
  import type UserService from '../user/UserService';
  import {
    REGISTRATION_TOKEN_LIFETIME_MS,
    isRegistrationTokenRedeemable
  } from '../../../utils/registration-token';

  /**
   * InvitationService manages registration tokens and group invitations
   */
  class InvitationService extends BaseFirebaseService {
    private static instance: InvitationService;
    private userService: UserService;
  
    private constructor() {
      super();
      this.userService = ServiceRegistry.getInstance().get('userService');
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
      const createdAt = new Date();
      await setDoc(doc(this.db, 'groups', groupId, 'registrationTokens', token), {
        token,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + REGISTRATION_TOKEN_LIFETIME_MS),
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
      
      // Check the token exists, hasn't been used, and hasn't expired
      if (docSnap.exists() && isRegistrationTokenRedeemable(docSnap.data())) {
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
          ...data,
          // After the spread, not before it. A token is looked up by document
          // id -- `validateRegistrationToken` does `doc(db, ..., token)` -- and
          // the document also stores a `token` field. Generation writes the two
          // identically, but nothing enforces that, and where they diverge the
          // spread used to overwrite the id with the stored field. The caller
          // then built a share link around a value no lookup could resolve, so
          // the invitation appeared valid in the list and was rejected on
          // arrival. The id is the identity; the stored field is a copy of it.
          token: doc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : data.expiresAt,
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
     * Set the note on a registration token (admin only).
     *
     * The note is who the invitation is *for*, and it is the only thing that
     * tells one pending invitation from another in the admin view -- the token
     * string is never shown. Creating an invitation deliberately asks for
     * nothing, so this is where a note gets attached: afterwards, on the row.
     *
     * Only `notes` is written. The rules already permit a group admin to update
     * a token (`allow update: if isGroupAdmin(groupId)`), so this needs no rules
     * change; restricting the payload to one field is this method's own
     * discipline, so that an admin edit can never touch `used`, `usedAt` or
     * `usedBy` and resurrect a spent invitation.
     *
     * @param groupId ID of the group
     * @param token ID of the token
     * @param notes The new note, which may be empty to clear it
     */
    public async updateGroupRegistrationTokenNotes(
      groupId: string,
      token: string,
      notes: string
    ): Promise<void> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }

      // Check if user is admin of this group
      const isAdmin = await this.userService.isUserAdmin(groupId, userId);
      if (!isAdmin) {
        throw new Error('Only group admins can update registration tokens');
      }

      await updateDoc(
        doc(this.db, 'groups', groupId, 'registrationTokens', token),
        { notes }
      );
    }

    /**
     * Spend an invitation token on the signed-in user's membership.
     *
     * Runs in the `redeemInvitation` Cloud Function (T052), never as client
     * writes: membership is `users/{uid}.groups`, which the Firestore rules
     * trust, so a client allowed to write it could join any group whose id it
     * knew, token or not. The function checks the token -- exists, unused,
     * unexpired -- and writes the membership, the group profile, the username
     * reservation and the spent token in one transaction.
     *
     * Uses `this.functions`, the instance bound to `europe-west1` and to the
     * emulator in development, not a bare `getFunctions()`.
     */
    private async redeemInvitation(groupId: string, token: string, username: string): Promise<void> {
      const redeem = httpsCallable(this.functions, 'redeemInvitation');
      await redeem({ groupId, token, username });
      this.setActiveGroup(groupId);
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
      
      // Checked here as well as on the server so a spent link fails with a
      // clear message before anything is sent. The server's check is the one
      // that counts.
      const { isValid, groupId } = await this.validateRegistrationToken(token);
      
      if (!isValid || !groupId) {
        throw new Error('Invalid or expired invitation token');
      }
      
      await this.redeemInvitation(groupId, token, username);
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
        
        if (!docSnap.exists() || !isRegistrationTokenRedeemable(docSnap.data())) {
          throw new Error('Invalid or expired invitation token');
        }
      }

      // Validate the username is available in this group
      const isUsernameAvailable = await this.userService.isUsernameAvailableInGroup(targetGroupId, username);
      if (!isUsernameAvailable) {
        throw new Error('Username is already taken in this group');
      }

      // The Auth account has to exist before the function can be called as
      // it. Everything else -- including the global profile, which a client
      // may no longer create -- is written by `redeemInvitation`.
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      try {
        await this.redeemInvitation(targetGroupId, token, username);
        return user;
      } catch (error) {
        // An account that joined nothing can never sign in to anything, so it
        // is removed rather than left orphaned.
        try {
          await user.delete();
        } catch (deleteError) {
          console.error("Error cleaning up auth user after failed sign-up:", deleteError);
        }
        
        throw error;
      }
    }
  }
  
  export default InvitationService;