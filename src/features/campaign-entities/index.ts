// src/features/campaign-entities/index.ts
export { NPCProvider, useNPCs } from './npcs/context/NPCContext';
export { useNPCData } from './npcs/hooks/useNPCData';
// Components consumed by pages/npcs/* and other external consumers
export { default as NPCDirectory } from './npcs/components/NPCDirectory';
export { default as NPCEditForm } from './npcs/components/NPCEditForm';
export { default as NPCForm } from './npcs/components/NPCForm';
export { default as NPCCard } from './npcs/components/NPCCard';
export { default as NPCLegend } from './npcs/components/NPCLegend';
// NPC types
export type { NPC, NPCStatus, NPCRelationship, NPCNote, NPCConnections, NPCContextState, NPCContextValue } from './npcs/types';

// Quest context and hooks
export { QuestProvider, useQuests } from './quests/context/QuestContext';
export { useQuestData } from './quests/hooks/useQuestData';
// Components consumed by pages/quests/* and other external consumers
export { default as QuestCard } from './quests/components/QuestCard';
export { default as QuestCreateForm } from './quests/components/QuestCreateForm';
export { default as QuestEditForm } from './quests/components/QuestEditForm';
export { BasicInfoSection, ObjectivesSection, LeadsSection, KeyLocationsSection, ComplicationsSection, RewardsSection, RelatedNPCsSection } from './quests/components/QuestFormSections';
// Quest types
export type { Quest, QuestStatus, QuestObjective, QuestLocation, QuestNPC, QuestContextState, QuestContextValue } from './quests/types';
