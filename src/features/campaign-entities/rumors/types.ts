// src/features/campaign-entities/rumors/types.ts
import { BaseContent, DomainData, IdentifiableContent } from 'core/types/common';

export type RumorStatus = 'confirmed' | 'unconfirmed' | 'false';
export type SourceType = 'npc' | 'tavern' | 'notice' | 'traveler' | 'other';

/**
 * Represents a note added to a rumor
 * Extends BaseContent for consistency with other content types
 */
export interface RumorNote extends BaseContent {
  content: string;
}

/**
 * Represents a rumor in the game world
 */
export interface Rumor extends BaseContent {
  title: string;
  content: string;
  status: RumorStatus;
  /**
   * Where the rumour came from, or **absent because nobody has said**.
   *
   * Optional on purpose. The retired create form defaulted every rumour to
   * `'other'`, which made the row print "Other" for a record whose source had
   * never been discussed -- and left the editor showing no chip selected, so
   * the two contradicted each other. `'other'` is now a real answer meaning
   * "none of the other four", chosen deliberately; "nobody said" is this field
   * being missing, and the row prints an em dash for it.
   *
   * Records written before this change all carry `'other'` and cannot be told
   * apart from a deliberate choice, so they keep reading "Other" -- exactly
   * what they did before. There is no migration; the app reads the data it has.
   *
   * **`null`, not `undefined`, once a reader has cleared one.** This project
   * builds Firestore with a bare `getFirestore()` and no
   * `ignoreUndefinedProperties`, so an update carrying `undefined` throws
   * rather than clearing the field -- which is why `sourceNpcId` next door is
   * written as `''`. A rumour created without a source simply omits the key;
   * one whose source is un-picked stores `null`. Every reader tests
   * falsiness, so the three absences behave identically.
   */
  sourceType?: SourceType | null;
  sourceName: string;
  sourceNpcId?: string; // Optional reference to NPC if source is an NPC
  /**
   * See the `location`/`locationId` contract documented on `NPC.location` in
   * `features/campaign-entities/npcs/types.ts` -- shared verbatim here.
   */
  location?: string;
  /** See the `location`/`locationId` contract documented on `NPC.location`. */
  locationId?: string; // Optional reference to location in system
  relatedNPCs: string[]; // Array of NPC IDs
  relatedLocations: string[]; // Array of location IDs
  notes: RumorNote[];
  convertedToQuestId?: string; // If rumor was converted to quest
}

// Context types
export interface RumorContextState {
  rumors: Rumor[];
  isLoading: boolean;
  error: string | null;
}

export interface RumorContextValue extends RumorContextState {
  getRumorById: (id: string) => Rumor | undefined;
  getRumorsByStatus: (status: RumorStatus) => Rumor[];
  getRumorsByLocation: (locationId: string) => Rumor[];
  getRumorsByNPC: (npcId: string) => Rumor[];
  updateRumorStatus: (rumorId: string, status: RumorStatus) => Promise<void>;
  updateRumorNote: (rumorId: string, note: DomainData<RumorNote> & IdentifiableContent) => Promise<void>;
  addRumor: (rumor: DomainData<Rumor>) => Promise<string>;
  updateRumor: (rumor: Rumor) => Promise<void>;
  deleteRumor: (rumorId: string) => Promise<void>;
  combineRumors: (rumorIds: string[], newRumor: Partial<Rumor>) => Promise<string>;
  convertToQuest: (rumorIds: string[], questData: any) => Promise<string>;
}