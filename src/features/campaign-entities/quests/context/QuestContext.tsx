// src/features/campaign-entities/quests/context/QuestContext.tsx
import React, { createContext, useContext, useCallback, useRef } from 'react';
import { Quest, QuestStatus } from '../types';
import { DomainData } from 'core/types/common';
import { useQuestData } from '../hooks/useQuestData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useUser, useGroups, useCampaigns } from 'features/user-management';
import { generateUniqueEntityId } from 'core/utils/entity-id';

// Context interface
interface QuestContextValue {
  quests: Quest[];
  isLoading: boolean;
  loading: boolean; // Add loading as an alias for isLoading for backward compatibility
  error: string | null;
  getQuestById: (id: string) => Quest | undefined;
  getQuestsByStatus: (status: QuestStatus) => Quest[];
  getQuestsByLocation: (locationId: string) => Quest[];
  getQuestsByNPC: (npcId: string) => Quest[];
  updateQuestStatus: (questId: string, status: QuestStatus) => Promise<void>;
  updateQuestObjective: (questId: string, objectiveId: string, completed: boolean) => Promise<void>;
  addQuest: (quest: DomainData<Quest>) => Promise<string>;
  updateQuest: (quest: Quest) => Promise<void>;
  deleteQuest: (questId: string) => Promise<void>;
  markQuestCompleted: (questId: string, dateCompleted?: string) => Promise<void>;
  markQuestFailed: (questId: string) => Promise<void>;
  refreshQuests: () => Promise<void>;
  hasRequiredContext: boolean;
}

// Create the context but DON'T export it (to match NPCContext pattern)
const QuestContext = createContext<QuestContextValue | undefined>(undefined);

export const QuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the useQuestData hook to handle data fetching
  const { quests, loading, error, getQuestById, refreshQuests: fetchQuests, hasRequiredContext } = useQuestData();
  const { addData, updateData, deleteData } = useFirebaseData<Quest>({
    collection: 'quests'
  });
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();

  // Create a wrapper for fetchQuests that returns void instead of Quest[]
  const refreshQuests = useCallback(async (): Promise<void> => {
    await fetchQuests();
  }, [fetchQuests]);

  // Get quests by status
  const getQuestsByStatus = useCallback((status: QuestStatus) => {
    return quests.filter(quest => quest.status === status);
  }, [quests]);

  // Get quests by location
  const getQuestsByLocation = useCallback((locationId: string) => {
    return quests.filter(quest => 
      quest.location === locationId || 
      quest.keyLocations?.some(location => location.name === locationId)
    );
  }, [quests]);

  // Get quests by NPC
  const getQuestsByNPC = useCallback((npcId: string) => {
    return quests.filter(quest => 
      quest.relatedNPCIds?.includes(npcId) || 
      quest.importantNPCs?.some(npc => npc.name === npcId)
    );
  }, [quests]);

  // Ids issued during this session but not yet reflected in `quests` (loaded
  // state). Two quests can be created back-to-back within a single `act()` /
  // event handler before the first create's write has round-tripped through
  // `refreshQuests()` and re-rendered this provider -- a collision check
  // against `getQuestById` alone would miss that first id and silently let
  // the second create overwrite it. This ref is the second source of truth
  // `isTaken` below consults, alongside already-loaded data.
  const issuedIds = useRef<Set<string>>(new Set());

  // Update quest status
  const updateQuestStatus = useCallback(async (questId: string, status: QuestStatus) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update quest status');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to update quest status');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const now = new Date().toISOString();

    const updatedQuest = {
      ...quest,
      status,
      // If completing, set the completion date
      ...(status === 'completed' && { dateCompleted: now })
    };

    await updateData(questId, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, activeGroupId, activeCampaignId, getQuestById, updateData, refreshQuests]);

  // Update quest objective completion status
  const updateQuestObjective = useCallback(async (questId: string, objectiveId: string, completed: boolean) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update objectives');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to update objectives');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const now = new Date().toISOString();

    // Update the specific objective
    const updatedObjectives = quest.objectives.map(obj => 
      obj.id === objectiveId ? { ...obj, completed } : obj
    );

    // Check if all objectives are completed
    const allCompleted = updatedObjectives.every(obj => obj.completed);

    const updatedQuest = {
      ...quest,
      objectives: updatedObjectives,
      // Auto-update status to completed if all objectives are done
      ...(allCompleted && quest.status === 'active' && {
        status: 'completed' as QuestStatus,
        dateCompleted: now
      })
    };

    await updateData(questId, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, activeGroupId, activeCampaignId, getQuestById, updateData, refreshQuests]);

  // Add quest
  const addQuest = useCallback(async (questData: DomainData<Quest>) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add quests');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to add quests');
    }

    // Generate ID from title, disambiguating only on collision
    const isTaken = (candidateId: string) =>
      issuedIds.current.has(candidateId) || Boolean(getQuestById(candidateId));

    const id = generateUniqueEntityId(questData.title, isTaken);
    issuedIds.current.add(id);

    // Not a complete Quest -- attribution is stamped by DocumentService.createDocument,
    // not supplied here. See DomainData's doc comment in core/types/common.ts.
    const newQuest = {
      id,
      ...questData,
      // Ensure arrays are properly initialized
      objectives: questData.objectives || [],
      relatedNPCIds: questData.relatedNPCIds || [],
      leads: questData.leads || [],
      keyLocations: questData.keyLocations || [],
      importantNPCs: questData.importantNPCs || [],
      complications: questData.complications || [],
      rewards: questData.rewards || []
    };
    
    // Add the document with the explicit ID
    await addData(newQuest, id);
    await refreshQuests();
    return id;
  }, [user, userProfile, activeGroupId, activeCampaignId, getQuestById, addData, refreshQuests]);

  // Update existing quest
  const updateQuest = useCallback(async (quest: Quest) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update quests');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to update quests');
    }

    const updatedQuest = {
      ...quest
    };

    await updateData(quest.id, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, activeGroupId, activeCampaignId, updateData, refreshQuests]);

  // Delete quest
  const deleteQuest = useCallback(async (questId: string) => {
    if (!user) {
      throw new Error('User must be authenticated to delete quests');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to delete quests');
    }

    await deleteData(questId);
    await refreshQuests();
  }, [user, activeGroupId, activeCampaignId, deleteData, refreshQuests]);

  // Mark quest as completed
  const markQuestCompleted = useCallback(async (questId: string, dateCompleted?: string) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to complete quests');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to complete quests');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const now = new Date().toISOString();
    const completionDate = dateCompleted || now;

    // Mark all objectives as completed
    const completedObjectives = quest.objectives.map(obj => ({
      ...obj,
      completed: true
    }));

    const updatedQuest = {
      ...quest,
      status: 'completed' as QuestStatus,
      dateCompleted: completionDate,
      objectives: completedObjectives
    };

    await updateData(questId, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, activeGroupId, activeCampaignId, getQuestById, updateData, refreshQuests]);

  // Mark quest as failed
  const markQuestFailed = useCallback(async (questId: string) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to mark quests as failed');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to mark quests as failed');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const updatedQuest = {
      ...quest,
      status: 'failed' as QuestStatus
    };

    await updateData(questId, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, activeGroupId, activeCampaignId, getQuestById, updateData, refreshQuests]);

  const value = {
    quests,
    isLoading: loading, // Keep isLoading for newer components
    loading, // Add loading as an alias for backward compatibility
    error,
    getQuestById,
    getQuestsByStatus,
    getQuestsByLocation,
    getQuestsByNPC,
    updateQuestStatus,
    updateQuestObjective,
    addQuest,
    updateQuest,
    deleteQuest,
    markQuestCompleted,
    markQuestFailed,
    refreshQuests,
    hasRequiredContext
  };

  return (
    <QuestContext.Provider value={value}>
      {children}
    </QuestContext.Provider>
  );
};

// Export the hook directly from the context file
export const useQuests = () => {
  const context = useContext(QuestContext);
  if (context === undefined) {
    throw new Error('useQuests must be used within a QuestProvider');
  }
  return context;
};