// src/features/campaign-entities/locations/types.ts
import { BaseContent, DomainData } from 'core/types/common';
import { StoredImage } from 'core/types/storedImage';

/**
 * Types of locations that can exist in the game world
 */
export type LocationType = 
  | 'region'
  | 'city'
  | 'town'
  | 'village'
  | 'dungeon'
  | 'landmark'
  | 'building'
  | 'poi';

/**
 * Current status of a location
 */
export type LocationStatus =
  | 'known'
  | 'explored'
  | 'visited';

/**
 * Represents a location in the game world
 */
export interface Location extends BaseContent {
  /** Name of the location */
  name: string;
  /** Type of location */
  type: LocationType;
  /** Discovery status */
  status: LocationStatus;
  /** Detailed description */
  description: string;
  /** Parent location ID (for nested locations) */
  parentId?: string;
  /** Notable features of the location */
  features?: string[];
  /** Connected NPCs */
  connectedNPCs?: string[];
  /** Associated quests */
  relatedQuests?: string[];
  /** Session notes and updates */
  notes?: LocationNote[];
  /** Tags for organization */
  tags?: string[];
  /** Last session visited */
  lastVisited?: string;
  /** A picture of the place, if one was added */
  image?: StoredImage;
}

/**
 * Note for a location
 */
export interface LocationNote {
  /**
   * `YYYY-MM-DD`, written by `toNoteDate`. Notes stored before that was agreed
   * may hold a full ISO timestamp instead; they are left as they are, and
   * `formatNoteDate` renders both.
   */
  date: string;
  text: string;
  /**
   * Who wrote it -- the acting character's name, or their username when they
   * have no character.
   *
   * Optional, and for the same reason `NPCNote.author` is: every note written
   * before this field existed has none and never will. Those render without an
   * author rather than being attributed to a guess -- the record's creator is
   * not necessarily the person who wrote any given note.
   *
   * This is the one place §8 allows a per-entry credit, because a note really
   * does carry its own author and date. Nothing else on the page may.
   */
  author?: string;
}

/**
 * Context state for locations
 */
export interface LocationContextState {
  locations: Location[];
  isLoading: boolean;
  error: string | null;
}

/**
 * What happens to the places inside a location when it is deleted.
 *
 * `00-entity-authoring.md` §6.2: deleting a parent must ask, and never orphan.
 * There is no default worth having -- both outcomes are reasonable and only the
 * person deleting knows which they mean -- so the caller states one and
 * `deleteLocation` keeps today's subtree delete only for the callers that
 * predate the question.
 */
export type LocationChildStrategy = 'delete-subtree' | 'promote-to-grandparent';

/**
 * Context value including state and methods
 */
export interface LocationContextValue extends LocationContextState {
  getLocationById: (id: string) => Location | undefined;
  getLocationsByType: (type: LocationType) => Location[];
  getLocationsByStatus: (status: LocationStatus) => Location[];
  getChildLocations: (parentId: string) => Location[];
  getParentLocation: (locationId: string) => Location | undefined;
  updateLocation: (locationId: string, updatedLocation: Partial<Location>) => Promise<void>;
  updateLocationNote: (locationId: string, note: LocationNote) => Promise<void>;
  updateLocationStatus: (locationId: string, status: LocationStatus) => Promise<void>;
  /**
   * Move a location under a new parent, or to the top level with `undefined`.
   *
   * Rejects rather than writing when the move would close a cycle. The tray
   * that offers parents already excludes self and every descendant, so this is
   * the second line: a cycle written once poisons every walk over that
   * campaign's data, for everyone.
   */
  moveLocation: (locationId: string, nextParentId: string | undefined) => Promise<void>;
  deleteLocation: (locationId: string, childStrategy?: LocationChildStrategy) => Promise<void>;
  createLocation: (locationData: DomainData<Location>) => Promise<string>;
  refreshLocations: () => Promise<Location[]>;
  hasRequiredContext: boolean;
}