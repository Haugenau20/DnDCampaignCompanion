// src/features/storytelling/chapters/context/StoryContext.tsx
import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { Chapter, ChapterProgress, StoryProgress } from '../types';
import { DomainData } from 'core/types/common';
import { useChapterData } from '../hooks/useChapterData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useUser } from 'features/user-management';
import firebaseServices from 'core/services/firebase';
import { buildModificationAttribution } from 'core/attribution';

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

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use existing hooks for data
  const { 
    chapters, 
    loading: chaptersLoading, 
    error: chaptersError, 
    refreshChapters,
    hasRequiredContext
  } = useChapterData();
  
  const { 
    updateData, 
    deleteData
  } = useFirebaseData<Chapter>({ collection: 'chapters' });
  
  // Create a separate instance for story progress. Only the read side is used:
  // writes go through `persistProgress` below, because this hook's `updateData`
  // cannot create the document it needs to write to.
  const {
    data: progressData = [],
    getData: refreshProgress
  } = useFirebaseData<StoryProgress>({ collection: 'story-progress' });

  const { user } = useAuth();
  const { activeGroupUserProfile } = useUser();
  const [isUpdating, setIsUpdating] = useState(false);

  // Real, held-in-state reading progress. `defaultProgress` remains only the
  // initial/fallback value for a first-time reader who has no persisted document.
  const [storedProgress, setStoredProgress] = useState<StoryProgress>(defaultProgress);

  /**
   * Synchronous mirror of `storedProgress`, and the value every mutation below
   * builds from.
   *
   * `updateChapterProgress` and `updateCurrentChapter` both replace the WHOLE
   * `current-progress` document, and finishing a chapter fires both in the same
   * tick — `onPageChange(page, true)` marks it complete, then `onNextChapter()`
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
   * Re-fetch the progress document once the group and campaign are known.
   *
   * `useFirebaseData` fetches on mount and then only on an auth-state event, and
   * its `getData` identity is stable because `useFirestore`'s `getCollection` is
   * a `useCallback` with an empty dependency array. On a page load the mount
   * fetch therefore runs while the campaign context is still restoring — it logs
   * "No active group selected for collection: story-progress" and returns
   * nothing — and nothing ever asks again. `progressData` stayed `[]` for the
   * life of the page, so reading progress was never read BACK even once it was
   * being written correctly.
   *
   * The entity contexts avoid this by going through their own `use*Data()` hooks,
   * which watch the context; this one uses `useFirebaseData` directly and so has
   * to ask again itself.
   */
  useEffect(() => {
    if (hasRequiredContext) {
      refreshProgress();
    }
  }, [hasRequiredContext, refreshProgress]);

  // Populate storedProgress from the persisted 'current-progress' document once
  // useFirebaseData's own on-mount fetch resolves. Guarded so it only ever writes
  // state when a persisted document is actually found -- an empty/absent collection
  // (first-time reader) leaves storedProgress at its defaultProgress initial value,
  // and this never fires on every render because progressData's identity is stable
  // between fetches (it only changes when the underlying hook's fetch resolves).
  useEffect(() => {
    const persisted = progressData.find(
      (doc) => (doc as StoryProgress & { id?: string }).id === 'current-progress'
    );
    if (persisted) {
      progressRef.current = persisted;
      setStoredProgress(persisted);
    }
  }, [progressData]);

  // Generate a consistent ID for a chapter based on its order
  const generateChapterId = (order: number) => {
    return `chapter-${order.toString().padStart(2, '0')}`;
  };

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
   * Write the whole progress document, creating it if it does not exist yet.
   *
   * Both callers below replace the entire `current-progress` document rather
   * than patching fields, so an upsert is the correct verb — and it is the only
   * one that works. `useFirebaseData`'s `updateData` is an *update*, which
   * Firestore rejects on a missing document, and nothing anywhere creates this
   * document: it is not seeded by the sample-data generator and there is no
   * create path in the app. Every campaign therefore started with no progress
   * document, so the first write failed with
   *
   *   NOT_FOUND: no entity to update: .../story-progress/current-progress
   *
   * and the callers' `catch` logged it and moved on. Reading progress has never
   * persisted for any campaign — which is why the 2026-07-29 data audit found
   * zero story-progress documents and read it as "no data to migrate".
   *
   * `setDocument` upserts, so the first write creates and later ones replace.
   */
  const persistProgress = useCallback(async (updatedProgress: StoryProgress) => {
    await firebaseServices.document.setDocument(
      'story-progress',
      'current-progress',
      updatedProgress
    );
  }, []);

  /**
   * Apply a change to reading progress: derive the next document from the ref
   * (never from a render closure), publish it synchronously so a mutation later
   * in the same tick composes on top of it, then persist.
   *
   * The ref is advanced BEFORE the await deliberately. Both mutations are
   * fire-and-forget from ambient call sites, so if the write loses a race or
   * fails outright the in-memory value still reflects what the reader did, and
   * the next write carries it.
   */
  const applyProgress = useCallback(
    async (mutate: (previous: StoryProgress) => StoryProgress) => {
      const next = mutate(progressRef.current);
      progressRef.current = next;
      setStoredProgress(next);
      await persistProgress(next);
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

        return {
          ...previous,
          chapterProgress: {
            ...previous.chapterProgress,
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
      
      await applyProgress(previous => ({
        ...previous,
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

  // Update an existing chapter using the safe methodology
  const updateChapter = useCallback(async (chapterId: string, updates: Partial<Chapter>) => {
    if (!user) {
      throw new Error('You must be signed in to update chapters');
    }
  
    if (!hasRequiredContext) {
      throw new Error('No active group or campaign selected');
    }
    
    setIsUpdating(true);
    try {
      // Get the chapter to update
      const chapter = getChapterById(chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }
      
      // Refresh chapters to ensure we have latest data
      await refreshChapters();
      
      // First, handle the simple case - no order change
      if (updates.order === undefined || updates.order === chapter.order) {
        await updateData(chapterId, {
          ...updates,
          ...buildModificationAttribution({ uid: user.uid, activeGroupUserProfile })
        });
        await refreshChapters();
        return;
      }
      
      const oldOrder = chapter.order;
      const newOrder = updates.order;
      
      console.log(`Reordering chapter ${chapterId} from ${oldOrder} to ${newOrder}`);
      
      // Simple validation
      if (newOrder < 1) {
        throw new Error('Chapter order must be at least 1');
      }
      
      // Determine which chapters will be affected
      const min = Math.min(oldOrder, newOrder);
      const max = Math.max(oldOrder, newOrder);
      
      const affectedChapters = chapters.filter(c => 
        c.order >= min && c.order <= max
      );
      
      console.log(`Affected chapters: ${affectedChapters.map(c => `${c.id} (${c.order})`).join(', ')}`);
      
      // Create a mapping of what each chapter's new order should be
      const newOrderMap = new Map();
      
      // Start by assigning each affected chapter its current order
      affectedChapters.forEach(c => {
        newOrderMap.set(c.id, c.order);
      });
      
      // Apply the reordering logic based on direction
      if (oldOrder < newOrder) {
        // Moving down (e.g., 32 -> 34): chapters in between shift down by 1
        affectedChapters.forEach(c => {
          if (c.id !== chapterId && c.order > oldOrder && c.order <= newOrder) {
            newOrderMap.set(c.id, c.order - 1);
          }
        });
      } else {
        // Moving up (e.g., 34 -> 32): chapters in between shift up by 1
        affectedChapters.forEach(c => {
          if (c.id !== chapterId && c.order >= newOrder && c.order < oldOrder) {
            newOrderMap.set(c.id, c.order + 1);
          }
        });
      }
      
      // Set the moving chapter's new order
      newOrderMap.set(chapterId, newOrder);

      // Compute the modification attribution once for the chapter being moved
      const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });

      // Create array of chapters with their new orders
      const updatedChapters = affectedChapters.map(c => ({
        ...c,
        id: generateChapterId(newOrderMap.get(c.id)),
        order: newOrderMap.get(c.id),
        ...(c.id === chapterId ? modificationAttribution : {}),
        // Add any other updates for the target chapter
        ...(c.id === chapterId ? updates : {})
      }));
      
      console.log(`New chapter order plan: ${updatedChapters.map(c => `${c.id} (${c.order})`).join(', ')}`);
      
      // Bug #017 fix: this used to delete every affected chapter BEFORE creating
      // any of the replacements. If the create loop failed partway, the chapters
      // already deleted above had no replacement and there was no rollback --
      // permanent data loss. createChapter/deleteChapter/reorderChapters avoid
      // this by creating-and-verifying the new position before deleting the old
      // one; we match that here, adapted for one structural difference: a
      // reorder permutes chapter IDs within the affected range (every "old" id
      // in this batch is also one of the "new" ids, just carrying a different
      // chapter's content) rather than freeing some ids and minting brand-new
      // ones the way the chain shifts in createChapter/deleteChapter do. That
      // means the naive per-chapter "create new position, then immediately
      // delete this chapter's own old id" isn't safe here: the "old id" being
      // vacated by one chapter's move is frequently the exact id another
      // chapter in this same batch is about to be written to, so deleting it
      // immediately can destroy a slot that hasn't received its replacement
      // data yet if the batch fails on a later iteration. Instead:
      //   1. Write and verify every chapter at its new position first. Nothing
      //      is deleted while writes are still in flight, so if setDocument or
      //      the verification throws partway through, this function rejects
      //      before any deletion happens -- every pre-reorder chapter still has
      //      a document (either its original one, or the correct new one).
      //   2. Only afterwards, delete old documents whose id was NOT reused as
      //      another chapter's new position in this batch. In practice a
      //      reorder is a closed permutation of the same id range, so this
      //      second loop is usually a no-op; it exists as a defensive cleanup
      //      for ids that genuinely fall out of the affected range.
      for (const updatedChapter of updatedChapters) {
        console.log(`Creating chapter ${updatedChapter.id} (order ${updatedChapter.order})`);
        // Re-key: this rewrites an EXISTING chapter under a new id (the id encodes
        // order), spreading `...c` above so its original created* fields ride along
        // untouched; modification attribution was already applied above only to the
        // chapter the user actually moved. Do NOT switch this to createDocument —
        // that stamps fresh creation attribution from whoever triggered the reorder,
        // overwriting the true original author/date (this is exactly bug #1203).
        await firebaseServices.document.setDocument('chapters', updatedChapter.id, updatedChapter);

        // Verify it exists before this function ever considers deleting an old
        // document, matching the create-and-verify-before-delete pattern used by
        // createChapter/deleteChapter/reorderChapters.
        const newExists = await firebaseServices.document.getDocument('chapters', updatedChapter.id);
        if (!newExists) {
          throw new Error(`Failed to move chapter to ${updatedChapter.id}`);
        }
      }

      // Every replacement write above succeeded, so it is now safe to remove
      // old documents -- but only the ones that were not themselves reused as
      // another chapter's new position in this same batch.
      const newChapterIds = new Set(updatedChapters.map(c => c.id));
      for (const chapter of affectedChapters) {
        if (!newChapterIds.has(chapter.id)) {
          console.log(`Deleting vacated chapter ${chapter.id}`);
          await deleteData(chapter.id);
        }
      }

      // Refresh chapters to get updated state
      await refreshChapters();
      
      console.log('Chapter order change completed successfully');
    } catch (error) {
      console.error('Failed to update chapter order:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [updateData, refreshChapters, chapters, getChapterById, user, deleteData, hasRequiredContext]);

  // Safer method for creating a new chapter with proper ordering
  const createChapter = useCallback(async (chapterData: DomainData<Chapter>) => {
    if (!user) {
      throw new Error('You must be signed in to create chapters');
    }

    if (!hasRequiredContext) {
      throw new Error('No active group or campaign selected');
    }

    setIsUpdating(true);
    try {
      // Refresh chapters to ensure we have latest data
      await refreshChapters();

      const newOrder = chapterData.order ?? (chapters.length > 0
        ? Math.max(...chapters.map(c => c.order)) + 1
        : 1);

      // Simple validation - keep in sync with the identical guard in updateChapter
      if (newOrder < 1) {
        throw new Error('Chapter order must be at least 1');
      }

      console.log(`Creating new chapter with order ${newOrder}`);
      
      // If inserting into the middle, we need to shift chapters
      const chaptersToShift = chapters
        .filter(c => c.order >= newOrder)
        .sort((a, b) => b.order - a.order); // Process in descending order
      
      // Shift existing chapters up to make room
      for (const chapterToShift of chaptersToShift) {
        const shiftedOrder = chapterToShift.order + 1;
        const oldId = chapterToShift.id;
        const newId = generateChapterId(shiftedOrder);
        
        console.log(`Shifting: ${oldId} (${chapterToShift.order}) -> ${newId} (${shiftedOrder})`);
        
        // Create the chapter at its new position
        const updatedChapter = {
          ...chapterToShift,
          id: newId,
          order: shiftedOrder
        };

        // Re-key: this is an EXISTING chapter being shifted to make room for the
        // new one, not a new creation. `...chapterToShift` carries its original
        // created*/modified* fields forward unchanged. Do NOT switch this to
        // createDocument — that would stamp fresh creation attribution from
        // whoever is creating the new chapter, overwriting this shifted chapter's
        // true original author/date (bug #1203).
        await firebaseServices.document.setDocument('chapters', newId, updatedChapter);

        // Verify it exists before deleting the old one
        const newExists = await firebaseServices.document.getDocument('chapters', newId);
        if (!newExists) {
          throw new Error(`Failed to shift chapter ${oldId} to ${newId}`);
        }

        // Delete the old chapter
        await deleteData(oldId);
      }

      // Create consistent ID based on order
      const chapterId = generateChapterId(newOrder);

      // Prepare chapter data with consistent ID and order. Not a complete
      // Chapter -- attribution is stamped by createDocument below, not supplied
      // here. See DomainData's doc comment in core/types/common.ts.
      const newChapter = {
        ...chapterData,
        id: chapterId,
        order: newOrder
      };

      // Add chapter to Firebase via the attribution-aware create path. This is a
      // genuine creation (a brand-new chapter, not a re-key of an existing one), so
      // it is correct for createDocument to stamp created*/modified* attribution
      // from the current user/live profile — unlike the re-key writes elsewhere in
      // this file, which must never go through createDocument (see comments below).
      await firebaseServices.document.createDocument('chapters', newChapter, chapterId);

      // Verify it exists
      const exists = await firebaseServices.document.getDocument('chapters', chapterId);
      if (!exists) {
        throw new Error('Failed to create new chapter');
      }
      
      // Refresh chapters
      await refreshChapters();
      
      console.log('New chapter created successfully');
      return chapterId;
    } catch (error) {
      console.error('Failed to create chapter:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [refreshChapters, chapters, user, deleteData, hasRequiredContext]);

  // Safer method for deleting a chapter
  const deleteChapter = useCallback(async (chapterId: string) => {
    if (!user) {
      throw new Error('You must be signed in to delete chapters');
    }

    if (!hasRequiredContext) {
      throw new Error('No active group or campaign selected');
    }

    setIsUpdating(true);
    try {
      // Refresh chapters to ensure we have latest data
      await refreshChapters();
      
      const chapter = getChapterById(chapterId);
      if (!chapter) {
        throw new Error('Chapter not found');
      }
      
      const deletedOrder = chapter.order;
      console.log(`Deleting chapter with order ${deletedOrder}`);
      
      // Delete the chapter
      await deleteData(chapterId);
      
      // Get chapters that need to be shifted down
      const chaptersToShift = chapters
        .filter(c => c.order > deletedOrder)
        .sort((a, b) => a.order - b.order); // Process in ascending order
      
      // Shift all higher chapters down by one
      for (const chapterToShift of chaptersToShift) {
        const shiftedOrder = chapterToShift.order - 1;
        const oldId = chapterToShift.id;
        const newId = generateChapterId(shiftedOrder);
        
        console.log(`Shifting: ${oldId} (${chapterToShift.order}) -> ${newId} (${shiftedOrder})`);
        
        // Create the chapter at its new position
        const updatedChapter = {
          ...chapterToShift,
          id: newId,
          order: shiftedOrder
        };

        // Re-key: this is an EXISTING chapter being shifted down to close the gap
        // left by the deletion, not a new creation. `...chapterToShift` carries its
        // original created*/modified* fields forward unchanged. Do NOT switch this
        // to createDocument — that would stamp fresh creation attribution from
        // whoever triggered the delete, overwriting this chapter's true original
        // author/date (bug #1203).
        await firebaseServices.document.setDocument('chapters', newId, updatedChapter);

        // Verify it exists before deleting the old one
        const newExists = await firebaseServices.document.getDocument('chapters', newId);
        if (!newExists) {
          throw new Error(`Failed to shift chapter ${oldId} to ${newId}`);
        }

        // Delete the old chapter
        await deleteData(oldId);
      }

      // Refresh chapters
      await refreshChapters();

      console.log('Chapter deleted successfully');
    } catch (error) {
      console.error('Failed to delete chapter:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [deleteData, refreshChapters, getChapterById, chapters, user, hasRequiredContext]);

  // Reorder chapters to ensure consistent numbering
  const reorderChapters = useCallback(async () => {
    if (!user) {
      throw new Error('You must be signed in to reorder chapters');
    }

    if (!hasRequiredContext) {
      throw new Error('No active group or campaign selected');
    }

    try {
      // Sort chapters by their current order
      const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
      
      // Update all chapters with new consecutive order numbers and IDs
      for (let i = 0; i < sortedChapters.length; i++) {
        const chapter = sortedChapters[i];
        const newOrder = i + 1;
        
        if (chapter.order !== newOrder) {
          const newId = generateChapterId(newOrder);
          
          // Create updated chapter
          const updatedChapter = {
            ...chapter,
            order: newOrder,
            id: newId
          };

          // Re-key: this renumbers an EXISTING chapter to close gaps, not a new
          // creation. `...chapter` carries its original created*/modified* fields
          // forward unchanged. Do NOT switch this to createDocument — that would
          // stamp fresh creation attribution from whoever triggered the renumbering,
          // overwriting the chapter's true original author/date (bug #1203).
          await firebaseServices.document.setDocument('chapters', newId, updatedChapter);
          
          // Verify it exists
          const newExists = await firebaseServices.document.getDocument('chapters', newId);
          if (!newExists) {
            throw new Error(`Failed to reorder chapter ${chapter.id} to ${newId}`);
          }
          
          // Delete the old document
          await deleteData(chapter.id);
        }
      }
      
      // Refresh chapters
      await refreshChapters();
    } catch (error) {
      console.error('Failed to reorder chapters:', error);
      throw error;
    }
  }, [chapters, refreshChapters, user, deleteData, hasRequiredContext]);

  const isLoading = chaptersLoading || isUpdating;

  // Prepare appropriate error message. Gated on `!isLoading` so that a fresh
  // page load -- where the group/campaign have not been restored yet -- renders
  // the loading state instead of claiming the user selected nothing (#1413).
  // `useChapterData`'s `loading` folds in `useCampaignContextStatus().isResolving`,
  // so "still loading" already covers "still restoring the selection", and the
  // error is reached only once resolution has settled on nothing. This mirrors
  // what LocationsPage/LocationEditPage get structurally by checking their
  // loading branch before their context branch.
  const contextError = chaptersError || (!isLoading && !hasRequiredContext ? 'Please select a group and campaign' : null);

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