// src/types/rumor.ts
import { Entity, DomainData, EntityContextValue } from './common';

export type RumorStatus = 'confirmed' | 'unconfirmed' | 'false';
export type SourceType = 'npc' | 'tavern' | 'notice' | 'traveler' | 'other';

/**
 * Represents a note added to a rumor
 */
export interface RumorNoteDomainData {
  content: string;
}

/**
 * Complete rumor note entity with system metadata
 */
export interface RumorNote extends Entity<RumorNoteDomainData> {
  // Explicit domain data properties for TypeScript
  content: string;
}

/**
 * Domain data for Rumors - this is what forms collect and submit
 * No system metadata, no ID - pure domain information only
 */
export interface RumorDomainData {
  title: string;
  content: string;
  status: RumorStatus;
  sourceType: SourceType;
  sourceName: string;
  sourceNpcId?: string;
  location?: string;
  locationId?: string;
  relatedNPCs: string[];
  relatedLocations: string[];
  notes: RumorNote[];
  convertedToQuestId?: string;
}

/**
 * Complete Rumor entity with system metadata
 * This is what contexts store and manage
 */
export interface Rumor extends Entity<RumorDomainData> {
  // Explicit domain data properties for TypeScript
  title: string;
  content: string;
  status: RumorStatus;
  sourceType: SourceType;
  sourceName: string;
  sourceNpcId?: string;
  location?: string;
  locationId?: string;
  relatedNPCs: string[];
  relatedLocations: string[];
  notes: RumorNote[];
  convertedToQuestId?: string;
}

/**
 * Type alias for clean form data
 */
export type RumorFormData = DomainData<Rumor>;

/**
 * Complete Rumor context value (legacy implementation)
 * TODO: Update to standardized pattern in Phase 4
 */
export interface RumorContextValue {
  // Legacy state structure
  rumors: Rumor[];
  isLoading: boolean;
  error: string | null;

  // Legacy methods (to be standardized)
  getRumorById: (id: string) => Rumor | undefined;
  getRumorsByStatus: (status: RumorStatus) => Rumor[];
  getRumorsByLocation: (locationId: string) => Rumor[];
  getRumorsByNPC: (npcId: string) => Rumor[];
  updateRumorStatus: (rumorId: string, status: RumorStatus) => Promise<void>;
  updateRumorNote: (rumorId: string, note: RumorNote) => Promise<void>;
  addRumor: (rumorData: Omit<Rumor, 'id'>) => Promise<string>;
  updateRumor: (rumor: Rumor) => Promise<void>;
  deleteRumor: (rumorId: string) => Promise<void>;
  combineRumors: (rumorIds: string[], newRumorData: Partial<Rumor>) => Promise<string>;
  convertToQuest: (rumorIds: string[], questData: any) => Promise<string>;
}