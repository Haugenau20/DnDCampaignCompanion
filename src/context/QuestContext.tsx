// src/context/QuestContext.tsx
import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { Quest, QuestContextValue, QuestFormData, QuestStatus } from '../types/quest';
import { SystemMetadataService } from '../utils/system-metadata';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useGroups, useCampaigns, useAuth, useUser } from './firebase';

const QuestContext = createContext<QuestContextValue | undefined>(undefined);

export const QuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  
  // Firebase data reading
  const { items: initialQuests, loading: isLoading, error, refreshData } = useFirebaseData<Quest>({ collection: 'quests' });
  
  // Firebase operations
  const { updateData, deleteData, addData } = useFirebaseData<Quest>({ collection: 'quests' });

  // Local state synchronization (like LocationContext)
  const [quests, setQuests] = useState<Quest[]>(initialQuests);

  // Update quests when initialQuests changes
  useEffect(() => {
    setQuests(initialQuests);
  }, [initialQuests]);

  // Check if we have required context - temporarily relaxed like LocationContext
  const hasRequiredContext = true; // TODO: Implement proper context checking

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
  const create = useCallback(async (data: QuestFormData): Promise<Quest> => {
    validateAuth();
    
    const id = SystemMetadataService.generateId();
    const systemMetadata = SystemMetadataService.createMetadata(
      user, 
      userProfile, 
      activeGroupUserProfile
    );
    
    const quest: Quest = {
      id,
      ...systemMetadata,
      ...data
    };

    await addData(quest, id);
    
    // Optimistically update the local state
    setQuests(prevQuests => [...prevQuests, quest]);
    
    return quest;
  }, [validateAuth, user, userProfile, activeGroupUserProfile, addData]);

  const update = useCallback(async (id: string, data: QuestFormData): Promise<Quest> => {
    validateAuth();
    
    const existing = quests.find(quest => quest.id === id);
    if (!existing) {
      throw new Error(`Quest with ID ${id} not found`);
    }

    const updateMetadata = SystemMetadataService.updateMetadata(
      user,
      userProfile,
      activeGroupUserProfile
    );

    const updatedQuest: Quest = {
      ...existing,
      ...data,
      ...updateMetadata
    };

    await updateData(id, updatedQuest);
    
    // Optimistically update the local state
    setQuests(prevQuests => 
      prevQuests.map(quest => 
        quest.id === id ? updatedQuest : quest
      )
    );
    
    return updatedQuest;
  }, [validateAuth, quests, user, userProfile, activeGroupUserProfile, updateData]);

  const deleteQuest = useCallback(async (id: string): Promise<void> => {
    validateAuth();
    await deleteData(id);
    
    // Optimistically update the local state
    setQuests(prevQuests => 
      prevQuests.filter(quest => quest.id !== id)
    );
  }, [validateAuth, deleteData]);

  const getById = useCallback((id: string): Quest | undefined => {
    return quests.find(quest => quest.id === id);
  }, [quests]);

  const refresh = useCallback(async (): Promise<void> => {
    await refreshData();
  }, [refreshData]);

  // Feature-specific methods
  const getByStatus = useCallback((status: QuestStatus): Quest[] => {
    return quests.filter(quest => quest.status === status);
  }, [quests]);

  const getByLocation = useCallback((location: string): Quest[] => {
    return quests.filter(quest => 
      quest.location?.toLowerCase() === location.toLowerCase()
    );
  }, [quests]);

  const updateStatus = useCallback(async (questId: string, status: QuestStatus): Promise<void> => {
    const existing = getById(questId);
    if (!existing) {
      throw new Error(`Quest with ID ${questId} not found`);
    }

    const updatedData: QuestFormData = {
      ...existing,
      status,
      dateCompleted: status === 'completed' ? new Date().toISOString() : existing.dateCompleted
    };

    await update(questId, updatedData);
  }, [getById, update]);

  const updateObjective = useCallback(async (questId: string, objectiveId: string, completed: boolean): Promise<void> => {
    const existing = getById(questId);
    if (!existing) {
      throw new Error(`Quest with ID ${questId} not found`);
    }

    const updatedObjectives = existing.objectives.map(obj =>
      obj.id === objectiveId ? { ...obj, completed } : obj
    );

    const updatedData: QuestFormData = {
      ...existing,
      objectives: updatedObjectives
    };

    await update(questId, updatedData);
  }, [getById, update]);

  // Memoized context value
  const contextValue = useMemo<QuestContextValue>(() => ({
    // Legacy state structure for compatibility
    quests,
    isLoading,
    loading: isLoading, // Additional legacy alias
    error,
    hasRequiredContext,

    // Legacy methods for compatibility
    getQuestById: getById,
    addQuest: create,
    updateQuest: update,
    deleteQuest,
    getQuestsByStatus: getByStatus,
    getQuestsByLocation: getByLocation,
    updateQuestStatus: updateStatus,
    updateQuestObjective: updateObjective,
    refreshQuests: refresh,

    // New standardized methods (for future migration)
    items: quests,
    create,
    update,
    delete: deleteQuest,
    getById,
    refresh,
    getByStatus,
    getByLocation,
    updateStatus,
    updateObjective
  } as any), [
    quests,
    isLoading,
    error,
    create,
    update,
    deleteQuest,
    getById,
    refresh,
    getByStatus,
    getByLocation,
    updateStatus,
    updateObjective
  ]);

  return (
    <QuestContext.Provider value={contextValue}>
      {children}
    </QuestContext.Provider>
  );
};

export const useQuests = (): QuestContextValue => {
  const context = useContext(QuestContext);
  if (!context) {
    throw new Error('useQuests must be used within a QuestProvider');
  }
  return context;
};

// Legacy export for backwards compatibility during transition
export const useQuestData = useQuests;