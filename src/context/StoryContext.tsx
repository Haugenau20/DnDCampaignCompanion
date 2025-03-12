// src/context/StoryContext.tsx
import React, { createContext, useContext, useCallback, useState } from 'react';
import { Chapter, ChapterProgress, StoryProgress } from '../types/story';
import { useChapterData } from '../hooks/useChapterData';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useAuth } from './firebase';
import firebaseServices from '../services/firebase';

interface StoryContextState {
  chapters: Chapter[];
  storyProgress: StoryProgress;
  isLoading: boolean;
  error: string | null;
}

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
  createChapter: (chapterData: Omit<Chapter, 'id'>) => Promise<string>;
  /** Update an existing chapter */
  updateChapter: (chapterId: string, updates: Partial<Chapter>) => Promise<void>;
  /** Delete a chapter */
  deleteChapter: (chapterId: string) => Promise<void>;
  /** Reorder chapters after deletion or insertion */
  reorderChapters: () => Promise<void>;
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
  const { chapters, loading: chaptersLoading, error: chaptersError, refreshChapters } = useChapterData();
  const { 
    updateData, 
    addData, 
    deleteData
  } = useFirebaseData<Chapter>({ collection: 'chapters' });
  // Create a separate instance for story progress
  const { updateData: updateProgressData } = useFirebaseData<StoryProgress>({ collection: 'story-progress' });
  
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  // Generate a consistent ID for a chapter based on its order
  const generateChapterId = (order: number) => {
    return `chapter-${order.toString().padStart(2, '0')}`;
  };

  // Create a temporary "parking" ID far outside normal range
  const generateTempId = () => {
    return `chapter-temp-${Date.now()}`;
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

  // Update chapter progress
  const updateChapterProgress = useCallback(async (
    chapterId: string, 
    progress: Partial<ChapterProgress>
  ) => {
    try {
      const updatedProgress = {
        ...defaultProgress,
        chapterProgress: {
          ...defaultProgress.chapterProgress,
          [chapterId]: {
            chapterId,
            lastPosition: progress.lastPosition || 0,
            isComplete: progress.isComplete || false,
            lastRead: new Date()
          }
        }
      };
      
      await updateProgressData('current-progress', updatedProgress);
      refreshChapters();
    } catch (error) {
      console.error('Failed to update chapter progress:', error);
    }
  }, [updateProgressData, refreshChapters]);

  // Update current chapter
  const updateCurrentChapter = useCallback(async (chapterId: string) => {
    try {
      const updatedProgress = {
        ...defaultProgress,
        currentChapter: chapterId,
        lastRead: new Date()
      };
      
      await updateProgressData('current-progress', updatedProgress);
    } catch (error) {
      console.error('Failed to update current chapter:', error);
    }
  }, [updateProgressData]);

  // Mark chapter as complete
  const markChapterComplete = useCallback(async (chapterId: string) => {
    try {
      const chapter = getChapterById(chapterId);
      if (!chapter) return;

      await updateChapterProgress(chapterId, {
        lastPosition: 100,
        isComplete: true
      });
    } catch (error) {
      console.error('Failed to mark chapter as complete:', error);
    }
  }, [getChapterById, updateChapterProgress]);

  // Calculate reading progress
  const getReadingProgress = useCallback(() => {
    const completedChapters = Object.values(defaultProgress.chapterProgress)
      .filter(progress => progress.isComplete)
      .length;
    
    return chapters.length > 0 
      ? (completedChapters / chapters.length) * 100 
      : 0;
  }, [chapters.length]);

  // Update an existing chapter using the safe methodology
  const updateChapter = useCallback(async (chapterId: string, updates: Partial<Chapter>) => {
    if (!user) {
      throw new Error('You must be signed in to update chapters');
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
          lastModified: new Date()
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
      
      // Create array of chapters with their new orders
      const updatedChapters = affectedChapters.map(c => ({
        ...c,
        id: generateChapterId(newOrderMap.get(c.id)),
        order: newOrderMap.get(c.id),
        lastModified: c.id === chapterId ? new Date() : c.lastModified,
        // Add any other updates for the target chapter
        ...(c.id === chapterId ? updates : {})
      }));
      
      console.log(`New chapter order plan: ${updatedChapters.map(c => `${c.id} (${c.order})`).join(', ')}`);
      
      // Delete all affected chapters
      for (const chapter of affectedChapters) {
        console.log(`Deleting chapter ${chapter.id}`);
        await deleteData(chapter.id);
      }
      
      // Create all chapters with their new IDs and orders
      for (const updatedChapter of updatedChapters) {
        console.log(`Creating chapter ${updatedChapter.id} (order ${updatedChapter.order})`);
        await firebaseServices.document.setDocument('chapters', updatedChapter.id, updatedChapter);
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
  }, [updateData, refreshChapters, chapters, getChapterById, user, deleteData]);

  // Safer method for creating a new chapter with proper ordering
  const createChapter = useCallback(async (chapterData: Omit<Chapter, 'id'>) => {
    if (!user) {
      throw new Error('You must be signed in to create chapters');
    }

    setIsUpdating(true);
    try {
      // Refresh chapters to ensure we have latest data
      await refreshChapters();
      
      const newOrder = chapterData.order ?? (chapters.length > 0 
        ? Math.max(...chapters.map(c => c.order)) + 1 
        : 1);
      
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
      
      // Prepare chapter data with consistent ID and order
      const newChapter: Chapter = {
        ...chapterData,
        id: chapterId,
        order: newOrder,
        lastModified: new Date()
      };
      
      // Add chapter to Firebase
      await firebaseServices.document.setDocument('chapters', chapterId, newChapter);
      
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
  }, [refreshChapters, chapters, user, deleteData]);

  // Safer method for deleting a chapter
  const deleteChapter = useCallback(async (chapterId: string) => {
    if (!user) {
      throw new Error('You must be signed in to delete chapters');
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
  }, [deleteData, refreshChapters, getChapterById, chapters, user]);

  // Reorder chapters to ensure consistent numbering
  const reorderChapters = useCallback(async () => {
    if (!user) {
      throw new Error('You must be signed in to reorder chapters');
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
          
          // Create new document with updated ID
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
  }, [chapters, refreshChapters, user, deleteData]);

  const isLoading = chaptersLoading || isUpdating;

  const value: StoryContextValue = {
    chapters,
    storyProgress: defaultProgress,
    isLoading,
    error: chaptersError,
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
    reorderChapters
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