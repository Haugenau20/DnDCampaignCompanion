// src/features/campaign-entities/rumors/context/RumorContext.tsx - updating rumor context to use character names
import React, { createContext, useContext, useCallback } from 'react';
import { Rumor, RumorStatus, RumorNote, RumorContextValue } from '../types';
import { useRumorData } from '../hooks/useRumorData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useUser, useFirestore } from 'features/user-management';
import { buildCreationAttribution, buildModificationAttribution } from 'shared/attribution';

const RumorContext = createContext<RumorContextValue | undefined>(undefined);

export const RumorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rumors, loading, error, refreshRumors } = useRumorData();
  const { addData, updateData, deleteData } = useFirebaseData<Rumor>({
    collection: 'rumors'
  });
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  const { createDocument } = useFirestore();

  // Get rumor by ID
  const getRumorById = useCallback((id: string) => {
    return rumors.find(rumor => rumor.id === id);
  }, [rumors]);

  // Get rumors by status
  const getRumorsByStatus = useCallback((status: RumorStatus) => {
    return rumors.filter(rumor => rumor.status === status);
  }, [rumors]);

  // Get rumors by location
  const getRumorsByLocation = useCallback((locationId: string) => {
    return rumors.filter(rumor => rumor.locationId === locationId);
  }, [rumors]);

  // Get rumors by NPC
  const getRumorsByNPC = useCallback((npcId: string) => {
    return rumors.filter(rumor => 
      rumor.sourceNpcId === npcId || rumor.relatedNPCs.includes(npcId)
    );
  }, [rumors]);

  // Update rumor status
  const updateRumorStatus = useCallback(async (rumorId: string, status: RumorStatus) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update rumor status');
    }

    const rumor = getRumorById(rumorId);
    if (!rumor) {
      throw new Error('Rumor not found');
    }

    const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });

    const updatedRumor = {
      ...rumor,
      status,
      ...modificationAttribution
    };

    await updateData(rumorId, updatedRumor);
    refreshRumors();
  }, [user, userProfile, getRumorById, updateData, refreshRumors]);

  // Update rumor note
  const updateRumorNote = useCallback(async (rumorId: string, note: RumorNote) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add notes');
    }

    const rumor = getRumorById(rumorId);
    if (!rumor) {
      throw new Error('Rumor not found');
    }

    const creationAttribution = buildCreationAttribution({ uid: user.uid, activeGroupUserProfile });
    const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });

    const noteWithUser = {
      ...note,
      ...creationAttribution
    };

    const updatedRumor = {
      ...rumor,
      notes: [...rumor.notes, noteWithUser],
      ...modificationAttribution
    };

    await updateData(rumorId, updatedRumor);
    refreshRumors();
  }, [user, userProfile, getRumorById, updateData, refreshRumors]);

  // Generate rumor ID from title
  const generateRumorId = useCallback((title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
  }, []);
  
  // Add rumor
  const addRumor = useCallback(async (rumorData: Omit<Rumor, 'id'>) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add rumors');
    }
  
    // Generate ID from title
    const id = generateRumorId(rumorData.title);

    const creationAttribution = buildCreationAttribution({ uid: user.uid, activeGroupUserProfile });

    // Create the complete rumor object including the id
    const newRumor: Rumor = {
      id,  // Include the ID in the object
      ...rumorData,
      ...creationAttribution,
      // Ensure arrays are properly initialized
      relatedNPCs: rumorData.relatedNPCs || [],
      relatedLocations: rumorData.relatedLocations || [],
      notes: rumorData.notes || []
    };

    // Add the document with the explicit ID
    await addData(newRumor, id);
    refreshRumors();
    return id;
  }, [user, userProfile, addData, refreshRumors, generateRumorId]);

  // Update existing rumor
  const updateRumor = useCallback(async (rumor: Rumor) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update rumors');
    }

    const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });

    const updatedRumor = {
      ...rumor,
      ...modificationAttribution
    };

    await updateData(rumor.id, updatedRumor);
    refreshRumors();
  }, [user, userProfile, updateData, refreshRumors]);

  // Delete rumor
  const deleteRumor = useCallback(async (rumorId: string) => {
    if (!user) {
      throw new Error('User must be authenticated to delete rumors');
    }

    await deleteData(rumorId);
    refreshRumors();
  }, [user, deleteData, refreshRumors]);

  // Combine multiple rumors into one
  const combineRumors = useCallback(async (rumorIds: string[], newRumorData: Partial<Rumor>) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to combine rumors');
    }
  
    const rumorsToMerge = rumorIds.map(id => getRumorById(id)).filter(Boolean) as Rumor[];
    if (rumorsToMerge.length !== rumorIds.length) {
      throw new Error('One or more rumors not found');
    }
  
    // Create the combined rumor content if not provided
    const combinedContent = newRumorData.content || 
      rumorsToMerge.map(rumor => 
        `${rumor.title} (from ${rumor.sourceName}): ${rumor.content}`
      ).join('\n\n');
  
    // Gather all related NPCs and locations
    const relatedNPCs = [...new Set(
      rumorsToMerge.flatMap(rumor => 
        Array.isArray(rumor.relatedNPCs) ? rumor.relatedNPCs : []
      )
    )];
    
    const relatedLocations = [...new Set(
      rumorsToMerge.flatMap(rumor => 
        Array.isArray(rumor.relatedLocations) ? rumor.relatedLocations : []
      )
    )];
  
    // Use the provided title or generate one
    const title = newRumorData.title || `Combined Rumor (${new Date().toLocaleDateString()})`;

    // Generate ID from title
    const id = generateRumorId(title);

    // Compute attribution once and reuse across the new rumor, its initial
    // note, and every original rumor updated below so the whole combine
    // operation is attributed to a single actor/timestamp pair.
    const creationAttribution = buildCreationAttribution({ uid: user.uid, activeGroupUserProfile });
    const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });

    // Initialize the notes array with a new note about the combination
    const initialNotes = [{
      id: crypto.randomUUID(),
      content: `Combined from rumors: ${rumorIds.join(', ')}`,
      ...creationAttribution
    }];

    const newRumor: Rumor = {
      id,
      title,
      content: combinedContent,
      status: newRumorData.status || 'unconfirmed',
      sourceType: newRumorData.sourceType || 'other',
      sourceName: newRumorData.sourceName || 'Multiple Sources',
      ...creationAttribution,
      relatedNPCs,
      relatedLocations,
      notes: initialNotes  // Use our explicit notes array
    };

    // Add the new combined rumor with the explicit ID
    await addData(newRumor, id);

    // Mark original rumors as confirmed and linked to the new rumor
    for (const rumorId of rumorIds) {
      const rumor = getRumorById(rumorId);
      if (rumor) {
        // Make sure the notes array is defined before trying to spread it
        const existingNotes = Array.isArray(rumor.notes) ? rumor.notes : [];

        // Explicitly set status as a RumorStatus type
        const updatedRumor: Partial<Rumor> = {
          ...rumor,
          status: 'confirmed' as RumorStatus, // Explicitly cast to RumorStatus
          ...modificationAttribution,
          notes: [
            ...existingNotes,
            {
              id: crypto.randomUUID(),
              content: `Combined into rumor: ${id}`,
              ...creationAttribution
            }
          ]
        };

        await updateData(rumorId, updatedRumor);
      }
    }

    refreshRumors();
    return id;
  }, [user, userProfile, getRumorById, addData, updateData, refreshRumors, generateRumorId]);

  // Convert rumors to quest
  const convertToQuest = useCallback(async (rumorIds: string[], questData: any) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to convert rumors to quest');
    }

    const rumorsToConvert = rumorIds.map(id => getRumorById(id)).filter(Boolean) as Rumor[];
    if (rumorsToConvert.length !== rumorIds.length) {
      throw new Error('One or more rumors not found');
    }

    // Generate a proper quest ID from the title
    const questId = questData.title
      ? questData.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : crypto.randomUUID();

    // Compute attribution once and reuse across the new quest document and
    // every original rumor updated below so the whole conversion operation
    // is attributed to a single actor/timestamp pair.
    const creationAttribution = buildCreationAttribution({ uid: user.uid, activeGroupUserProfile });
    const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });

    // Use the attribution-aware create path: this genuinely creates a new
    // quest document, so DocumentService.createDocument stamps attribution
    // for it (rather than the context hand-rolling it via creationAttribution).
    await createDocument('quests', {
      ...questData,
      id: questId
    }, questId);

    // Update all rumors to mark them as converted
    for (const rumorId of rumorIds) {
      const rumor = getRumorById(rumorId);
      if (rumor) {
        await updateData(rumorId, {
          ...rumor,
          convertedToQuestId: questId,
          ...modificationAttribution,
          notes: [
            ...rumor.notes,
            {
              id: crypto.randomUUID(),
              content: `Converted to quest: ${questId}`,
              ...creationAttribution
            }
          ]
        });
      }
    }

    refreshRumors();
    return questId;
  }, [user, userProfile, getRumorById, updateData, refreshRumors]);

  const value: RumorContextValue = {
    rumors,
    isLoading: loading,
    error,
    getRumorById,
    getRumorsByStatus,
    getRumorsByLocation,
    getRumorsByNPC,
    updateRumorStatus,
    updateRumorNote,
    addRumor,
    updateRumor,
    deleteRumor,
    combineRumors,
    convertToQuest
  };

  return (
    <RumorContext.Provider value={value}>
      {children}
    </RumorContext.Provider>
  );
};

export const useRumors = () => {
  const context = useContext(RumorContext);
  if (context === undefined) {
    throw new Error('useRumors must be used within a RumorProvider');
  }
  return context;
};