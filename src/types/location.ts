// src/types/location.ts
import { Entity, DomainData, EntityContextValue } from './common';

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
 * Note for a location
 */
export interface LocationNote {
  date: string;
  text: string;
}

/**
 * Domain data for Locations - this is what forms collect and submit
 * No system metadata, no ID - pure domain information only
 */
export interface LocationDomainData {
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
 * Complete Location entity with system metadata
 * This is what contexts store and manage
 */
export interface Location extends Entity<LocationDomainData> {
  // Explicit domain data properties for TypeScript
  name: string;
  type: LocationType;
  status: LocationStatus;
  description: string;
  parentId?: string;
  features?: string[];
  connectedNPCs?: string[];
  relatedQuests?: string[];
  notes?: LocationNote[];
  tags?: string[];
  lastVisited?: string;
}

/**
 * Type alias for clean form data
 */
export type LocationFormData = DomainData<Location>;

/**
 * Complete Location context value (legacy implementation)
 * TODO: Update to standardized pattern in Phase 4
 */
export interface LocationContextValue {
  // Legacy state structure
  locations: Location[];
  isLoading: boolean;
  error: string | null;
  hasRequiredContext: boolean;

  // Legacy methods (to be standardized)
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
  refreshLocations: () => Promise<void>;
}