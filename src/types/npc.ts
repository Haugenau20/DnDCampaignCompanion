// src/types/npc.ts
import { ContentAttribution, BaseContent } from './common';

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

/**
 * Represents an NPC in the game world
 */
export interface NPC extends BaseContent {
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