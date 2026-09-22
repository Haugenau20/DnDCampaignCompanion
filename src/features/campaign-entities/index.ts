// src/features/campaign-entities/index.ts
export { NPCProvider, useNPCs } from './npcs/context/NPCContext';
export { useNPCData } from './npcs/hooks/useNPCData';
// Components consumed by pages/npcs/* and other external consumers
export { default as NPCDirectory } from './npcs/components/NPCDirectory';
export { default as NPCLegend } from './npcs/components/NPCLegend';
// NPC types
export type { NPC, NPCStatus, NPCRelationship, NPCNote, NPCConnections, NPCContextState, NPCContextValue } from './npcs/types';

/*
  The create and edit forms are gone (`15-8`). Every field of every entity is
  edited where it is read: `/quests/:id`, `/locations/:id`, `/npcs/:id` and a
  rumour's own row. `RumorForm` is the one that stays -- `/rumors/create` is
  where note conversion sends a rumour it extracted, with a title and a body
  already written, which a two-field composer cannot take.
*/

// Quest context and hooks
export { QuestProvider, useQuests } from './quests/context/QuestContext';
export { useQuestData } from './quests/hooks/useQuestData';
// Components consumed by pages/quests/* and other external consumers
export { default as QuestDirectory } from './quests/components/QuestDirectory';
export { default as QuestObjectives } from './quests/components/QuestObjectives';
export { default as DeleteQuestDialog } from './quests/components/DeleteQuestDialog';
// How a quest says what it is, shared by the row and the page.
export {
  QUEST_STATUS_OPTIONS,
  formatQuestStatus,
  moveObjective,
  objectiveProgressLabel,
  objectiveProgressOf,
  questMetaLine,
} from './quests/utils/quest-presentation';
export type { ObjectiveProgress } from './quests/utils/quest-presentation';
// Quest types
export type { Quest, QuestStatus, QuestObjective, QuestLocation, QuestContextState, QuestContextValue } from './quests/types';

// Location context and hooks
export { LocationProvider, useLocations } from './locations/context/LocationContext';
export { useLocationData } from './locations/hooks/useLocationData';
// Components consumed by pages/locations/* and other external consumers
export { default as LocationDirectory } from './locations/components/LocationDirectory';
export { default as WhereThisSits } from './locations/components/WhereThisSits';
export { default as DeleteLocationDialog } from './locations/components/DeleteLocationDialog';
// Location types
export type { Location, LocationType, LocationStatus, LocationNote, LocationChildStrategy, LocationContextState, LocationContextValue } from './locations/types';
// The shared answer to "what location is this entity at?" -- see #1412 for why
// an unresolved reference is shown as itself rather than prettified.
export { resolveLocationName, referencesLocation } from './locations/utils/location-display';
export type { LocationReference } from './locations/utils/location-display';
// Every walk over the tree, guarded. `15-4` makes cycles reachable, so nothing
// outside this module may hand-roll a parent or descendant walk.
export {
  ancestorPathOf,
  buildLocationIndex,
  childrenOf,
  descendantIdsOf,
  insideCountOf,
  invalidParentIdsFor,
  parentIdOf,
  pathLabelOf,
  wouldCreateCycle,
} from './locations/utils/location-tree';
export type { LocationIndex } from './locations/utils/location-tree';
// How a location says what it is, shared by the tree and the page.
export {
  formatLocationType,
  formatLocationStatus,
  locationMetaLine,
  KNOWLEDGE_OPTIONS,
  STATUS_ORDER,
  STATUS_TONE,
} from './locations/utils/location-presentation';

// Rumor context and hooks
export { RumorProvider, useRumors } from './rumors/context/RumorContext';
export { useRumorData } from './rumors/hooks/useRumorData';
// Components consumed by pages/rumors/* and other external consumers
export { default as RumorForm } from './rumors/components/RumorForm';
export { default as RumorDirectory } from './rumors/components/RumorDirectory';
export { default as RumorBatchActions } from './rumors/components/RumorBatchActions';
export { default as CombineRumorsDialog } from './rumors/components/CombineRumorsDialog';
export { default as ConvertToQuestDialog } from './rumors/components/ConvertToQuestDialog';
/*
  How a rumour is named, for the surfaces outside this domain that list one.
  A rumour's title is optional now -- the composer records what was heard and
  the name is derived from it -- so every consumer that prints `rumor.title`
  directly would print a blank for anything created since.
*/
export { rumorDisplayTitle, rumorTitleText, UNTITLED_RUMOR } from './rumors/utils/rumor-title';
// Rumor types
export type { Rumor, RumorStatus, SourceType, RumorNote, RumorContextState, RumorContextValue } from './rumors/types';
