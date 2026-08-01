// src/features/campaign-entities/npcs/context/NPCContext.tsx
import React, { createContext, useContext, useCallback, useMemo, useRef } from 'react';
import { NPC, NPCContextValue, NPCRelationship, NPCNote } from '../types';
import { DomainData } from 'core/types/common';
import { useNPCData } from '../hooks/useNPCData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useGroups, useCampaigns, useAuth, useUser } from 'features/user-management';
import { generateUniqueEntityId } from 'core/utils/entity-id';
import { referencesLocation } from '../../locations/utils/location-display';
import { Location } from '../../locations/types';

const NPCContext = createContext<NPCContextValue | undefined>(undefined);

export const NPCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the NPCData hook for basic CRUD operations
  const { npcs, loading, error, refreshNPCs, hasRequiredContext } = useNPCData();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  
  // Additional Firebase hook for specific updates. Its `error` is renamed on
  // destructure (`writeError`) because the read instance above already binds
  // the name `error` -- this second instance is the one whose writes
  // (addData/updateData/deleteData) can actually fail, and its error was
  // previously dropped entirely (bug #1401).
  const { updateData, deleteData, addData, error: writeError } = useFirebaseData<NPC>({
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

  // Get NPCs by location. Matches the canonical `locationId` first, falling
  // back to a case-insensitive comparison against the legacy free-text
  // `location` -- checked against both the Location's id and its name, since
  // an un-migrated document's `location` may hold either -- for documents
  // written before `locationId` existed. See the contract on `NPC.location`
  // and `referencesLocation`'s doc comment.
  //
  // Takes the whole `Location`, not a bare id: resolving a legacy name back
  // to an id would need the full locations array, and this context is
  // mounted outside `LocationProvider` (see App.tsx), so it has no access to
  // one.
  const getNPCsByLocation = useCallback((location: Location) => {
    return npcs.filter(npc => referencesLocation(npc, location));
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
      throw new Error('Cannot update NPC note: No group or campaign selected');
    }

    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add notes');
    }

    const npc = getNPCById(npcId);
    if (!npc) {
      throw new Error('NPC not found');
    }

    const updatedNPC = {
      ...npc,
      notes: [...(npc.notes || []), note]
    };
    await updateData(npcId, updatedNPC);
    refreshNPCs(); // Refresh to get updated data
  }, [getNPCById, updateData, refreshNPCs, hasRequiredContext, user, userProfile, activeGroupUserProfile]);

  // Update NPC relationship
  const updateNPCRelationship = useCallback(async (npcId: string, relationship: NPCRelationship) => {
    if (!hasRequiredContext) {
      throw new Error('Cannot update NPC relationship: No group or campaign selected');
    }

    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update relationship');
    }

    const npc = getNPCById(npcId);
    if (!npc) {
      throw new Error('NPC not found');
    }

    const updatedNPC = {
      ...npc,
      relationship
    };
    await updateData(npcId, updatedNPC);
    refreshNPCs(); // Refresh to get updated data
  }, [getNPCById, updateData, refreshNPCs, hasRequiredContext, user, userProfile, activeGroupUserProfile]);

  // Ids issued during this session but not yet reflected in `npcs` (loaded
  // state). Two NPCs can be created back-to-back within a single `act()` /
  // event handler before the first create's write has round-tripped through
  // `refreshNPCs()` and re-rendered this provider -- a collision check
  // against `npcs`/`getNPCById` alone would miss that first id and silently
  // let the second create overwrite it. This ref is the second source of
  // truth `isTaken` below consults, alongside already-loaded data.
  const issuedIds = useRef<Set<string>>(new Set());

  // Add a new NPC
  const addNPC = useCallback(async (npcData: DomainData<NPC>): Promise<string> => {
    if (!hasRequiredContext) {
      throw new Error('Cannot add NPC: No group or campaign selected');
    }

    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add an NPC');
    }

    const isTaken = (candidateId: string) =>
      issuedIds.current.has(candidateId) || Boolean(getNPCById(candidateId));

    const id = generateUniqueEntityId(npcData.name, isTaken);
    issuedIds.current.add(id);

    // Not a complete NPC -- attribution is stamped by DocumentService.createDocument,
    // not supplied here. See DomainData's doc comment in core/types/common.ts.
    const newNPC = {
      ...npcData,
      id
    };

    await addData(newNPC, id);
    await refreshNPCs();
    return id;
  }, [hasRequiredContext, user, userProfile, activeGroupUserProfile, getNPCById, addData, refreshNPCs]);

  // Update an existing NPC
  const updateNPC = useCallback(async (npc: NPC): Promise<void> => {
    if (!hasRequiredContext) {
      throw new Error('Cannot update NPC: No group or campaign selected');
    }

    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update an NPC');
    }

    const existingNPC = getNPCById(npc.id);
    if (!existingNPC) {
      throw new Error('NPC not found');
    }

    const updatedNPC = {
      ...npc
    };

    await updateData(npc.id, updatedNPC);
    await refreshNPCs();
  }, [hasRequiredContext, user, userProfile, activeGroupUserProfile, getNPCById, updateData, refreshNPCs]);

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
    // Trailing `|| null` normalizes the type. The real `useFirebaseData` declares
    // `useState<string | null>(null)`, so `writeError` is never `undefined` in
    // production -- but suites that mock the hook return an object with no `error`
    // key at all, which makes this expression `undefined` and violates the
    // `string | null` contract consumers rely on. Cheap to keep, and it means the
    // contract holds regardless of how the hook is supplied.
    error: contextError || error || writeError || null,
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