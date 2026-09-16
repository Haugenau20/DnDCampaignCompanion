// src/features/campaign-entities/npcs/types.ts
import { BaseContent, DomainData } from 'core/types/common';
import { Location } from '../locations/types';

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
  /**
   * Who wrote it -- the acting character's name, or their username when they
   * have no character.
   *
   * Optional because every note written before this field existed has no
   * author and never will. Those render without one rather than being
   * attributed to a guess: the record's creator is not necessarily the person
   * who wrote any given note, and inventing that would be showing data that
   * does not exist.
   */
  author?: string;
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
  /**
   * How an entity's location is stored, and how it should be read. This
   * comment is the single source of truth for the contract; `Quest.locationId`/
   * `Quest.location` and `Rumor.locationId`/`Rumor.location` share it verbatim
   * rather than repeating it.
   *
   * `locationId` is the canonical reference to a Location record and wins
   * whenever it is set and resolves. `location` is free text, used when no
   * Location record was selected (a player may legitimately write "somewhere
   * in Mirkwood"). It is also written alongside `locationId` as a
   * human-readable convenience, but is never authoritative.
   *
   * Documents predating this contract have no `locationId`; their `location`
   * may hold either an id or a name, which is why the resolver
   * (`resolveLocationName` in
   * `features/campaign-entities/locations/utils/location-display.ts`) still
   * accepts both.
   */
  location?: string;
  /** See the `location`/`locationId` contract documented on `location` above. */
  locationId?: string;
  relationship: NPCRelationship;
  description: string;
  appearance?: string;
  personality?: string;
  background?: string;
  connections: NPCConnections;
  notes: NPCNote[];
  /** Free-text labels for grouping, the same shape `Location.tags` uses. */
  tags?: string[];
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
  getNPCsByLocation: (location: Location) => NPC[];
  getNPCsByRelationship: (relationship: NPCRelationship) => NPC[];
  updateNPCNote: (npcId: string, note: NPCNote) => void;
  updateNPCRelationship: (npcId: string, relationship: NPCRelationship) => void;
  addNPC: (npc: DomainData<NPC>) => Promise<string>;
  updateNPC: (npc: NPC) => Promise<void>;
  deleteNPC: (npcId: string) => Promise<void>;
}