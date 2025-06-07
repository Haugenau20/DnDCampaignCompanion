// src/types/quest.ts
import { Entity, DomainData, EntityContextValue } from './common';

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
 * Domain data for Quests - this is what forms collect and submit
 * No system metadata, no ID - pure domain information only
 */
export interface QuestDomainData {
  title: string;
  description: string;
  status: QuestStatus;
  background?: string;
  objectives: QuestObjective[];
  leads?: string[];
  keyLocations?: QuestLocation[];
  importantNPCs?: QuestNPC[];
  relatedNPCIds?: string[];
  complications?: string[];
  rewards?: string[];
  location?: string;
  levelRange?: string;
  dateCompleted?: string;
}

/**
 * Complete Quest entity with system metadata
 * This is what contexts store and manage
 */
export interface Quest extends Entity<QuestDomainData> {
  // Explicit domain data properties for TypeScript
  title: string;
  description: string;
  status: QuestStatus;
  background?: string;
  objectives: QuestObjective[];
  leads?: string[];
  keyLocations?: QuestLocation[];
  importantNPCs?: QuestNPC[];
  relatedNPCIds?: string[];
  complications?: string[];
  rewards?: string[];
  location?: string;
  levelRange?: string;
  dateCompleted?: string;
}

/**
 * Type alias for clean form data
 */
export type QuestFormData = DomainData<Quest>;

/**
 * Complete Quest context value (hybrid legacy/new implementation)
 * TODO: Standardize fully in Phase 4
 */
export interface QuestContextValue {
  // Legacy state structure for compatibility
  quests: Quest[];
  isLoading: boolean;
  error: string | null;

  // Legacy methods for compatibility
  getQuestById: (id: string) => Quest | undefined;
  addQuest: (data: QuestFormData) => Promise<Quest>;
  updateQuest: (id: string, data: QuestFormData) => Promise<Quest>;
  deleteQuest: (id: string) => Promise<void>;
  getQuestsByStatus: (status: QuestStatus) => Quest[];
  getQuestsByLocation: (location: string) => Quest[];
  updateQuestStatus: (questId: string, status: QuestStatus) => Promise<void>;
  updateQuestObjective: (questId: string, objectiveId: string, completed: boolean) => Promise<void>;

  // New standardized methods (for future migration)
  items: Quest[];
  create: (data: QuestFormData) => Promise<Quest>;
  update: (id: string, data: QuestFormData) => Promise<Quest>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Quest | undefined;
  refresh: () => Promise<void>;
  getByStatus: (status: QuestStatus) => Quest[];
  getByLocation: (location: string) => Quest[];
  updateStatus: (questId: string, status: QuestStatus) => Promise<void>;
  updateObjective: (questId: string, objectiveId: string, completed: boolean) => Promise<void>;
}