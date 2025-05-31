// src/types/note.ts
import { BaseContent } from "./common";

/**
 * Entity types that can be extracted from notes
 */
export type EntityType = "npc" | "location" | "quest" | "rumor";

/**
 * Status of a note
 */
export type NoteStatus = "active" | "archived";

/**
 * Represents an entity extracted from a note
 */
export interface ExtractedEntity {
  /** Unique identifier for the entity */
  id: string;
  /** The text content of the entity as extracted from the note */
  text: string;
  /** The type of entity (npc, location, etc.) */
  type: EntityType;
  /** Confidence score from 0-1 of the extraction accuracy */
  confidence: number;
  /** Whether this entity has been converted to a campaign element */
  isConverted: boolean;
  /** ID of the created campaign element if converted */
  convertedToId?: string;
  /** Timestamp when the entity was extracted */
  createdAt: string;
  /** Additional data specific to the entity type */
  extraData?: {
    [key: string]: any;
  };
}

/**
 * Represents a user's note
 */
export interface Note extends BaseContent {
  /** Unique identifier for the note */
  id: string;
  /** Title of the note */
  title: string;
  /** Main content of the note */
  content: string;
  /** Entities extracted from the note content */
  extractedEntities: ExtractedEntity[];
  /** Current status of the note */
  status: NoteStatus;
  /** User-defined tags for organization */
  tags: string[];
  /** Last updated timestamp */
  updatedAt: string;

  campaignId: string;
}

/**
 * Context value provided by NoteContext
 */
export interface NoteContextValue {
  /** All user notes */
  notes: Note[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  
  /**
   * Get a note by its ID
   * @param id Note ID to find
   * @returns The note if found, otherwise undefined
   */
  getNoteById: (id: string) => Note | undefined;
  
  /**
   * Create a new note
   * @param title Title of the note
   * @param content Content of the note
   * @returns Promise resolving to the ID of the created note
   */
  createNote: (title: string, content: string) => Promise<string>;
  
  /**
   * Convert an extracted entity to a campaign element
   * Now navigates to the create page instead of creating directly
   * @param noteId ID of the note containing the entity
   * @param entityId ID of the entity to convert
   * @param type Type of entity to convert to
   * @returns Promise resolving to empty string (navigation instead of creation)
   */
  convertEntity: (noteId: string, entityId: string, type: EntityType) => Promise<string>;
  
  /**
   * Mark an entity as converted in the note
   * Called after successful creation of campaign element
   * @param noteId ID of the note
   * @param entityId ID of the entity to mark as converted
   * @param createdId ID of the created campaign element
   * @returns Promise resolving when update is complete
   */
  markEntityAsConverted: (noteId: string, entityId: string, createdId: string) => Promise<void>;
  
  /**
   * Update a note
   * @param noteId ID of the note to update
   * @param updateData Data to update on the note
   * @returns Promise resolving when update is complete
   */
  updateNote: (noteId: string, updateData: Partial<Note>) => Promise<void>;
  
  /**
   * Archive a note
   * @param noteId ID of the note to archive
   * @returns Promise resolving when archiving is complete
   */
  archiveNote: (noteId: string) => Promise<void>;
  
  /**
   * Delete a note
   * @param noteId ID of the note to delete
   * @returns Promise resolving when deletion is complete
   */
  deleteNote: (noteId: string) => Promise<void>;
}