// src/context/firebase/hooks/useCampaigns.ts
import { useCallback, useMemo } from 'react';
import { useFirebaseContext } from 'features/user-management/auth/context/FirebaseContext';
import firebaseServices from 'core/services/firebase';
import { Campaign } from 'core/types/user';

export function useCampaigns() {
  const { 
    campaigns, 
    activeGroupId, 
    activeCampaignId,
    setError,
    refreshCampaigns
  } = useFirebaseContext();

  // Find the active campaign object based on ID
  const activeCampaign = useMemo(() => {
    if (!activeCampaignId || !campaigns.length) {
      console.log(`useCampaigns: No active campaign found. Campaigns: ${campaigns.length}, ActiveCampaignId: ${activeCampaignId}`);
      return null;
    }
    
    const found = campaigns.find(c => c.id === activeCampaignId);
    console.log(`useCampaigns: Active campaign ${found ? 'found' : 'not found'} for ID ${activeCampaignId}`);
    return found || null;
  }, [campaigns, activeCampaignId]);

  // Create a new campaign
  const createCampaign = useCallback(async (
    nameOrGroupId: string, 
    description?: string,
    optionalName?: string
  ): Promise<string> => {
    try {
      setError(null);
      
      // Handle both calling conventions:
      // 1. createCampaign(name, description)
      // 2. createCampaign(groupId, name, description)
      let name: string;
      let groupId: string;
      
      if (optionalName !== undefined) {
        // Called with (groupId, name, description)
        groupId = nameOrGroupId;
        name = description ?? '';
        description = optionalName;
      } else {
        // Called with (name, description)
        name = nameOrGroupId;
        groupId = activeGroupId || '';
      }

      // Validated after the branch so BOTH calling conventions get the same
      // rule (bug #700). The 3-arg form used to coerce a falsy name to '' via
      // `description || ''`; guarding only inside that branch would have left
      // the 2-arg form still accepting '', trading one asymmetry for another.
      // CampaignService slugifies `name` into the Firestore document ID, so an
      // empty name yields an empty path segment and an opaque low-level error
      // far from the call site.
      if (!name) {
        throw new Error('Campaign name is required');
      }

      if (!groupId) {
        throw new Error('No active group selected');
      }
      
      const campaignId = await firebaseServices.campaign.createCampaign(
        groupId, 
        name, 
        description
      );
      
      await refreshCampaigns();
      return campaignId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
      throw err;
    }
  }, [activeGroupId, setError, refreshCampaigns]);

  // Set active campaign
  const setActiveCampaign = useCallback(async (
    campaignId: string
  ): Promise<void> => {
    try {
      console.log(`useCampaigns: Setting active campaign to ${campaignId}`);
      setError(null);
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      // Update Firebase context
      firebaseServices.auth.setActiveCampaign(campaignId);
      
      // Update user preference in group profile
      const userId = firebaseServices.auth.getCurrentUserId();
      if (userId) {
        console.log(`useCampaigns: Updating user's activeCampaignId to ${campaignId}`);
        await firebaseServices.user.updateGroupUserProfile(activeGroupId, userId, {
          activeCampaignId: campaignId
        });
      }
      
      // Refresh campaigns to update the UI
      await refreshCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active campaign');
      throw err;
    }
  }, [activeGroupId, setError, refreshCampaigns]);

  // Get campaigns for a specific group
  const getCampaigns = useCallback(async (groupId: string): Promise<Campaign[]> => {
    try {
      return await firebaseServices.campaign.getCampaigns(groupId);
    } catch (err) {
      console.error('Error getting campaigns:', err);
      return [];
    }
  }, []);

  // Update an existing campaign
  const updateCampaign = useCallback(async (campaignId: string, data: Partial<Campaign>): Promise<void> => {
    try {
      setError(null);
      
      if (!activeGroupId) {
        throw new Error('No active group selected');
      }
      
      await firebaseServices.campaign.updateCampaign(activeGroupId, campaignId, data);
      await refreshCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign');
      throw err;
    }
  }, [activeGroupId, setError, refreshCampaigns]);

  // Delete a campaign and everything that belongs to it (subcollections,
  // every member's notes for it, and any activeCampaignId pointing at it)
  const deleteCampaign = useCallback(async (campaignId: string): Promise<void> => {
    try {
      setError(null);

      if (!activeGroupId) {
        throw new Error('No active group selected');
      }

      await firebaseServices.campaign.deleteCampaign(activeGroupId, campaignId);
      await refreshCampaigns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete campaign');
      throw err;
    }
  }, [activeGroupId, setError, refreshCampaigns]);

  return {
    campaigns,
    activeCampaignId,
    activeCampaign,
    createCampaign,
    setActiveCampaign,
    refreshCampaigns,
    getCampaigns,
    updateCampaign,
    deleteCampaign
  };
}