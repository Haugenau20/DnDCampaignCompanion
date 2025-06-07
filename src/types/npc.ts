// src/types/npc.ts
import { Entity, DomainData, EntityContextValue } from './common';

export type NPCStatus = 'alive' | 'deceased' | 'missing' | 'unknown';
export type NPCRelationship = 'friendly' | 'neutral' | 'hostile' | 'unknown';

export interface NPCConnections {
  relatedNPCs: string[];
  affiliations: string[];
  relatedQuests: string[];
}

export interface NPCNote {
  date: string;
  text: string;
}

/**
 * Domain data for NPCs - this is what forms collect and submit
 * No system metadata, no ID - pure domain information only
 */
export interface NPCDomainData {
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

/**
 * Complete NPC entity with system metadata
 * This is what contexts store and manage
 */
export interface NPC extends Entity<NPCDomainData> {
  // Explicit domain data properties for TypeScript
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

/**
 * Type alias for clean form data
 */
export type NPCFormData = DomainData<NPC>;

/**
 * Complete NPC context value (hybrid legacy/new implementation)
 * TODO: Standardize fully in Phase 4
 */
export interface NPCContextValue {
  // Legacy state structure for compatibility
  npcs: NPC[];
  isLoading: boolean;
  error: string | null;

  // Legacy methods for compatibility
  getNPCById: (id: string) => NPC | undefined;
  addNPC: (data: NPCFormData) => Promise<NPC>;
  updateNPC: (id: string, data: NPCFormData) => Promise<NPC>;
  deleteNPC: (id: string) => Promise<void>;
  updateNPCNote: (npcId: string, note: NPCNote) => Promise<void>;
  updateNPCRelationship: (npcId: string, relationship: NPCRelationship) => Promise<void>;
  getNPCsByQuest: (questId: string) => NPC[];
  getNPCsByLocation: (location: string) => NPC[];
  getNPCsByRelationship: (relationship: NPCRelationship) => NPC[];

  // New standardized methods (for future migration)
  items: NPC[];
  create: (data: NPCFormData) => Promise<NPC>;
  update: (id: string, data: NPCFormData) => Promise<NPC>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => NPC | undefined;
  refresh: () => Promise<void>;
  getByQuest: (questId: string) => NPC[];
  getByLocation: (location: string) => NPC[];
  getByRelationship: (relationship: NPCRelationship) => NPC[];
  updateNote: (npcId: string, note: NPCNote) => Promise<void>;
  updateRelationship: (npcId: string, relationship: NPCRelationship) => Promise<void>;
}