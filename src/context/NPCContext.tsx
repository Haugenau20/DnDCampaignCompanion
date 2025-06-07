// src/context/NPCContext.tsx
import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react';
import { NPC, NPCContextValue, NPCFormData, NPCRelationship, NPCNote } from '../types/npc';
import { SystemMetadataService } from '../utils/system-metadata';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useGroups, useCampaigns, useAuth, useUser } from './firebase';

const NPCContext = createContext<NPCContextValue | undefined>(undefined);

export const NPCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  
  // Firebase data reading
  const { items: initialNPCs, loading: isLoading, error, refreshData } = useFirebaseData<NPC>({ collection: 'npcs' });
  
  // Firebase operations
  const { updateData, deleteData, addData } = useFirebaseData<NPC>({ collection: 'npcs' });

  // Local state synchronization (like LocationContext)
  const [npcs, setNPCs] = useState<NPC[]>(initialNPCs);

  // Update NPCs when initialNPCs changes
  useEffect(() => {
    setNPCs(initialNPCs);
  }, [initialNPCs]);

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
  const create = useCallback(async (data: NPCFormData): Promise<NPC> => {
    validateAuth();
    
    const id = SystemMetadataService.generateId();
    const systemMetadata = SystemMetadataService.createMetadata(
      user, 
      userProfile, 
      activeGroupUserProfile
    );
    
    const npc: NPC = {
      id,
      ...systemMetadata,
      ...data
    };

    await addData(npc, id);
    
    // Optimistically update the local state
    setNPCs(prevNPCs => [...prevNPCs, npc]);
    
    return npc;
  }, [validateAuth, user, userProfile, activeGroupUserProfile, addData]);

  const update = useCallback(async (id: string, data: NPCFormData): Promise<NPC> => {
    validateAuth();
    
    const existing = npcs.find(npc => npc.id === id);
    if (!existing) {
      throw new Error(`NPC with ID ${id} not found`);
    }

    const updateMetadata = SystemMetadataService.updateMetadata(
      user,
      userProfile,
      activeGroupUserProfile
    );

    const updatedNPC: NPC = {
      ...existing,
      ...data,
      ...updateMetadata
    };

    await updateData(id, updatedNPC);
    
    // Optimistically update the local state
    setNPCs(prevNPCs => 
      prevNPCs.map(npc => 
        npc.id === id ? updatedNPC : npc
      )
    );
    
    return updatedNPC;
  }, [validateAuth, npcs, user, userProfile, activeGroupUserProfile, updateData]);

  const deleteNPC = useCallback(async (id: string): Promise<void> => {
    validateAuth();
    await deleteData(id);
    
    // Optimistically update the local state
    setNPCs(prevNPCs => 
      prevNPCs.filter(npc => npc.id !== id)
    );
  }, [validateAuth, deleteData]);

  const getById = useCallback((id: string): NPC | undefined => {
    return npcs.find(npc => npc.id === id);
  }, [npcs]);

  const refresh = useCallback(async (): Promise<void> => {
    await refreshData();
  }, [refreshData]);

  // Feature-specific methods
  const getByQuest = useCallback((questId: string): NPC[] => {
    return npcs.filter(npc => 
      npc.connections.relatedQuests.includes(questId)
    );
  }, [npcs]);

  const getByLocation = useCallback((location: string): NPC[] => {
    return npcs.filter(npc => 
      npc.location?.toLowerCase() === location.toLowerCase()
    );
  }, [npcs]);

  const getByRelationship = useCallback((relationship: NPCRelationship): NPC[] => {
    return npcs.filter(npc => npc.relationship === relationship);
  }, [npcs]);

  const updateNote = useCallback(async (npcId: string, note: NPCNote): Promise<void> => {
    const existing = getById(npcId);
    if (!existing) {
      throw new Error(`NPC with ID ${npcId} not found`);
    }

    const updatedData: NPCFormData = {
      ...existing,
      notes: [...(existing.notes || []), note]
    };

    await update(npcId, updatedData);
  }, [getById, update]);

  const updateRelationship = useCallback(async (npcId: string, relationship: NPCRelationship): Promise<void> => {
    const existing = getById(npcId);
    if (!existing) {
      throw new Error(`NPC with ID ${npcId} not found`);
    }

    const updatedData: NPCFormData = {
      ...existing,
      relationship
    };

    await update(npcId, updatedData);
  }, [getById, update]);

  // Memoized context value
  const contextValue = useMemo<NPCContextValue>(() => ({
    // Legacy state structure for compatibility
    npcs,
    isLoading,
    error,

    // Legacy methods for compatibility  
    getNPCById: getById,
    addNPC: create,
    updateNPC: update,
    deleteNPC,
    updateNPCNote: updateNote,
    updateNPCRelationship: updateRelationship,
    getNPCsByQuest: getByQuest,
    getNPCsByLocation: getByLocation,
    getNPCsByRelationship: getByRelationship,

    // New standardized methods (for future migration)
    items: npcs,
    create,
    update,
    delete: deleteNPC,
    getById,
    refresh,
    getByQuest,
    getByLocation,
    getByRelationship,
    updateNote,
    updateRelationship
  }), [
    npcs,
    isLoading,
    error,
    create,
    update,
    deleteNPC,
    getById,
    refresh,
    getByQuest,
    getByLocation,
    getByRelationship,
    updateNote,
    updateRelationship
  ]);

  return (
    <NPCContext.Provider value={contextValue}>
      {children}
    </NPCContext.Provider>
  );
};

export const useNPCs = (): NPCContextValue => {
  const context = useContext(NPCContext);
  if (!context) {
    throw new Error('useNPCs must be used within an NPCProvider');
  }
  return context;
};

// Legacy export for backwards compatibility during transition
export const useNPCData = useNPCs;