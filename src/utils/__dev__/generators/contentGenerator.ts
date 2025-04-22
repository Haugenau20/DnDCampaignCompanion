// src/utils/__dev__/generators/contentGenerator.ts

import { doc, setDoc } from 'firebase/firestore';
import { UserMapping } from './userGenerator';
import { createChapters } from './contentGenerators/chapterGenerator';
import { createNPCs } from './contentGenerators/npcGenerator';
import { createQuests } from './contentGenerators/questGenerator';
import { createRumors } from './contentGenerators/rumorGenerator';
import { createSaga } from './contentGenerators/sagaGenerator';
import { createLocations } from './contentGenerators/locationGenerator';

// Generate all content for a campaign
export const generateContentForCampaign = async (
  db: any,
  groupId: string,
  campaignId: string,
  userMapping: UserMapping,
  formattedDate: string
) => {
  console.log(`Generating content for campaign ${campaignId} in group ${groupId}...`);
  
  // Create chapters
  await createChapters(db, groupId, campaignId, userMapping, formattedDate);
  
  // Create locations
  await createLocations(db, groupId, campaignId, userMapping, formattedDate);
  
  // Create NPCs
  await createNPCs(db, groupId, campaignId, userMapping, formattedDate);
  
  // Create quests
  await createQuests(db, groupId, campaignId, userMapping, formattedDate);
  
  // Create rumors
  await createRumors(db, groupId, campaignId, userMapping, formattedDate);
  
  // Create saga
  await createSaga(db, groupId, campaignId, userMapping, formattedDate);
  
  console.log(`Content generation complete for campaign ${campaignId} in group ${groupId}`);
};