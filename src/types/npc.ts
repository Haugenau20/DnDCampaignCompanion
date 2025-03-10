// types/npc.ts

export type NPCStatus = 'alive' | 'deceased' | 'missing' | 'unknown';
export type NPCRelationship = 'friendly' | 'neutral' | 'hostile' | 'unknown';

interface NPCConnections {
  relatedNPCs: string[];
  affiliations: string[];
  relatedQuests: string[];
}

export interface NPCNote {
  date: string;
  text: string;
}

export interface NPC {
  id: string;
  name: string;
  title?: string;
  status: NPCStatus;
  race?: string;
  occupation?: string;
  location?: string;
  relationship: NPCRelationship;
  description: string;
  appearance?: string;
  personality?: string;
  background?: string;
  connections: NPCConnections;
  notes: NPCNote[];
  // Attribution fields
  createdBy?: string; // User UID
  createdByUsername?: string; // Character name or username
  modifiedBy?: string; // User UID of last modifier
  modifiedByUsername?: string; // Character name or username of modifier
  dateAdded?: string; // Date of creation
  dateModified?: string; // Date of last modification
}

// Context types
export interface NPCContextState {
  npcs: NPC[];
  isLoading: boolean;
  error: string | null;
}

export interface NPCContextValue extends NPCContextState {
  getNPCById: (id: string) => NPC | undefined;
  getNPCsByQuest: (questId: string) => NPC[];
  getNPCsByLocation: (location: string) => NPC[];
  getNPCsByRelationship: (relationship: NPCRelationship) => NPC[];
  updateNPCNote: (npcId: string, note: NPCNote) => void;
  updateNPCRelationship: (npcId: string, relationship: NPCRelationship) => void;
}