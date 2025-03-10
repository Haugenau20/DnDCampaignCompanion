// types/story.ts

/**
 * Represents a single chapter in the story
 */
export interface Chapter {
    /** Unique identifier for the chapter */
    id: string;
    /** Chapter title */
    title: string;
    /** Main content of the chapter */
    content: string;
    /** Chapter order number (for sequencing) */
    order: number;
    /** Optional sub-chapters or sections */
    subChapters?: Chapter[];
    /** Optional last modified date */
    lastModified?: Date;
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
  
  /**
   * Table of contents structure
   */
  export interface TableOfContents {
    /** List of all chapters */
    chapters: Chapter[];
    /** Currently selected chapter */
    currentChapter?: string;
    /** Total number of chapters */
    totalChapters: number;
  }
  
  /**
   * Story navigation state
   */
  export interface StoryNavigation {
    /** Current chapter ID */
    currentChapterId: string;
    /** Previous chapter ID */
    previousChapterId?: string;
    /** Next chapter ID */
    nextChapterId?: string;
    /** Current position in the chapter */
    position: number;
  }
  
  /**
   * Story settings and preferences
   */
  export interface StorySettings {
    /** Font size for reading */
    fontSize: number;
    /** Reading theme (light/dark) */
    theme: 'light' | 'dark';
    /** Show/hide progress indicators */
    showProgress: boolean;
    /** Auto-save reading progress */
    autoSave: boolean;
  }