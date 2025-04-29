// src/types/location.ts
import { BaseContent } from './common';

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
}

/**
 * Note for a location
 */
export interface LocationNote {
  date: string;
  text: string;
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
  deleteLocation: (locationId: string) => Promise<void>;
  createLocation: (locationData: Omit<Location, 'id'>) => Promise<string>;
  refreshLocations: () => Promise<Location[]>;
  hasRequiredContext: boolean;
}