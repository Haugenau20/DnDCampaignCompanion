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
export { default as QuestDirectory } from './quests/components/QuestDirectory';
export { default as QuestCreateForm } from './quests/components/QuestCreateForm';
export { default as QuestEditForm } from './quests/components/QuestEditForm';
export { BasicInfoSection, ObjectivesSection, LeadsSection, KeyLocationsSection, ComplicationsSection, RewardsSection, RelatedNPCsSection } from './quests/components/QuestFormSections';
// Quest types
export type { Quest, QuestStatus, QuestObjective, QuestLocation, QuestNPC, QuestContextState, QuestContextValue } from './quests/types';

// Location context and hooks
export { LocationProvider, useLocations } from './locations/context/LocationContext';
export { useLocationData } from './locations/hooks/useLocationData';
// Components consumed by pages/locations/* and other external consumers
export { default as LocationCard } from './locations/components/LocationCard';
export { default as LocationCombobox } from './locations/components/LocationCombobox';
export { default as LocationCreateForm } from './locations/components/LocationCreateForm';
export { default as LocationDirectory } from './locations/components/LocationDirectory';
export { default as LocationEditForm } from './locations/components/LocationEditForm';
// Location types
export type { Location, LocationType, LocationStatus, LocationNote, LocationContextState, LocationContextValue } from './locations/types';

// Rumor context and hooks
export { RumorProvider, useRumors } from './rumors/context/RumorContext';
export { useRumorData } from './rumors/hooks/useRumorData';
// Components consumed by pages/rumors/* and other external consumers
export { default as RumorCard } from './rumors/components/RumorCard';
export { default as RumorForm } from './rumors/components/RumorForm';
export { default as RumorDirectory } from './rumors/components/RumorDirectory';
export { default as RumorBatchActions } from './rumors/components/RumorBatchActions';
export { default as CombineRumorsDialog } from './rumors/components/CombineRumorsDialog';
export { default as ConvertToQuestDialog } from './rumors/components/ConvertToQuestDialog';
// Rumor types
export type { Rumor, RumorStatus, SourceType, RumorNote, RumorContextState, RumorContextValue } from './rumors/types';
