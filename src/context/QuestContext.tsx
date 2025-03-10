// src/context/QuestContext.tsx
import React, { createContext, useContext, useCallback } from 'react';
import { Quest, QuestStatus } from '../types/quest';
import { useQuestData } from '../hooks/useQuestData';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useFirebase } from './FirebaseContext';
import { getUserDisplayName } from '../utils/user-utils';

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
  addQuest: (quest: Omit<Quest, 'id'>) => Promise<string>;
  updateQuest: (quest: Quest) => Promise<void>;
  deleteQuest: (questId: string) => Promise<void>;
  markQuestCompleted: (questId: string, dateCompleted?: string) => Promise<void>;
  markQuestFailed: (questId: string) => Promise<void>;
  refreshQuests: () => Promise<void>;
}

// Create the context but DON'T export it (to match NPCContext pattern)
const QuestContext = createContext<QuestContextValue | undefined>(undefined);

export const QuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the useQuestData hook to handle data fetching
  const { quests, loading, error, getQuestById, refreshQuests } = useQuestData();
  const { addData, updateData, deleteData } = useFirebaseData<Quest>({
    collection: 'quests'
  });
  const { user, userProfile } = useFirebase();

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

  // Generate quest ID from title
  const generateQuestId = useCallback((title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
  }, []);

  // Update quest status
  const updateQuestStatus = useCallback(async (questId: string, status: QuestStatus) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update quest status');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const displayName = getUserDisplayName(userProfile);
    const now = new Date().toISOString();

    const updatedQuest = {
      ...quest,
      status,
      dateModified: now,
      modifiedBy: user.uid,
      modifiedByUsername: displayName,
      // If completing, set the completion date
      ...(status === 'completed' && { dateCompleted: now })
    };

    await updateData(questId, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, getQuestById, updateData, refreshQuests]);

  // Update quest objective completion status
  const updateQuestObjective = useCallback(async (questId: string, objectiveId: string, completed: boolean) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update objectives');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const displayName = getUserDisplayName(userProfile);
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
      dateModified: now,
      modifiedBy: user.uid,
      modifiedByUsername: displayName,
      // Auto-update status to completed if all objectives are done
      ...(allCompleted && quest.status === 'active' && { 
        status: 'completed' as QuestStatus,
        dateCompleted: now
      })
    };

    await updateData(questId, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, getQuestById, updateData, refreshQuests]);

  // Add quest
  const addQuest = useCallback(async (questData: Omit<Quest, 'id'>) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add quests');
    }
  
    const now = new Date().toISOString();
    const displayName = getUserDisplayName(userProfile);
    
    // Generate ID from title
    const id = generateQuestId(questData.title);
  
    // Create the complete quest object including the id
    const newQuest: Quest = {
      id,
      ...questData,
      dateAdded: now,
      dateModified: now,
      createdBy: user.uid,
      createdByUsername: displayName,
      modifiedBy: user.uid,
      modifiedByUsername: displayName,
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
  }, [user, userProfile, addData, refreshQuests, generateQuestId]);

  // Update existing quest
  const updateQuest = useCallback(async (quest: Quest) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update quests');
    }

    const displayName = getUserDisplayName(userProfile);
    const now = new Date().toISOString();

    const updatedQuest = {
      ...quest,
      dateModified: now,
      modifiedBy: user.uid,
      modifiedByUsername: displayName
    };

    await updateData(quest.id, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, updateData, refreshQuests]);

  // Delete quest
  const deleteQuest = useCallback(async (questId: string) => {
    if (!user) {
      throw new Error('User must be authenticated to delete quests');
    }

    await deleteData(questId);
    await refreshQuests();
  }, [user, deleteData, refreshQuests]);

  // Mark quest as completed
  const markQuestCompleted = useCallback(async (questId: string, dateCompleted?: string) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to complete quests');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const displayName = getUserDisplayName(userProfile);
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
      dateModified: now,
      modifiedBy: user.uid,
      modifiedByUsername: displayName,
      objectives: completedObjectives
    };

    await updateData(questId, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, getQuestById, updateData, refreshQuests]);

  // Mark quest as failed
  const markQuestFailed = useCallback(async (questId: string) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to mark quests as failed');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const displayName = getUserDisplayName(userProfile);
    const now = new Date().toISOString();

    const updatedQuest = {
      ...quest,
      status: 'failed' as QuestStatus,
      dateModified: now,
      modifiedBy: user.uid,
      modifiedByUsername: displayName
    };

    await updateData(questId, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, getQuestById, updateData, refreshQuests]);

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
    refreshQuests
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