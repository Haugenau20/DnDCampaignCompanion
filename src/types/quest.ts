// types/quest.ts
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

export interface Quest {
  id: string;
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
  location?: string;
  levelRange?: string;
  dateAdded?: string;
  dateCompleted?: string;
  // Attribution fields
  createdBy?: string; // User UID
  createdByUsername?: string; // Character name or username
  modifiedBy?: string; // User UID of last modifier
  modifiedByUsername?: string; // Character name or username of modifier
  dateModified?: string; // Date of last modification
}