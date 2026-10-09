// src/features/storytelling/chapters/context/StoryContext.tsx
import React, { createContext, useContext, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { Chapter, ChapterProgress, StoryProgress } from '../types';
import { DomainData } from 'core/types/common';
import { useChapterData } from '../hooks/useChapterData';
import { inReadingOrder, numberedInReadingOrder } from '../utils/chapter-order';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useCampaignCollectionPath } from 'shared/hooks/useCampaignCollectionPath';
import { useAuth, useUser, useCampaigns, useGroups, useFirestore } from 'features/user-management';
import firebaseServices from 'core/services/firebase';
import { buildCreationAttribution, buildModificationAttribution, creationTimes, modificationTimes } from 'core/attribution';
import { createListenerDemandContext, useListenerDemand, ListReaderOptions } from 'shared/hooks/useListenerDemand';
import { bodyDelete, contentWrites } from '../utils/chapter-body';

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
  id: string;
  data?: Record<string, unknown>;
  /** Another collection than the chapters': a chapter's body (T134). */
  collection?: string;
};

/** Firestore commits at most 500 writes in one batch. */
export const MAX_CHAPTER_WRITES = 500;

/**
 * Commits a structural change atomically, or refuses it whole.
 *
 * @param collection The chapters' full path, from the caller's render
 *   (`useCampaignCollectionPath`), so the change lands in the campaign it was
 *   made in (T082); `null` when there is no campaign
 * @param writes The writes, to that collection unless one names its own
 */
const commitChapterWrites = async (collection: string | null, writes: ChapterWrite[]): Promise<void> => {
  if (writes.length === 0) return;
  if (collection === null) {
    throw new Error('No campaign selected');
  }
  if (writes.length > MAX_CHAPTER_WRITES) {
    throw new Error(
      `This change would rewrite ${writes.length} chapters at once; one change can rewrite at most ${MAX_CHAPTER_WRITES}.`
    );
  }
  await firebaseServices.document.batchOperations(writes.map(write => ({ ...write, collection: write.collection ?? collection })));
};

/** Moves one chapter to a new place, changing nothing else about it. */
const moveTo = (chapter: Chapter, order: number): ChapterWrite => ({
  type: 'update',
  id: chapter.id,
  data: { order },
});

/**
 * The moves that put `sequence` at places 1, 2, 3, ... -- one for each chapter
 * whose stored `order` is not already its place (T088).
 *
 * Every structural change ends here, so it rewrites whatever is out of place,
 * not only what it moved itself: a shared order or a gap left by a concurrent
 * change is healed by the next one.
 *
 * @param sequence The chapters as stored, in the reading order they should have
 * @param skip The chapter whose own write carries its place, if any
 */
const placeWrites = (sequence: Chapter[], skip?: string): ChapterWrite[] =>
  sequence.flatMap((chapter, index) =>
    chapter.id !== skip && chapter.order !== index + 1 ? [moveTo(chapter, index + 1)] : []
  );

/** `list` with `item` at `place` (1-based), clamped to the list's ends. */
const withAt = <T,>(list: T[], item: T, place: number): T[] => {
  const index = Math.min(Math.max(place - 1, 0), list.length);
  return [...list.slice(0, index), item, ...list.slice(index)];
};

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
  /** Delete several chapters and renumber the rest, as one batch (T017). */
  deleteChapters: (chapterIds: string[]) => Promise<void>;
  /** Reorder chapters after deletion or insertion */
  reorderChapters: () => Promise<void>;
  /** Whether the required context (group and campaign) is available */
  hasRequiredContext: boolean;
}

const StoryContext = createContext<StoryContextValue | undefined>(undefined);

/**
 * Who is reading this provider's list right now (T032, `PERF-03`): the
 * listener is open only while some component that called `useStory()` is
 * mounted, and for a while after. See `useListenerDemand`.
 */
const { DemandProvider: StoryDemandProvider, useDemand: useStoryDemand } = createListenerDemandContext();

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
  const demand = useListenerDemand();
  const { 
    chapters: storedChapters, 
    loading: chaptersLoading, 
    error: chaptersError, 
    hasRequiredContext
  } = useChapterData({ enabled: demand.wanted });

  /*
    Two lists of the same chapters (T088). `chapters`, which every reader
    gets, is numbered by place: two chapters can share a stored `order` after
    concurrent inserts, and a reader should never see "3, 3". `reading` keeps
    the stored values, which the structural changes below need to know what
    is out of place.
  */
  const reading = useMemo(() => inReadingOrder(storedChapters), [storedChapters]);
  const chapters = useMemo(() => numberedInReadingOrder(storedChapters), [storedChapters]);
  
  // `autoFetch: false` because nothing renders off this instance's `data`:
  // chapters come from `useChapterData()` above. Writes name this render's
  // campaign by full path, so one started here lands here even if the player
  // switches campaign before it runs (T082).
  const chaptersPath = useCampaignCollectionPath('chapters');
  const { updateData } = useFirebaseData<Chapter>({ collection: chaptersPath, autoFetch: false });
  
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

  /** The progress location the read below has been started for, if any. */
  const progressReadFor = useRef<string | null>(null);
  const progressKey = progressCollection && progressId ? `${progressCollection}/${progressId}` : null;

  /*
    Progress is reset to the default whenever the reader, group or campaign
    changes, so a campaign or account switch never leaves the previous one's
    position on screen while the read is in flight, or when the new one has
    no document yet.
  */
  useEffect(() => {
    progressRef.current = defaultProgress;
    unreadChangesRef.current = {};
    progressReadFor.current = null;
    setStoredProgress(defaultProgress);
  }, [progressKey]);

  /**
   * Read this reader's progress once per location, the first time anything
   * reads the story (`PERF-03`: not on every route). A read that resolves
   * after the location has moved on is dropped.
   *
   * One document by id, rather than the collection: the collection is this
   * reader's alone, but there is no reason to read other campaigns' progress.
   */
  useEffect(() => {
    if (!demand.wanted || !progressCollection || !progressId || !progressKey) return;
    if (progressReadFor.current === progressKey) return;
    progressReadFor.current = progressKey;

    let current = true;
    let settled = false;
    getDocument<StoryProgress>(progressCollection, progressId).then((persisted) => {
      settled = true;
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
      // Abandoned before it answered: let the next run read again.
      if (!settled && progressReadFor.current === progressKey) progressReadFor.current = null;
    };
  }, [demand.wanted, progressCollection, progressId, progressKey, getDocument]);

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
   * Update a chapter. A change of `order` (its place, as readers see it) moves
   * it there and renumbers every chapter out of place -- all in one batch.
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

    // The id is the document's, never a field to change; the text goes to its
    // own document (T134), beside the chapter's fields in the same batch.
    const { content, ...fields }: Partial<Chapter> = { ...updates };
    delete fields.id;
    const moves = fields.order !== undefined && fields.order !== chapter.order;

    if (!moves && typeof content !== 'string') {
      await updateData(chapterId, {
        ...fields,
        ...buildModificationAttribution({ uid: user.uid, activeGroupUserProfile })
      });
      return;
    }

    if (fields.order !== undefined && fields.order < 1) {
      throw new Error('Chapter order must be at least 1');
    }
    if (chaptersPath === null) {
      throw new Error('No campaign selected');
    }

    // The others move by place. Only `order` changes on them, so their
    // created* and modified* fields stay exactly as their authors left them
    // (#1203).
    const stored = reading.find(c => c.id === chapterId)!;
    const sequence = moves
      ? withAt(reading.filter(c => c.id !== chapterId), stored, fields.order!)
      : reading;
    const place = moves ? sequence.indexOf(stored) + 1 : chapter.order;
    const text = typeof content === 'string' ? contentWrites(chaptersPath, chapterId, content) : undefined;

    await commitChapterWrites(chaptersPath, [
      ...(moves ? placeWrites(sequence, chapterId) : []),
      {
        type: 'update',
        id: chapterId,
        data: {
          ...fields,
          ...text?.chapterFields,
          order: place,
          ...buildModificationAttribution({ uid: user.uid, activeGroupUserProfile }),
          ...modificationTimes()
        }
      },
      ...(text ? [text.body] : [])
    ]);
  }, [updateData, reading, getChapterById, user, activeGroupUserProfile, hasRequiredContext, chaptersPath]);

  /**
   * Create a chapter at place `chapterData.order`, or after the last one, and
   * renumber every chapter out of place, in the same batch that writes it.
   */
  const createChapter = useCallback(async (chapterData: DomainData<Chapter>) => {
    if (!user) {
      throw new Error('You must be signed in to create chapters');
    }

    if (!hasRequiredContext) {
      throw new Error('No active group or campaign selected');
    }

    // Keep in sync with the identical guard in updateChapter
    if (chapterData.order !== undefined && chapterData.order < 1) {
      throw new Error('Chapter order must be at least 1');
    }

    if (chaptersPath === null) {
      throw new Error('No campaign selected');
    }

    const chapterId = generateChapterId();
    const placeholder = { id: chapterId } as Chapter;
    const sequence = withAt(reading, placeholder, chapterData.order ?? reading.length + 1);
    const newOrder = sequence.indexOf(placeholder) + 1;
    // The text in its own document (T134), in the same batch.
    const { content, ...fields } = chapterData;
    const text = contentWrites(chaptersPath, chapterId, content ?? '');

    await commitChapterWrites(chaptersPath, [
      ...placeWrites(sequence, chapterId),
      {
        type: 'set',
        id: chapterId,
        // A genuine creation, so it carries creation attribution for the
        // current user -- the same fields `createDocument` would stamp. The
        // chapters moved above are not re-attributed (#1203).
        data: {
          ...fields,
          contentLength: text.chapterFields.contentLength,
          id: chapterId,
          order: newOrder,
          ...buildCreationAttribution({ uid: user.uid, activeGroupUserProfile }),
          ...creationTimes()
        }
      },
      text.body
    ]);

    return chapterId;
  }, [reading, user, activeGroupUserProfile, hasRequiredContext, chaptersPath]);

  /** Delete a chapter, and renumber every chapter out of place to close the gap. */
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

    if (chaptersPath === null) {
      throw new Error('No campaign selected');
    }

    // Its text with it (T134): a subcollection outlives its parent.
    await commitChapterWrites(chaptersPath, [
      bodyDelete(chaptersPath, chapterId),
      { type: 'delete', id: chapterId },
      ...placeWrites(reading.filter(c => c.id !== chapterId))
    ]);
  }, [getChapterById, reading, user, hasRequiredContext, chaptersPath]);

  /**
   * Delete several chapters and renumber the rest 1, 2, 3, ... (T017), as one
   * batch: all or nothing, like every other structural change. A chapter no
   * longer in the list is skipped, since it is already gone.
   */
  const deleteChapters = useCallback(async (chapterIds: string[]) => {
    if (!user) {
      throw new Error('You must be signed in to delete chapters');
    }

    if (!hasRequiredContext) {
      throw new Error('No active group or campaign selected');
    }

    if (chaptersPath === null) {
      throw new Error('No campaign selected');
    }

    const doomed = new Set(chapterIds.filter(id => getChapterById(id)));
    await commitChapterWrites(chaptersPath, [
      ...[...doomed].flatMap((id): ChapterWrite[] => [bodyDelete(chaptersPath, id), { type: 'delete', id }]),
      ...placeWrites(reading.filter(c => !doomed.has(c.id)))
    ]);
  }, [getChapterById, reading, user, hasRequiredContext, chaptersPath]);

  /** Renumber the chapters 1, 2, 3, ... in their current order, closing any gaps. */
  const reorderChapters = useCallback(async () => {
    if (!user) {
      throw new Error('You must be signed in to reorder chapters');
    }

    if (!hasRequiredContext) {
      throw new Error('No active group or campaign selected');
    }

    await commitChapterWrites(chaptersPath, placeWrites(reading));
  }, [reading, user, hasRequiredContext, chaptersPath]);

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
    deleteChapters,
    reorderChapters,
    hasRequiredContext
  };

  return (
    <StoryDemandProvider value={demand.retain}>
      <StoryContext.Provider value={value}>
        {children}
      </StoryContext.Provider>
    </StoryDemandProvider>
  );
};

/**
 * Hook to use story context
 * @throws {Error} If used outside of StoryProvider
 */
export const useStory = (options: ListReaderOptions = {}) => {
  useStoryDemand(options.subscribe ?? true);
  const context = useContext(StoryContext);
  if (context === undefined) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
};

export default StoryContext;