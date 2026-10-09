// src/features/storytelling/chapters/types.ts
import { BaseContent } from 'core/types/common';

/**
 * Represents a single chapter in the story
 */
export interface Chapter extends BaseContent {
  /** Chapter title */
  title: string;
  /**
   * The chapter's text as stored on the chapter itself: by chapters written
   * before T134, or by a browser still on the app before it. Since T134 the
   * text is a document of its own (`chapter-body.ts`), and saving it there
   * sets this to `null`. Read it through `useChapterContent`.
   */
  content?: string | null;
  /** How long the text is, so the shelf can size the book without it (T134). */
  contentLength?: number;
  /** Chapter order number (for sequencing) */
  order: number;
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
  /** Delete several chapters and renumber the rest, as one batch (T017). */
  deleteChapters: (ids: string[]) => Promise<void>;
  /** Retry after a failed load: reopens the listener if it failed (T032). Writes never need it. */
  refreshChapters: () => Promise<Chapter[]>;
  setCurrentChapter: (chapter: Chapter) => void;
  hasRequiredContext: boolean;
}