// src/types/common.ts

/**
 * Standard attribution metadata for all content items
 * This ensures consistent attribution across all content types
 */
export interface ContentAttribution {
  /** User ID who created the item */
  createdBy: string;
  /** Username who created the item */
  createdByUsername: string;
  /** Character ID active when item was created */
  createdByCharacterId?: string | null;
  /** Character name active when item was created */
  createdByCharacterName?: string | null;
  /** Date item was created */
  dateAdded: string;
  
  /** User ID who last modified the item (optional) */
  modifiedBy?: string;
  /** Username who last modified the item (optional) */
  modifiedByUsername?: string;
  /** Character ID active when item was modified (optional) */
  modifiedByCharacterId?: string | null;
  /** Character name active when item was modified (optional) */
  modifiedByCharacterName?: string | null;
  /** Date item was last modified (optional) */
  dateModified?: string;
}

/**
 * Content item with an ID
 */
export interface IdentifiableContent {
  /** Unique identifier for the item */
  id: string;
}

/**
 * Base content item with ID and attribution
 */
export interface BaseContent extends IdentifiableContent, ContentAttribution {
  // Base fields for all content types
}

/**
 * Generic context state structure for content types
 */
export interface ContentContextState<T> {
  /** Array of content items */
  items: T[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}