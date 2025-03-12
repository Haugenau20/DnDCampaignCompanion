// src/context/RumorContext.tsx - updating rumor context to use character names
import React, { createContext, useContext, useCallback } from 'react';
import { Rumor, RumorStatus, RumorNote, RumorContextValue } from '../types/rumor';
import { useRumorData } from '../hooks/useRumorData';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useAuth, useUser, useFirestore } from './firebase';
import { getUserDisplayName } from '../utils/user-utils';

const RumorContext = createContext<RumorContextValue | undefined>(undefined);

export const RumorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rumors, loading, error, refreshRumors } = useRumorData();
  const { addData, updateData, deleteData } = useFirebaseData<Rumor>({
    collection: 'rumors'
  });
  const { user } = useAuth();
  const { userProfile } = useUser();
  const { setDocument } = useFirestore();

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

    const displayName = getUserDisplayName(userProfile); // Use the utility function

    const updatedRumor = {
      ...rumor,
      status,
      dateModified: new Date().toISOString(),
      modifiedBy: user.uid,
      modifiedByUsername: displayName
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

    const displayName = getUserDisplayName(userProfile);

    const noteWithUser = {
      ...note,
      addedBy: user.uid,
      addedByUsername: displayName,
      dateAdded: new Date().toISOString()
    };

    const updatedRumor = {
      ...rumor,
      notes: [...rumor.notes, noteWithUser],
      dateModified: new Date().toISOString(),
      modifiedBy: user.uid,
      modifiedByUsername: displayName
    };

    await updateData(rumorId, updatedRumor);
    refreshRumors();
  }, [user, userProfile, getRumorById, updateData, refreshRumors, getUserDisplayName]);

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
  
    const now = new Date().toISOString();
    const displayName = getUserDisplayName(userProfile);
    
    // Generate ID from title
    const id = generateRumorId(rumorData.title);
  
    // Create the complete rumor object including the id
    const newRumor: Rumor = {
      id,  // Include the ID in the object
      ...rumorData,
      dateAdded: now,
      dateModified: now,
      createdBy: user.uid,
      createdByUsername: displayName,
      modifiedBy: user.uid,
      modifiedByUsername: displayName,
      // Ensure arrays are properly initialized
      relatedNPCs: rumorData.relatedNPCs || [],
      relatedLocations: rumorData.relatedLocations || [],
      notes: rumorData.notes || []
    };
    
    // Add the document with the explicit ID
    await addData(newRumor, id);
    refreshRumors();
    return id;
  }, [user, userProfile, addData, refreshRumors, generateRumorId, getUserDisplayName]);

  // Update existing rumor
  const updateRumor = useCallback(async (rumor: Rumor) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update rumors');
    }

    const displayName = getUserDisplayName(userProfile);

    const updatedRumor = {
      ...rumor,
      dateModified: new Date().toISOString(),
      modifiedBy: user.uid,
      modifiedByUsername: displayName
    };

    await updateData(rumor.id, updatedRumor);
    refreshRumors();
  }, [user, userProfile, updateData, refreshRumors, getUserDisplayName]);

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
  
    // Create the new combined rumor
    const now = new Date().toISOString();
    const displayName = getUserDisplayName(userProfile);
    
    // Use the provided title or generate one
    const title = newRumorData.title || `Combined Rumor (${new Date().toLocaleDateString()})`;
    
    // Generate ID from title
    const id = generateRumorId(title);
    
    // Initialize the notes array with a new note about the combination
    const initialNotes = [{
      id: crypto.randomUUID(),
      content: `Combined from rumors: ${rumorIds.join(', ')}`,
      dateAdded: now,
      addedBy: user.uid,
      addedByUsername: displayName
    }];
  
    const newRumor: Rumor = {
      id,
      title,
      content: combinedContent,
      status: newRumorData.status || 'unconfirmed',
      sourceType: newRumorData.sourceType || 'other',
      sourceName: newRumorData.sourceName || 'Multiple Sources',
      dateAdded: now,
      dateModified: now,
      createdBy: user.uid,
      createdByUsername: displayName,
      modifiedBy: user.uid,
      modifiedByUsername: displayName,
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
          dateModified: now,
          modifiedBy: user.uid,
          modifiedByUsername: displayName,
          notes: [
            ...existingNotes,
            {
              id: crypto.randomUUID(),
              content: `Combined into rumor: ${id}`,
              dateAdded: now,
              addedBy: user.uid,
              addedByUsername: displayName
            }
          ]
        };
        
        await updateData(rumorId, updatedRumor);
      }
    }
  
    refreshRumors();
    return id;
  }, [user, userProfile, getRumorById, addData, updateData, refreshRumors, generateRumorId, getUserDisplayName]);

  // Convert rumors to quest
  const convertToQuest = useCallback(async (rumorIds: string[], questData: any) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to convert rumors to quest');
    }

    const rumorsToConvert = rumorIds.map(id => getRumorById(id)).filter(Boolean) as Rumor[];
    if (rumorsToConvert.length !== rumorIds.length) {
      throw new Error('One or more rumors not found');
    }

    // Create a new quest based on the rumors and provided quest data
    const now = new Date().toISOString();
    const displayName = getUserDisplayName(userProfile);
    
    // Generate a proper quest ID from the title
    const questId = questData.title 
      ? questData.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      : crypto.randomUUID();
    
    // Use Firebase service to add quest
    await setDocument('quests', questId, {
      ...questData,
      id: questId,
      dateAdded: now,
      createdBy: user.uid,
      createdByUsername: displayName
    });

    // Update all rumors to mark them as converted
    for (const rumorId of rumorIds) {
      const rumor = getRumorById(rumorId);
      if (rumor) {
        await updateData(rumorId, {
          ...rumor,
          convertedToQuestId: questId,
          dateModified: now,
          modifiedBy: user.uid,
          modifiedByUsername: displayName,
          notes: [
            ...rumor.notes,
            {
              id: crypto.randomUUID(),
              content: `Converted to quest: ${questId}`,
              dateAdded: now,
              addedBy: user.uid,
              addedByUsername: displayName
            }
          ]
        });
      }
    }

    refreshRumors();
    return questId;
  }, [user, userProfile, getRumorById, updateData, refreshRumors, getUserDisplayName]);

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