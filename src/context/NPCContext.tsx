// context/NPCContext.tsx
import React, { createContext, useContext, useCallback } from 'react';
import { NPC, NPCContextValue, NPCContextState, NPCRelationship, NPCNote } from '../types/npc';
import { useNPCData } from '../hooks/useNPCData';
import { useFirebaseData } from '../hooks/useFirebaseData';

const NPCContext = createContext<NPCContextValue | undefined>(undefined);

export const NPCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the NPCData hook for basic CRUD operations
  const { npcs, loading, error, refreshNPCs } = useNPCData();
  
  // Additional Firebase hook for specific updates
  const { updateData } = useFirebaseData<NPC>({
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
    const npc = getNPCById(npcId);
    if (npc) {
      const updatedNPC = {
        ...npc,
        notes: [...(npc.notes || []), note]
      };
      await updateData(npcId, updatedNPC);
      refreshNPCs(); // Refresh to get updated data
    }
  }, [getNPCById, updateData, refreshNPCs]);

  // Update NPC relationship
  const updateNPCRelationship = useCallback(async (npcId: string, relationship: NPCRelationship) => {
    const npc = getNPCById(npcId);
    if (npc) {
      const updatedNPC = {
        ...npc,
        relationship
      };
      await updateData(npcId, updatedNPC);
      refreshNPCs(); // Refresh to get updated data
    }
  }, [getNPCById, updateData, refreshNPCs]);

  const value: NPCContextValue = {
    npcs,
    isLoading: loading,
    error,
    getNPCById,
    getNPCsByQuest,
    getNPCsByLocation,
    getNPCsByRelationship,
    updateNPCNote,
    updateNPCRelationship,
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