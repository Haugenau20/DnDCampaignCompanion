// src/types/story.ts
import { Entity, DomainData, EntityContextValue } from './common';

/**
 * Domain data for Chapters - this is what forms collect and submit
 * No system metadata, no ID - pure domain information only
 */
export interface ChapterDomainData {
  /** Chapter title */
  title: string;
  /** Main content of the chapter */
  content: string;
  /** Chapter order number (for sequencing) */
  order: number;
  /** Optional sub-chapters or sections */
  subChapters?: Chapter[];
  /** Optional chapter summary */
  summary?: string;
}

/**
 * Complete Chapter entity with system metadata
 * This is what contexts store and manage
 */
export interface Chapter extends Entity<ChapterDomainData> {
  // Explicit domain data properties for TypeScript
  title: string;
  content: string;
  order: number;
  subChapters?: Chapter[];
  summary?: string;
}

/**
 * Type alias for clean form data
 */
export type ChapterFormData = DomainData<Chapter>;

/**
 * Tracks reading progress for a specific chapter
 */
export interface ChapterProgress {
  /** Chapter identifier */
  chapterId: string;
  /** Last read position (e.g., paragraph or section) */
  lastPosition: number;
  /** Whether the chapter has been completed */
  isComplete: boolean;
  /** Last read timestamp */
  lastRead: Date;
}

/**
 * Overall story progress tracking
 */
export interface StoryProgress {
  /** Currently selected chapter */
  currentChapter: string;
  /** Timestamp of last reading session */
  lastRead: Date;
  /** Collection of progress for each chapter */
  chapterProgress: Record<string, ChapterProgress>;
}

/**
 * Extended context methods specific to Chapters/Story
 */
export interface StoryContextMethods {
  /** Get next chapter by order */
  getNextChapter: (currentId: string) => Chapter | undefined;
  /** Get previous chapter by order */
  getPreviousChapter: (currentId: string) => Chapter | undefined;
  /** Set current chapter for reading */
  setCurrentChapter: (chapter: Chapter) => void;
  /** Check if has required context */
  hasRequiredContext: boolean;
}

/**
 * Extended state for story context
 */
export interface StoryContextState {
  /** Array of chapters */
  items: Chapter[];
  /** Current chapter being read */
  currentChapter: Chapter | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Complete Story context value
 */
export interface StoryContextValue extends StoryContextState, StoryContextMethods {
  /** Create a new chapter from clean domain data */
  create: (data: ChapterFormData) => Promise<Chapter>;
  /** Update a chapter with clean domain data */
  update: (id: string, data: ChapterFormData) => Promise<Chapter>;
  /** Delete a chapter */
  delete: (id: string) => Promise<void>;
  /** Get chapter by ID */
  getById: (id: string) => Chapter | undefined;
  /** Refresh chapters from backend */
  refresh: () => Promise<void>;

  // Legacy compatibility properties
  chapters: Chapter[];
  getChapterById: (id: string) => Chapter | undefined;
  deleteChapter: (id: string) => Promise<void>;
  storyProgress: StoryProgress;
  updateChapterProgress: (chapterId: string, progress: Partial<ChapterProgress>) => Promise<void>;
  updateCurrentChapter: (chapter: Chapter) => void;
}