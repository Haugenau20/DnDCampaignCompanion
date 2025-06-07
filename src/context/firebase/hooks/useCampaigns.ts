// src/context/firebase/hooks/useCampaigns.ts
import { useCallback, useMemo } from 'react';
import { useFirebaseContext } from '../FirebaseContext';
import firebaseServices from '../../../services/firebase';
import { Campaign } from '../../../types/user';

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
        name = description || '';
        description = optionalName;
      } else {
        // Called with (name, description)
        name = nameOrGroupId;
        groupId = activeGroupId || '';
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

  return {
    campaigns,
    activeCampaignId,
    activeCampaign,    
    createCampaign,
    setActiveCampaign,
    refreshCampaigns,
    getCampaigns,
    updateCampaign
  };
}