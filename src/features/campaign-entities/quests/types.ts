// src/features/campaign-entities/quests/types.ts
import { BaseContent, DomainData } from 'core/types/common';
import { Location } from '../locations/types';

export type QuestStatus = 'active' | 'completed' | 'failed';

export interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface QuestLocation {
  name: string;
  description: string;
}

/**
 * Represents a quest in the game world
 */
export interface Quest extends BaseContent {
  title: string;
  description: string;
  status: QuestStatus;
  background?: string;
  objectives: QuestObjective[];
  leads?: string[];
  keyLocations?: QuestLocation[];
  /**
   * The quest's people, as ids into the NPC directory.
   *
   * The one relation list (`D15.7`). A second field -- `importantNPCs`, free
   * text `{name, description}` -- used to sit beside this one and was rendered
   * beside it too, which is why Thorin and Smaug appeared twice on the same
   * quest card. `15-5` deleted it: two fields for one relationship cannot be
   * kept in agreement, and only this one can be resolved to a record, a page
   * and an occupation.
   *
   * Documents written before that keep whatever `importantNPCs` they carry --
   * every write goes through `updateDoc`, which merges field by field and
   * never removes one. `src/utils/__dev__/auditQuestImportantNPCs.ts` reports
   * any name in it that this list does not already name.
   */
  relatedNPCIds?: string[];
  complications?: string[];
  rewards?: string[];
  /**
   * See the `location`/`locationId` contract documented on `NPC.location` in
   * `features/campaign-entities/npcs/types.ts` -- shared verbatim here.
   */
  location?: string;
  /** See the `location`/`locationId` contract documented on `NPC.location`. */
  locationId?: string;
  levelRange?: string;
  dateCompleted?: string;
}

// Context types
export interface QuestContextState {
  quests: Quest[];
  isLoading: boolean;
  error: string | null;
}

export interface QuestContextValue extends QuestContextState {
  getQuestById: (id: string) => Quest | undefined;
  getQuestsByStatus: (status: QuestStatus) => Quest[];
  getQuestsByLocation: (location: Location) => Quest[];
  getQuestsByNPC: (npcId: string) => Quest[];
  updateQuestStatus: (questId: string, status: QuestStatus) => Promise<void>;
  updateQuestObjective: (questId: string, objectiveId: string, completed: boolean) => Promise<void>;
  addQuestObjective: (questId: string, description: string) => Promise<void>;
  editQuestObjective: (questId: string, objectiveId: string, description: string) => Promise<void>;
  moveQuestObjective: (questId: string, objectiveId: string, direction: 'up' | 'down') => Promise<void>;
  addQuest: (quest: DomainData<Quest>) => Promise<string>;
  updateQuest: (quest: Quest) => Promise<void>;
  deleteQuest: (questId: string) => Promise<void>;
  markQuestCompleted: (questId: string, dateCompleted?: string) => Promise<void>;
  markQuestFailed: (questId: string) => Promise<void>;
  /**
   * Re-read the quest collection.
   *
   * Resolves once the refresh completes. Unlike `useQuestData().refreshQuests`
   * (which is `fetchQuests` and resolves to the refreshed array), the provider
   * wraps it in a callback that awaits the fetch and returns nothing, so this
   * is `Promise<void>` rather than `Promise<Quest[]>` -- verified against the
   * `const value` object the provider actually returns.
   */
  refreshQuests: () => Promise<void>;
  /** Whether a group and a campaign are both selected. */
  hasRequiredContext: boolean;
}
