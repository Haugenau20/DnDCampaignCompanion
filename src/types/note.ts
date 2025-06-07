// src/types/note.ts
import { Entity, DomainData, EntityContextValue } from './common';

/**
 * Entity types that can be extracted from notes
 */
export type EntityType = "npc" | "location" | "quest" | "rumor";

/**
 * Status of a note
 */
export type NoteStatus = "active" | "archived";

/**
 * Domain data for ExtractedEntity - pure domain information
 */
export interface ExtractedEntityDomainData {
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
  /** Additional data specific to the entity type */
  extraData?: {
    [key: string]: any;
  };
}

/**
 * Complete ExtractedEntity with system metadata
 */
export interface ExtractedEntity extends Entity<ExtractedEntityDomainData> {
  // Explicit domain data properties for TypeScript
  text: string;
  type: EntityType;
  confidence: number;
  isConverted: boolean;
  convertedToId?: string;
  extraData?: {
    [key: string]: any;
  };
}

/**
 * Domain data for Notes - this is what forms collect and submit
 * No system metadata, no ID - pure domain information only
 */
export interface NoteDomainData {
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
  /** Campaign ID this note belongs to */
  campaignId: string;
  /** Whether this note exists only locally and hasn't been saved to Firebase yet */
  isUnsaved?: boolean;
}

/**
 * Complete Note entity with system metadata
 * This is what contexts store and manage
 */
export interface Note extends Entity<NoteDomainData> {
  // Explicit domain data properties for TypeScript
  title: string;
  content: string;
  extractedEntities: ExtractedEntity[];
  status: NoteStatus;
  tags: string[];
  campaignId: string;
  isUnsaved?: boolean;
}

/**
 * Type alias for clean form data
 */
export type NoteFormData = DomainData<Note>;

/**
 * Complete Note context value (current implementation)
 * TODO: Standardize to new pattern in Phase 4
 */
export interface NoteContextValue {
  // Current state structure
  notes: Note[];
  isLoading: boolean;
  error: string | null;

  // Current methods (legacy naming)
  getNoteById: (noteId: string) => Note | undefined;
  createNote: (title: string, content: string) => Promise<string>;
  saveNote: (noteId: string, updates?: Partial<Note>) => Promise<void>;
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  convertEntity: (noteId: string, entityId: string, type: EntityType) => Promise<string>;
  markEntityAsConverted: (noteId: string, entityId: string, createdId: string) => Promise<void>;
  archiveNote: (noteId: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}