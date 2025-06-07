// src/context/StoryContext.tsx
import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { Chapter, StoryContextValue, ChapterFormData, ChapterProgress, StoryProgress } from '../types/story';
import { SystemMetadataService } from '../utils/system-metadata';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useGroups, useCampaigns, useAuth, useUser } from './firebase';

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
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  
  // Local state for story-specific functionality
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [storyProgress, setStoryProgress] = useState<StoryProgress>(defaultProgress);
  
  // Firebase operations
  const { 
    items: chapters, 
    loading: isLoading, 
    error, 
    updateData, 
    deleteData, 
    addData,
    refreshData 
  } = useFirebaseData<Chapter>({
    collection: 'chapters'
  });

  // Check if we have required context
  const hasRequiredContext = Boolean(activeGroupId && activeCampaignId && user);

  // Validate authentication for operations
  const validateAuth = useCallback(() => {
    if (!hasRequiredContext) {
      throw new Error('Cannot perform operation: No group or campaign selected');
    }
    if (!user || !userProfile) {
      throw new Error('User must be authenticated');
    }
  }, [hasRequiredContext, user, userProfile]);

  // Standard CRUD operations
  const create = useCallback(async (data: ChapterFormData): Promise<Chapter> => {
    validateAuth();
    
    const id = SystemMetadataService.generateId();
    const systemMetadata = SystemMetadataService.createMetadata(
      user, 
      userProfile, 
      activeGroupUserProfile
    );
    
    const chapter: Chapter = {
      id,
      ...systemMetadata,
      ...data
    };

    await addData(id, chapter);
    await refreshData();
    return chapter;
  }, [validateAuth, user, userProfile, activeGroupUserProfile, addData, refreshData]);

  const update = useCallback(async (id: string, data: ChapterFormData): Promise<Chapter> => {
    validateAuth();
    
    const existing = chapters.find(chapter => chapter.id === id);
    if (!existing) {
      throw new Error(`Chapter with ID ${id} not found`);
    }

    const updateMetadata = SystemMetadataService.updateMetadata(
      user,
      userProfile,
      activeGroupUserProfile
    );

    const updatedChapter: Chapter = {
      ...existing,
      ...data,
      ...updateMetadata
    };

    await updateData(id, updatedChapter);
    await refreshData();
    return updatedChapter;
  }, [validateAuth, chapters, user, userProfile, activeGroupUserProfile, updateData, refreshData]);

  const deleteChapter = useCallback(async (id: string): Promise<void> => {
    validateAuth();
    await deleteData(id);
    await refreshData();
  }, [validateAuth, deleteData, refreshData]);

  const getById = useCallback((id: string): Chapter | undefined => {
    return chapters.find(chapter => chapter.id === id);
  }, [chapters]);

  const refresh = useCallback(async (): Promise<void> => {
    await refreshData();
  }, [refreshData]);

  // Feature-specific methods
  const getNextChapter = useCallback((currentId: string): Chapter | undefined => {
    const current = getById(currentId);
    if (!current) return undefined;
    
    const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
    const currentIndex = sortedChapters.findIndex(ch => ch.id === currentId);
    
    return currentIndex >= 0 && currentIndex < sortedChapters.length - 1 
      ? sortedChapters[currentIndex + 1] 
      : undefined;
  }, [chapters, getById]);

  const getPreviousChapter = useCallback((currentId: string): Chapter | undefined => {
    const current = getById(currentId);
    if (!current) return undefined;
    
    const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
    const currentIndex = sortedChapters.findIndex(ch => ch.id === currentId);
    
    return currentIndex > 0 
      ? sortedChapters[currentIndex - 1] 
      : undefined;
  }, [chapters, getById]);

  const setCurrentChapter = useCallback((chapter: Chapter): void => {
    setCurrentChapter(chapter);
    setStoryProgress(prev => ({
      ...prev,
      currentChapter: chapter.id,
      lastRead: new Date()
    }));
  }, []);

  // Memoized context value
  const contextValue = useMemo<StoryContextValue>(() => ({
    // State
    items: chapters,
    currentChapter,
    isLoading,
    error,

    // Standard methods
    create,
    update,
    delete: deleteChapter,
    getById,
    refresh,

    // Feature-specific methods
    getNextChapter,
    getPreviousChapter,
    setCurrentChapter,
    hasRequiredContext
  }), [
    chapters,
    currentChapter,
    isLoading,
    error,
    create,
    update,
    deleteChapter,
    getById,
    refresh,
    getNextChapter,
    getPreviousChapter,
    setCurrentChapter,
    hasRequiredContext
  ]);

  return (
    <StoryContext.Provider value={contextValue}>
      {children}
    </StoryContext.Provider>
  );
};

export const useStory = (): StoryContextValue => {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
};

// Legacy export for backwards compatibility during transition
export const useStoryData = useStory;