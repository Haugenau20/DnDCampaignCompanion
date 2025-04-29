// context/NPCContext.tsx
import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { NPC, NPCContextValue, NPCRelationship, NPCNote } from '../types/npc';
import { ContentAttribution, BaseContent } from '../types/common';
import { useNPCData } from '../hooks/useNPCData';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useGroups, useCampaigns, useAuth, useUser } from './firebase';
import { getUserName, getActiveCharacterName } from '../utils/user-utils';

const NPCContext = createContext<NPCContextValue | undefined>(undefined);

export const NPCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the NPCData hook for basic CRUD operations
  const { npcs, loading, error, refreshNPCs, hasRequiredContext } = useNPCData();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  
  // Additional Firebase hook for specific updates
  const { updateData, deleteData, addData } = useFirebaseData<NPC>({
    collection: 'npcs'
  });

  // Get NPC by ID
  const getNPCById = useCallback((id: string) => {
    return npcs.find(npc => npc.id === id);
  }, [npcs]);

  // Get NPCs by quest
  const getNPCsByQuest = useCallback((questId: string) => {
    return npcs.filter(npc => 
      npc.connections.relatedQuests.includes(questId)
    );
  }, [npcs]);

  // Get NPCs by location
  const getNPCsByLocation = useCallback((location: string) => {
    return npcs.filter(npc => 
      npc.location?.toLowerCase() === location.toLowerCase()
    );
  }, [npcs]);

  // Get NPCs by relationship
  const getNPCsByRelationship = useCallback((relationship: NPCRelationship) => {
    return npcs.filter(npc => 
      npc.relationship === relationship
    );
  }, [npcs]);

  // Update NPC note
  const updateNPCNote = useCallback(async (npcId: string, note: NPCNote) => {
    if (!hasRequiredContext) {
      console.error('Cannot update NPC note: No group or campaign selected');
      return;
    }

    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add notes');
    }

    const npc = getNPCById(npcId);
    if (npc) {
      // Create modification attribution data
      const modificationAttribution: Partial<ContentAttribution> = {
        modifiedBy: user.uid,
        modifiedByUsername: getUserName(activeGroupUserProfile),
        modifiedByCharacterId: activeGroupUserProfile?.activeCharacterId || null,
        modifiedByCharacterName: getActiveCharacterName(activeGroupUserProfile),
        dateModified: new Date().toISOString()
      };

      const updatedNPC = {
        ...npc,
        notes: [...(npc.notes || []), note],
        ...modificationAttribution
      };
      await updateData(npcId, updatedNPC);
      refreshNPCs(); // Refresh to get updated data
    }
  }, [getNPCById, updateData, refreshNPCs, hasRequiredContext, user, userProfile, activeGroupUserProfile]);

  // Update NPC relationship
  const updateNPCRelationship = useCallback(async (npcId: string, relationship: NPCRelationship) => {
    if (!hasRequiredContext) {
      console.error('Cannot update NPC relationship: No group or campaign selected');
      return;
    }

    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update relationship');
    }

    const npc = getNPCById(npcId);
    if (npc) {
      // Create modification attribution data
      const modificationAttribution: Partial<ContentAttribution> = {
        modifiedBy: user.uid,
        modifiedByUsername: getUserName(activeGroupUserProfile),
        modifiedByCharacterId: activeGroupUserProfile?.activeCharacterId || null,
        modifiedByCharacterName: getActiveCharacterName(activeGroupUserProfile),
        dateModified: new Date().toISOString()
      };

      const updatedNPC = {
        ...npc,
        relationship,
        ...modificationAttribution
      };
      await updateData(npcId, updatedNPC);
      refreshNPCs(); // Refresh to get updated data
    }
  }, [getNPCById, updateData, refreshNPCs, hasRequiredContext, user, userProfile, activeGroupUserProfile]);

  // Generate NPC ID from name
  const generateNPCId = useCallback((name: string): string => {
    return name.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
  }, []);

  // Add a new NPC
  const addNPC = useCallback(async (npcData: Omit<NPC, 'id'>): Promise<string> => {
    if (!hasRequiredContext) {
      throw new Error('Cannot add NPC: No group or campaign selected');
    }

    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add an NPC');
    }
    
    // Generate ID from name
    const id = generateNPCId(npcData.name);
    
    // Create the complete NPC with ID
    const newNPC: NPC = {
      ...npcData,
      id
    };
    
    // Add to Firebase with explicit ID
    await addData(newNPC, id);
    await refreshNPCs();
    return id;
  }, [hasRequiredContext, user, userProfile, generateNPCId, addData, refreshNPCs]);

  // Update an existing NPC
  const updateNPC = useCallback(async (npc: NPC): Promise<void> => {
    if (!hasRequiredContext) {
      throw new Error('Cannot update NPC: No group or campaign selected');
    }

    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update an NPC');
    }

    const now = new Date().toISOString();
    
    // Create modification attribution data
    const modificationAttribution: Partial<ContentAttribution> = {
      modifiedBy: user.uid,
      modifiedByUsername: getUserName(activeGroupUserProfile),
      modifiedByCharacterId: activeGroupUserProfile?.activeCharacterId || null,
      modifiedByCharacterName: getActiveCharacterName(activeGroupUserProfile),
      dateModified: now
    };
    
    // Update the NPC with new modification attribution
    const updatedNPC = {
      ...npc,
      ...modificationAttribution
    };
    
    await updateData(npc.id, updatedNPC);
    await refreshNPCs();
  }, [hasRequiredContext, user, userProfile, activeGroupUserProfile, updateData, refreshNPCs]);

  // Delete an NPC
  const deleteNPC = useCallback(async (npcId: string): Promise<void> => {
    if (!hasRequiredContext) {
      throw new Error('Cannot delete NPC: No group or campaign selected');
    }

    if (!user) {
      throw new Error('User must be authenticated to delete an NPC');
    }

    await deleteData(npcId);
    await refreshNPCs();
  }, [hasRequiredContext, user, deleteData, refreshNPCs]);

  // Error message for missing context
  const contextError = useMemo(() => {
    if (!activeGroupId) return "Please select a group to view NPCs";
    if (!activeCampaignId) return "Please select a campaign to view NPCs";
    return null;
  }, [activeGroupId, activeCampaignId]);

  const value: NPCContextValue = {
    npcs,
    isLoading: loading,
    error: contextError || error,
    getNPCById,
    getNPCsByQuest,
    getNPCsByLocation,
    getNPCsByRelationship,
    updateNPCNote,
    updateNPCRelationship,
    addNPC,
    updateNPC,
    deleteNPC
  };

  return (
    <NPCContext.Provider value={value}>
      {children}
    </NPCContext.Provider>
  );
};

export const useNPCs = () => {
  const context = useContext(NPCContext);
  if (context === undefined) {
    throw new Error('useNPCs must be used within an NPCProvider');
  }
  return context;
};