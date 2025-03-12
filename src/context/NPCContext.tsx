// context/NPCContext.tsx
import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { NPC, NPCContextValue, NPCContextState, NPCRelationship, NPCNote } from '../types/npc';
import { useNPCData } from '../hooks/useNPCData';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useGroups, useCampaigns } from './firebase';

const NPCContext = createContext<NPCContextValue | undefined>(undefined);

export const NPCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the NPCData hook for basic CRUD operations
  const { npcs, loading, error, refreshNPCs, hasRequiredContext } = useNPCData();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  
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
    if (!hasRequiredContext) {
      console.error('Cannot update NPC note: No group or campaign selected');
      return;
    }

    const npc = getNPCById(npcId);
    if (npc) {
      const updatedNPC = {
        ...npc,
        notes: [...(npc.notes || []), note]
      };
      await updateData(npcId, updatedNPC);
      refreshNPCs(); // Refresh to get updated data
    }
  }, [getNPCById, updateData, refreshNPCs, hasRequiredContext]);

  // Update NPC relationship
  const updateNPCRelationship = useCallback(async (npcId: string, relationship: NPCRelationship) => {
    if (!hasRequiredContext) {
      console.error('Cannot update NPC relationship: No group or campaign selected');
      return;
    }

    const npc = getNPCById(npcId);
    if (npc) {
      const updatedNPC = {
        ...npc,
        relationship
      };
      await updateData(npcId, updatedNPC);
      refreshNPCs(); // Refresh to get updated data
    }
  }, [getNPCById, updateData, refreshNPCs, hasRequiredContext]);

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