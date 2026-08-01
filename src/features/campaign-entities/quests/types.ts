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

export interface QuestNPC {
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
  importantNPCs?: QuestNPC[];
  relatedNPCIds?: string[];  // References to NPCs in the NPC directory
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
  updateQuestStatus: (questId: string, status: QuestStatus) => Promise<void>;
  updateQuestObjective: (questId: string, objectiveId: string, completed: boolean) => Promise<void>;
  addQuest: (quest: DomainData<Quest>) => Promise<string>;
  updateQuest: (quest: Quest) => Promise<void>;
  deleteQuest: (questId: string) => Promise<void>;
}