// src/types/story.ts
import { BaseContent } from './common';

/**
 * Represents a single chapter in the story
 */
export interface Chapter extends BaseContent {
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

// Context types
export interface StoryContextState {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  isLoading: boolean;
  error: string | null;
}

export interface StoryContextValue extends StoryContextState {
  getChapterById: (id: string) => Chapter | undefined;
  getNextChapter: (currentId: string) => Chapter | undefined;
  getPreviousChapter: (currentId: string) => Chapter | undefined;
  addChapter: (chapter: Omit<Chapter, 'id'>) => Promise<string>;
  updateChapter: (id: string, updates: Partial<Chapter>) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
  refreshChapters: () => Promise<Chapter[]>;
  setCurrentChapter: (chapter: Chapter) => void;
  hasRequiredContext: boolean;
}