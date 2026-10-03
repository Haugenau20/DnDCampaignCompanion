// src/features/storytelling/chapters/context/StoryContext.tsx
import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { Chapter, ChapterProgress, StoryProgress } from '../types';
import { DomainData } from 'core/types/common';
import { useChapterData } from '../hooks/useChapterData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useUser, useCampaigns, useGroups, useFirestore } from 'features/user-management';
import firebaseServices from 'core/services/firebase';
import { buildCreationAttribution, buildModificationAttribution } from 'core/attribution';

interface StoryContextState {
  chapters: Chapter[];
  storyProgress: StoryProgress;
  isLoading: boolean;
  error: string | null;
}

/**
 * Two deliberately different contracts live in this interface, and the split is
 * intentional — see bug #005.
 *
 * **Reading-progress operations** (`updateChapterProgress`, `updateCurrentChapter`,
 * `markChapterComplete`) return `void` and are fire-and-forget. On a missing
 * group/campaign they `console.warn` and return rather than throwing. Their call
 * sites are ambient — `StoryPage` calls `updateCurrentChapter` from a `useEffect`
 * and `updateChapterProgress` from `BookViewer`'s `onPageChange` — and neither
 * awaits or catches. Making these throw would produce an unhandled promise
 * rejection from an effect and a page-turn handler, which is precisely bug #1051
 * in a new location. A reader who has selected no campaign should not get an
 * exception for scrolling.
 *
 * **Chapter mutations** (`createChapter`, `updateChapter`, `deleteChapter`,
 * `reorderChapters`) return `Promise` and throw. They are user-initiated writes
 * with UI that can catch and report, and a write that silently reports success is
 * the defect #005 fixed in `NPCContext`.
 *
 * So the asymmetry below is the contract, not an inconsistency to unify. If you
 * are here because a sweep flagged "3 warn-and-return vs 4 throw in one file",
 * that is the finding, and this comment is the answer.
 */
/**
 * A chapter's identity and its place in the story are separate (T032,
 * `PERF-05`). The id never changes once written; the place is the `order`
 * field. Chapters written before this kept ids that encode their first
 * position (`chapter-03`) -- those ids stay as they are, and simply stop
 * meaning anything about order.
 *
 * That makes every structural change (insert, delete, move, renumber) a set
 * of `order` updates committed as **one batch**: atomic, so no half-shifted
 * story can be left behind, and one round trip instead of the old
 * write-verify-delete per chapter (~102 serial operations to insert at the
 * front of 32 chapters).
 */
type ChapterWrite = {
  type: 'set' | 'update' | 'delete';
  collection: 'chapters';
  id: string;
  data?: Record<string, unknown>;
};

/** Firestore commits at most 500 writes in one batch. */
export const MAX_CHAPTER_WRITES = 500;

/** Commits a structural change atomically, or refuses it whole. */
const commitChapterWrites = async (writes: ChapterWrite[]): Promise<void> => {
  if (writes.length === 0) return;
  if (writes.length > MAX_CHAPTER_WRITES) {
    throw new Error(
      `This change would rewrite ${writes.length} chapters at once; one change can rewrite at most ${MAX_CHAPTER_WRITES}.`
    );
  }
  await firebaseServices.document.batchOperations(writes);
};

/** Moves one chapter to a new place, changing nothing else about it. */
const moveTo = (chapter: Chapter, order: number): ChapterWrite => ({
  type: 'update',
  collection: 'chapters',
  id: chapter.id,
  data: { order },
});

/**
 * A new chapter's id: `chapter-` and a random suffix, the same shape notes use
 * (T029). It never encodes order, and it cannot collide with an older
 * `chapter-NN` id.
 */
const generateChapterId = (): string =>
  `chapter-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

interface StoryContextValue extends StoryContextState {
  /** Get a specific chapter by ID */
  getChapterById: (id: string) => Chapter | undefined;
  /** Update progress for a specific chapter */
  updateChapterProgress: (chapterId: string, progress: Partial<ChapterProgress>) => void;
  /** Update the current chapter */
  updateCurrentChapter: (chapterId: string) => void;
  /** Get next chapter if available */
  getNextChapter: (currentChapterId: string) => Chapter | undefined;
  /** Get previous chapter if available */
  getPreviousChapter: (currentChapterId: string) => Chapter | undefined;
  /** Mark a chapter as complete */
  markChapterComplete: (chapterId: string) => void;
  /** Get reading progress percentage */
  getReadingProgress: () => number;
  /** Create a new chapter */
  createChapter: (chapterData: DomainData<Chapter>) => Promise<string>;
  /** Update an existing chapter */
  updateChapter: (chapterId: string, updates: Partial<Chapter>) => Promise<void>;
  /** Delete a chapter */
  deleteChapter: (chapterId: string) => Promise<void>;
  /** Reorder chapters after deletion or insertion */
  reorderChapters: () => Promise<void>;
  /** Whether the required context (group and campaign) is available */
  hasRequiredContext: boolean;
}

const StoryContext = createContext<StoryContextValue | undefined>(undefined);

/**
 * Default story progress state
 */
const defaultProgress: StoryProgress = {
  currentChapter: '',
  lastRead: new Date(),
  chapterProgress: {}
};

/** What one progress change touches: top-level fields, and chapter entries. */
type ProgressPatch = Partial<Omit<StoryProgress, 'chapterProgress'>> & {
  chapterProgress?: Record<string, ChapterProgress>;
};

/** `patch` laid over `base`, merging chapter entries rather than replacing the map. */
function mergeProgress<T extends ProgressPatch>(base: T, patch: ProgressPatch): T {
  return {
    ...base,
    ...patch,
    chapterProgress: { ...base.chapterProgress, ...patch.chapterProgress },
  };
}

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use existing hooks for data
  const { 
    chapters, 
    loading: chaptersLoading, 
    error: chaptersError, 
    hasRequiredContext
  } = useChapterData();
  
  // `autoFetch: false` because nothing renders off this instance's `data`:
  // chapters come from `useChapterData()` above.
  const { updateData } = useFirebaseData<Chapter>({ collection: 'chapters', autoFetch: false });
  
  const { user } = useAuth();
  const { activeGroupUserProfile } = useUser();
  const { activeCampaignId } = useCampaigns();
  const { activeGroupId } = useGroups();
  const { getDocument } = useFirestore();

  /**
   * Where this reader's progress for the active campaign lives, or null until
   * the reader, group and campaign are all known.
   *
   * Reading progress belongs to one player (T073). It used to be a single
   * `campaigns/{c}/story-progress/current-progress` document that every member
   * of the campaign wrote, so each player's place in the story replaced the
   * last one's. It now sits beside that player's private notes, one document
   * per campaign, which gives it the notes' owner-only rule and means deleting
   * an account or leaving a group removes it with the rest of the subtree.
   */
  const progressLocation = user?.uid && activeGroupId && activeCampaignId
    ? {
        collection: `groups/${activeGroupId}/users/${user.uid}/story-progress`,
        id: activeCampaignId,
      }
    : null;
  const progressCollection = progressLocation?.collection ?? null;
  const progressId = progressLocation?.id ?? null;

  // Real, held-in-state reading progress. `defaultProgress` remains only the
  // initial/fallback value for a first-time reader who has no persisted document.
  const [storedProgress, setStoredProgress] = useState<StoryProgress>(defaultProgress);

  /**
   * Synchronous mirror of `storedProgress`, and the value every mutation below
   * builds from.
   *
   * `updateChapterProgress` and `updateCurrentChapter` both replace the WHOLE
   * progress document, and finishing a chapter fires both in the same tick —
   * `onPageChange(page, true)` marks it complete, then `onNextChapter()`
   * navigates, which sets the new current chapter. Building each from the
   * `storedProgress` closure meant the second one read the pre-update value and
   * overwrote the first: completing a chapter recorded `currentChapter` and then
   * silently dropped the `chapterProgress` entry it had just written.
   *
   * A ref updated synchronously (rather than waiting for a re-render) means the
   * second mutation composes on top of the first, so last-write-wins is safe.
   */
  const progressRef = useRef<StoryProgress>(defaultProgress);

  /**
   * Every change made since the location's progress was last read, so a read
   * that resolves after the reader has already moved on keeps what they did:
   * the stored progress, with this visit's changes on top.
   */
  const unreadChangesRef = useRef<ProgressPatch>({});

  /**
   * Read this reader's progress whenever the reader, group or campaign changes.
   *
   * Progress is reset to the default first, so a campaign or account switch
   * never leaves the previous one's position on screen while the read is in
   * flight, or when the new one has no document yet. A read that resolves
   * after the location has moved on is dropped for the same reason.
   *
   * One document by id, rather than the collection: the collection is this
   * reader's alone, but there is no reason to read other campaigns' progress.
   */
  useEffect(() => {
    progressRef.current = defaultProgress;
    unreadChangesRef.current = {};
    setStoredProgress(defaultProgress);
    if (!progressCollection || !progressId) return;

    let current = true;
    getDocument<StoryProgress>(progressCollection, progressId).then((persisted) => {
      if (current && persisted) {
        const merged = mergeProgress(
          { ...persisted, chapterProgress: persisted.chapterProgress ?? {} },
          unreadChangesRef.current
        );
        progressRef.current = merged;
        setStoredProgress(merged);
      }
    });
    return () => {
      current = false;
    };
  }, [progressCollection, progressId, getDocument]);

// Get chapter by ID
  const getChapterById = useCallback((id: string) => {
    return chapters.find(chapter => chapter.id === id);
  }, [chapters]);

  // Get next chapter
  const getNextChapter = useCallback((currentChapterId: string) => {
    const currentIndex = chapters.findIndex(chapter => chapter.id === currentChapterId);
    return currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : undefined;
  }, [chapters]);

  // Get previous chapter
  const getPreviousChapter = useCallback((currentChapterId: string) => {
    const currentIndex = chapters.findIndex(chapter => chapter.id === currentChapterId);
    return currentIndex > 0 ? chapters[currentIndex - 1] : undefined;
  }, [chapters]);

  /**
   * Write one change into this reader's progress document, creating the
   * document if it does not exist yet.
   *
   * A merging upsert, for two reasons. Nothing creates the document ahead of
   * time, so an *update* is rejected with NOT_FOUND on a first write -- that is
   * how reading progress once never persisted for any campaign. And only the
   * fields that changed go out (T073): replacing the whole document grew every
   * write with the number of chapters read, and a write fired before the first
   * read resolved replaced what was stored with only this visit's progress.
   *
   * Without a reader, group and campaign there is nowhere to write, and the
   * in-memory progress stands alone until there is.
   */
  const persistProgress = useCallback(async (patch: ProgressPatch) => {
    if (!progressCollection || !progressId) return;
    await firebaseServices.document.setDocument(
      progressCollection,
      progressId,
      patch,
      { merge: true }
    );
  }, [progressCollection, progressId]);

  /**
   * Apply a change to reading progress: derive it from the ref (never from a
   * render closure), publish the result synchronously so a change later in the
   * same tick composes on top of it, then persist the change alone.
   *
   * The ref is advanced BEFORE the await deliberately. Both mutations are
   * fire-and-forget from ambient call sites, so if the write fails outright
   * the in-memory value still reflects what the reader did.
   */
  const applyProgress = useCallback(
    async (change: (previous: StoryProgress) => ProgressPatch) => {
      const patch = change(progressRef.current);
      const next = mergeProgress(progressRef.current, patch);
      progressRef.current = next;
      unreadChangesRef.current = mergeProgress(unreadChangesRef.current, patch);
      setStoredProgress(next);
      await persistProgress(patch);
    },
    [persistProgress]
  );

  // Update chapter progress
  const updateChapterProgress = useCallback(async (
    chapterId: string,
    progress: Partial<ChapterProgress>
  ) => {
    try {
      if (!hasRequiredContext) {
        console.warn('Cannot update chapter progress: no active group or campaign');
        return;
      }
      
      await applyProgress(previous => {
        // Bug #852: this used to rebuild the entry from scratch, defaulting every
        // field the caller did not supply — so any call omitting `isComplete`
        // silently cleared a stored `true`. The outer spreads preserved *other*
        // chapters; nothing preserved this one. Merge over the existing entry so
        // the body honours the Partial<ChapterProgress> the signature advertises.
        const existing = previous.chapterProgress[chapterId];

        // This chapter's entry alone; applyProgress merges it into the rest.
        return {
          chapterProgress: {
            [chapterId]: {
              chapterId,
              // Precedence, per field: what the caller explicitly supplied wins,
              // then what is already stored, then the default. `??` not `||`, so
              // an explicit `false`/`0` from the caller is honoured rather than
              // falling through. A caller can still clear isComplete on purpose;
              // what it can no longer do is clear it by staying silent.
              lastPosition: progress.lastPosition ?? existing?.lastPosition ?? 0,
              isComplete: progress.isComplete ?? existing?.isComplete ?? false,
              lastRead: new Date()
            }
          }
        };
      });

      // Deliberately does NOT refetch chapters. Reading progress lives in the
      // `story-progress` document; a progress write cannot change a single
      // chapter document, so re-reading the whole `chapters` collection here
      // bought nothing — and cost a great deal.
      //
      // `refreshChapters()` sets `loading` true, which feeds `isLoading`, which
      // makes StoryPage swap the reader for its loading card. That UNMOUNTS the
      // reader, resetting the per-chapter guard that stops it re-reporting
      // completion; on remount it reported completion again, refetched again,
      // and the page sat in a permanent READER -> LOADING -> READER loop about
      // once a second, writing to Firestore on every pass. The same refetch also
      // tore the reader down mid-scroll, discarding the reader's position.
    } catch (error) {
      console.error('Failed to update chapter progress:', error);
    }
  }, [applyProgress, hasRequiredContext]);

  // Update current chapter
  const updateCurrentChapter = useCallback(async (chapterId: string) => {
    try {
      if (!hasRequiredContext) {
        console.warn('Cannot update current chapter: no active group or campaign');
        return;
      }
      
      await applyProgress(() => ({
        currentChapter: chapterId,
        lastRead: new Date()
      }));
    } catch (error) {
      console.error('Failed to update current chapter:', error);
    }
  }, [applyProgress, hasRequiredContext]);

  // Mark chapter as complete
  const markChapterComplete = useCallback(async (chapterId: string) => {
    try {
      if (!hasRequiredContext) {
        console.warn('Cannot mark chapter complete: no active group or campaign');
        return;
      }
      
      const chapter = getChapterById(chapterId);
      if (!chapter) return;

      await updateChapterProgress(chapterId, {
        lastPosition: 100,
        isComplete: true
      });
    } catch (error) {
      console.error('Failed to mark chapter as complete:', error);
    }
  }, [getChapterById, updateChapterProgress, hasRequiredContext]);

  // Calculate reading progress
  const getReadingProgress = useCallback(() => {
    const completedChapters = Object.values(storedProgress.chapterProgress)
      .filter(progress => progress.isComplete)
      .length;

    return chapters.length > 0
      ? (completedChapters / chapters.length) * 100
      : 0;
  }, [storedProgress, chapters.length]);

  /**
   * Update a chapter. A change of `order` moves it, and shifts every chapter
   * between its old and new place by one to make room -- all in one batch.
   */
  const updateChapter = useCallback(async (chapterId: string, updates: Partial<Chapter>) => {
    if (!user) {
      throw new Error('You must be signed in to update chapters');
    }

    if (!hasRequiredContext) {
      throw new Error('No active group or campaign selected');
    }

    const chapter = getChapterById(chapterId);
    if (!chapter) {
      throw new Error('Chapter not found');
    }

    // The id is the document's, never a field to change.
    const fields: Partial<Chapter> = { ...updates };
    delete fields.id;

    if (fields.order === undefined || fields.order === chapter.order) {
      await updateData(chapterId, {
        ...fields,
        ...buildModificationAttribution({ uid: user.uid, activeGroupUserProfile })
      });
      return;
    }

    const oldOrder = chapter.order;
    const newOrder = fields.order;
    if (newOrder < 1) {
      throw new Error('Chapter order must be at least 1');
    }

    // Moving later pulls the chapters it passes back by one; moving earlier
    // pushes them on by one. Only `order` changes on them, so their created*
    // and modified* fields stay exactly as their authors left them (#1203).
    const passed = chapters.filter(c => c.id !== chapterId && (oldOrder < newOrder
      ? c.order > oldOrder && c.order <= newOrder
      : c.order >= newOrder && c.order < oldOrder));
    const shift = oldOrder < newOrder ? -1 : 1;

    await commitChapterWrites([
      ...passed.map(c => moveTo(c, c.order + shift)),
      {
        type: 'update',
        collection: 'chapters',
        id: chapterId,
        data: {
          ...fields,
          ...buildModificationAttribution({ uid: user.uid, activeGroupUserProfile })
        }
      }
    ]);
  }, [updateData, chapters, getChapterById, user, activeGroupUserProfile, hasRequiredContext]);

  /**
   * Create a chapter at `chapterData.order`, or after the last one. Inserting
   * before existing chapters moves each of them on by one, in the same batch
   * that writes the new chapter.
   */
  const createChapter = useCallback(async (chapterData: DomainData<Chapter>) => {
    if (!user) {
      throw new Error('You must be signed in to create chapters');
    }

    if (!hasRequiredContext) {
      throw new Error('No active group or campaign selected');
    }

    const newOrder = chapterData.order ?? (chapters.length > 0
      ? Math.max(...chapters.map(c => c.order)) + 1
      : 1);

    // Keep in sync with the identical guard in updateChapter
    if (newOrder < 1) {
      throw new Error('Chapter order must be at least 1');
    }

    const chapterId = generateChapterId();

    await commitChapterWrites([
      ...chapters.filter(c => c.order >= newOrder).map(c => moveTo(c, c.order + 1)),
      {
        type: 'set',
        collection: 'chapters',
        id: chapterId,
        // A genuine creation, so it carries creation attribution for the
        // current user -- the same fields `createDocument` would stamp. The
        // chapters moved above are not re-attributed (#1203).
        data: {
          ...chapterData,
          id: chapterId,
          order: newOrder,
          ...buildCreationAttribution({ uid: user.uid, activeGroupUserProfile })
        }
      }
    ]);

    return chapterId;
  }, [chapters, user, activeGroupUserProfile, hasRequiredContext]);

  /** Delete a chapter, and move every later chapter back by one to close the gap. */
  const deleteChapter = useCallback(async (chapterId: string) => {
    if (!user) {
      throw new Error('You must be signed in to delete chapters');
    }

    if (!hasRequiredContext) {
      throw new Error('No active group or campaign selected');
    }

    const chapter = getChapterById(chapterId);
    if (!chapter) {
      throw new Error('Chapter not found');
    }

    await commitChapterWrites([
      { type: 'delete', collection: 'chapters', id: chapterId },
      ...chapters.filter(c => c.order > chapter.order).map(c => moveTo(c, c.order - 1))
    ]);
  }, [getChapterById, chapters, user, hasRequiredContext]);

  /** Renumber the chapters 1, 2, 3, ... in their current order, closing any gaps. */
  const reorderChapters = useCallback(async () => {
    if (!user) {
      throw new Error('You must be signed in to reorder chapters');
    }

    if (!hasRequiredContext) {
      throw new Error('No active group or campaign selected');
    }

    const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
    await commitChapterWrites(
      sortedChapters
        .map((chapter, index) => ({ chapter, order: index + 1 }))
        .filter(({ chapter, order }) => chapter.order !== order)
        .map(({ chapter, order }) => moveTo(chapter, order))
    );
  }, [chapters, user, hasRequiredContext]);

  // `isLoading` means "there is nothing to show yet" (T044), so it is exactly
  // `useChapterData`'s `loading` -- which already stops counting a refetch
  // behind chapters on screen. It used to also fold in a write-in-flight flag,
  // raised for the whole of every create, update and delete: every story page
  // gates on this value, so pressing Save swapped `ChapterEditPage`'s form for
  // the gate's skeleton until the write returned. `ChapterForm` and
  // `DeleteConfirmationDialog` each track their own pending state.
  const isLoading = chaptersLoading;

  // `error` carries real fetch failures only. It used to also carry
  // 'Please select a group and campaign' whenever the selection was absent,
  // which put a selection prompt into an error channel: StoryPage renders
  // `error` directly, so a signed-out visitor was shown that sentence through
  // the error branch -- told to use a group switcher `Header` only renders for
  // signed-in members.
  //
  // Missing context is a state, and this context already publishes it as
  // `hasRequiredContext` in the value below. What to SAY about it depends on
  // whether the visitor is signed out, still resolving, or simply between
  // campaigns, and only the page can tell those apart -- `usePageGate` makes
  // the distinction and `gated-page-copy.ts` holds the words.
  const contextError = chaptersError;

  const value: StoryContextValue = {
    chapters,
    storyProgress: storedProgress,
    isLoading,
    error: contextError,
    getChapterById,
    updateChapterProgress,
    updateCurrentChapter,
    getNextChapter,
    getPreviousChapter,
    markChapterComplete,
    getReadingProgress,
    createChapter,
    updateChapter,
    deleteChapter,
    reorderChapters,
    hasRequiredContext
  };

  return (
    <StoryContext.Provider value={value}>
      {children}
    </StoryContext.Provider>
  );
};

/**
 * Hook to use story context
 * @throws {Error} If used outside of StoryProvider
 */
export const useStory = () => {
  const context = useContext(StoryContext);
  if (context === undefined) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
};

export default StoryContext;