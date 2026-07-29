// src/core/services/firebase/campaign/CampaignService.ts
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc,
    updateDoc
  } from 'firebase/firestore';
  import { getFunctions, httpsCallable } from 'firebase/functions';
  import BaseFirebaseService from '../core/BaseFirebaseService';
  import ServiceRegistry from '../core/ServiceRegistry';
  import type UserService from '../user/UserService';
  import { Campaign } from '../../../types/user';
  
  /**
   * CampaignService manages campaign operations
   */
  class CampaignService extends BaseFirebaseService {
    private static instance: CampaignService;
    private userService: UserService;
  
    private constructor() {
      super();
      this.userService = ServiceRegistry.getInstance().get('userService');
    }
  
    /**
     * Get singleton instance of CampaignService
     */
    public static getInstance(): CampaignService {
      if (!CampaignService.instance) {
        CampaignService.instance = new CampaignService();
      }
      return CampaignService.instance;
    }
  
    /**
     * Create a new campaign within a group
     * @param groupId ID of the group to create campaign in
     * @param name Name of the campaign
     * @param description Optional description of the campaign
     * @returns The ID of the newly created campaign
     */
    public async createCampaign(groupId: string, name: string, description?: string): Promise<string> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }
      
      // Check if user is a member of this group
      const userProfileDoc = await this.userService.getGroupUserProfile(groupId, userId);
      if (!userProfileDoc) {
        throw new Error('You are not a member of this group');
      }
      
      // Generate a campaign ID from the name (slug format)
      let campaignId = name.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
      
      // Ensure the ID is unique
      const campaignRef = doc(this.db, 'groups', groupId, 'campaigns', campaignId);
      const existingDoc = await getDoc(campaignRef);
      
      // If a document with this ID already exists, append a timestamp
      if (existingDoc.exists()) {
        campaignId = `${campaignId}-${Date.now()}`;
      }
      
      // Create the campaign document
      await setDoc(doc(this.db, 'groups', groupId, 'campaigns', campaignId), {
        name,
        description: description || '',
        createdAt: new Date(),
        createdBy: userId,
        isActive: true
      });
      
      // Set as active campaign for the user
      if (userProfileDoc) {
        await this.userService.updateGroupUserProfile(groupId, userId, {
          activeCampaignId: campaignId
        });
      }
      
      // Set active campaign in context
      this.setActiveCampaign(campaignId);
      
      return campaignId;
    }
  
    /**
     * Get all campaigns in a specific group
     * @param groupId ID of the group to get campaigns for
     * @returns Array of campaign objects with IDs
     */
    public async getCampaigns(groupId: string): Promise<Campaign[]> {
      console.log(`CampaignService: Getting campaigns for group ${groupId}`);
      
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        console.log('CampaignService: No authenticated user, returning empty campaigns array');
        return [];
      }
      
      // Check if user is a member of this group
      const userProfileDoc = await this.userService.getGroupUserProfile(groupId, userId);
      if (!userProfileDoc) {
        console.warn(`CampaignService: User ${userId} is not a member of group ${groupId}`);
        return [];
      }
      
      try {
        // Get campaigns from the group's collection
        const campaignsCollection = collection(this.db, 'groups', groupId, 'campaigns');
        const snapshot = await getDocs(campaignsCollection);
        
        const campaigns = snapshot.docs.map(doc => ({
          id: doc.id,
          groupId,
          ...doc.data()
        } as Campaign));
        
        console.log(`CampaignService: Found ${campaigns.length} campaigns for group ${groupId}:`, 
          campaigns.map(c => `${c.id}: ${c.name}`).join(', '));
        
        return campaigns;
      } catch (error) {
        console.error(`CampaignService: Error fetching campaigns for group ${groupId}:`, error);
        return [];
      }
    }

    /**
     * Update an existing campaign
     * @param groupId ID of the group containing the campaign
     * @param campaignId ID of the campaign to update
     * @param data Fields to update on the campaign
     */
    public async updateCampaign(groupId: string, campaignId: string, data: Partial<Campaign>): Promise<void> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }
      
      // Check if user is a member of this group
      const userProfileDoc = await this.userService.getGroupUserProfile(groupId, userId);
      if (!userProfileDoc) {
        throw new Error('You are not a member of this group');
      }
      
      try {
        const campaignRef = doc(this.db, 'groups', groupId, 'campaigns', campaignId);
        await updateDoc(campaignRef, {
          ...data,
          modifiedBy: userId,
          dateModified: new Date()
        });
        
        console.log(`CampaignService: Updated campaign ${campaignId} in group ${groupId}`);
      } catch (error) {
        console.error(`CampaignService: Error updating campaign ${campaignId}:`, error);
        throw error;
      }
    }

    /**
     * Delete a campaign and everything that belongs to it.
     *
     * Firestore does not cascade-delete subcollections, and the client SDK
     * cannot enumerate them at all, so this delegates to the `deleteCampaign`
     * Cloud Function: it uses the Admin SDK's `recursiveDelete` to remove the
     * campaign document and all of its subcollections (npcs, locations,
     * quests, rumors, chapters, story-progress, saga), deletes every group
     * member's notes for this campaign (notes live outside the campaign
     * subtree, keyed by a campaignId field), and clears `activeCampaignId`
     * on any profile that pointed at it.
     * @param groupId ID of the group that owns the campaign
     * @param campaignId ID of the campaign to delete
     */
    public async deleteCampaign(groupId: string, campaignId: string): Promise<void> {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) {
        throw new Error('Not authenticated');
      }

      try {
        // Call the Cloud Function instead of attempting to modify data directly
        const functions = getFunctions();
        const deleteCampaignFn = httpsCallable(functions, 'deleteCampaign');

        const result = await deleteCampaignFn({ groupId, campaignId });
        console.log('Campaign deletion result:', result.data);
      } catch (err) {
        console.error('Error deleting campaign:', err);
        throw err;
      }
    }
  }

  export default CampaignService;