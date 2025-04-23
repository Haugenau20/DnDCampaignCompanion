// src/utils/__dev__/generators/campaignGenerator.ts

import { doc, setDoc } from 'firebase/firestore';
import { UserMapping } from './userGenerator';

// Campaign data structure
export interface CampaignData {
  id: string;
  name: string;
  description: string;
  groupId: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

// Create campaigns with actual creator UID
export const createCampaigns = async (
  db: any, 
  groups: { group1Id: string, group2Id: string }, 
  userMapping: UserMapping,
  formattedDate: string
): Promise<CampaignData[]> => {
  const dmUid = userMapping['dm'];
  const allCampaigns: CampaignData[] = [];
  
  // Group 1 Campaigns
  const group1Campaigns = [
    {
      id: 'campaign1-1',
      name: 'The Lord of the Rings',
      description: 'A journey to destroy the One Ring and save Middle-earth from Sauron.',
      groupId: groups.group1Id,
      createdAt: formattedDate,
      createdBy: dmUid,
      isActive: true
    },
    {
      id: 'campaign1-2',
      name: 'The Hobbit',
      description: 'An unexpected journey to reclaim the lost Dwarf Kingdom of Erebor.',
      groupId: groups.group1Id,
      createdAt: formattedDate,
      createdBy: dmUid,
      isActive: false
    }
  ];
  
  // Group 2 Campaigns
  const group2Campaigns = [
    {
      id: 'campaign2-1',
      name: 'The Silmarillion Chronicles',
      description: 'The ancient history of Middle-earth, from its creation to the First Age.',
      groupId: groups.group2Id,
      createdAt: formattedDate,
      createdBy: dmUid,
      isActive: true
    },
    {
      id: 'campaign2-2',
      name: 'Tales of the Dúnedain',
      description: 'Following the Rangers of the North and their struggles against the forces of darkness.',
      groupId: groups.group2Id,
      createdAt: formattedDate,
      createdBy: dmUid,
      isActive: false
    }
  ];
  
  // Create Group 1 Campaigns
  for (const campaign of group1Campaigns) {
    await setDoc(doc(db, 'groups', groups.group1Id, 'campaigns', campaign.id), campaign);
    console.log(`Created campaign for Group 1: ${campaign.name}`);
    allCampaigns.push(campaign);
  }
  
  // Create Group 2 Campaigns
  for (const campaign of group2Campaigns) {
    await setDoc(doc(db, 'groups', groups.group2Id, 'campaigns', campaign.id), campaign);
    console.log(`Created campaign for Group 2: ${campaign.name}`);
    allCampaigns.push(campaign);
  }
  
  return allCampaigns;
};