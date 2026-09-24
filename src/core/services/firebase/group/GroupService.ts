// src/core/services/firebase/group/GroupService.ts
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    updateDoc
  } from 'firebase/firestore';
import BaseFirebaseService from '../core/BaseFirebaseService';
import ServiceRegistry from '../core/ServiceRegistry';
import type UserService from '../user/UserService';
import { Group } from '../../../types/user';
import { StoredImage } from '../../../types/storedImage';
import { httpsCallable } from 'firebase/functions';

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
     *
     * Delegates to the `createGroup` Cloud Function: the group creator's own
     * profile is written with `role: 'admin'`, and production Firestore rules
     * deny clients that write entirely (bug #1409 -- a member could otherwise
     * delete their own group profile, permitted as "leave group", and
     * recreate it with an escalated role).
     * @param name Name of the group
     * @param description Optional description of the group
     * @returns The ID of the newly created group
     */
    public async createGroup(name: string, description?: string): Promise<string> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }

      try {
        // Call the Cloud Function instead of attempting to modify data directly.
        // `this.functions`, not a bare getFunctions(): that resolves the
        // default `us-central1` region, where nothing in this project is
        // deployed, and bypasses the emulator in development.
        const createGroupFn = httpsCallable(this.functions, 'createGroup');

        const result = await createGroupFn({ name, description });
        const { groupId } = result.data as { success: boolean; groupId: string };

        // Set the active group context
        this.setActiveGroup(groupId);

        return groupId;
      } catch (err) {
        console.error('Error creating group:', err);
        throw err;
      }
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
     * Rename a group, or change its description (admin only).
     *
     * A plain client write, not a Cloud Function: the production rules already
     * let a group admin update the group document
     * (`firestore.rules.prod`, `allow update: if isGroupAdmin(groupId) ||
     * isGlobalAdmin()`). Those rules do not restrict *which* fields change, so
     * restricting the payload to `name` and `description` is this method's own
     * discipline -- an edit here can never touch `createdBy` or `createdAt`.
     *
     * The admin check is the same courtesy every admin method on these services
     * makes; the rules are the real gate.
     *
     * @param groupId ID of the group
     * @param updates The new name, which may not be blank, and description,
     *   which may be empty to clear it
     */
    public async updateGroup(
      groupId: string,
      updates: { name: string; description?: string }
    ): Promise<void> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const name = updates.name.trim();
      if (!name) {
        throw new Error('A group needs a name');
      }

      const isAdmin = await this.userService.isUserAdmin(groupId, userId);
      if (!isAdmin) {
        throw new Error('Only group admins can edit the group');
      }

      await updateDoc(doc(this.db, 'groups', groupId), {
        name,
        description: (updates.description ?? '').trim()
      });
    }

    /**
     * Set or clear the group's crest (admin only, T021).
     *
     * Same shape as updateGroup: a client write the rules already allow a
     * group admin, restricted here to the one field. The image itself is
     * uploaded (and the old one deleted) by the caller; this only records it.
     *
     * @param groupId ID of the group
     * @param crest The uploaded image, or null to clear it -- Firestore cannot
     *   store undefined
     */
    public async setGroupCrest(groupId: string, crest: StoredImage | null): Promise<void> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const isAdmin = await this.userService.isUserAdmin(groupId, userId);
      if (!isAdmin) {
        throw new Error('Only group admins can change the crest');
      }

      await updateDoc(doc(this.db, 'groups', groupId), { crest });
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
        // Call the Cloud Function instead of attempting to modify data directly.
        // Uses `this.functions` -- the instance BaseFirebaseService bound to
        // `europe-west1`, where this function is deployed, and to the emulator
        // in development -- rather than a bare getFunctions(), which resolves
        // the default `us-central1` region and reaches nothing.
        const removeUserFn = httpsCallable(this.functions, 'removeUserFromGroup');

        await removeUserFn({ groupId, userId });
      } catch (err) {
        console.error('Error removing user from group:', err);
        throw err;
      }
    }
  
    /**
     * Make a member an admin, or an admin a member (admin only, T034).
     *
     * Runs in the `setMemberRole` Cloud Function. The rules refuse any client
     * write to `role`, because the one check that matters here -- that the
     * change does not leave the group with no admin at all (T035) -- needs
     * every member's role, and a rule cannot count.
     *
     * @param groupId ID of the group
     * @param userId The member whose role changes
     * @param role The role they should have
     */
    public async setMemberRole(
      groupId: string,
      userId: string,
      role: 'admin' | 'member'
    ): Promise<void> {
      if (!this.getCurrentUser()) {
        throw new Error('Not authenticated');
      }

      const setMemberRoleFn = httpsCallable(this.functions, 'setMemberRole');
      await setMemberRoleFn({ groupId, userId, role });
    }
  }
  
  export default GroupService;