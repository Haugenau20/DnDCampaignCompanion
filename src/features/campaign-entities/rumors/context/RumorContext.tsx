// src/features/campaign-entities/rumors/context/RumorContext.tsx - updating rumor context to use character names
import React, { createContext, useContext, useCallback, useRef } from 'react';
import { Rumor, RumorStatus, RumorNote, RumorContextValue } from '../types';
import { DomainData, IdentifiableContent } from 'core/types/common';
import { useRumorData } from '../hooks/useRumorData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useUser, useFirestore } from 'features/user-management';
import { buildCreationAttribution, buildModificationAttribution } from 'core/attribution';
import { generateUniqueEntityId } from 'core/utils/entity-id';

const RumorContext = createContext<RumorContextValue | undefined>(undefined);

export const RumorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rumors, loading, error, refreshRumors } = useRumorData();
  // This second `useFirebaseData` instance is the one whose writes (addData/updateData/
  // deleteData) can actually fail; its `error` is renamed on destructure (`writeError`)
  // because the read instance above already binds the name `error`. Previously this
  // instance's error was never read anywhere, so write failures were invisible (bug #1401).
  const { addData, updateData, deleteData, error: writeError } = useFirebaseData<Rumor>({
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

  // Get rumors by location.
  //
  // Deliberately matches `locationId` only, with no legacy `location`
  // fallback -- unlike `NPCContext.getNPCsByLocation` and
  // `QuestContext.getQuestsByLocation`. For NPCs and Quests, `location` on an
  // un-migrated document may itself hold a location *id* (the sample-data
  // generators wrote it that way), so comparing the incoming id against that
  // free text is a meaningful, if imperfect, fallback. Rumors never had that
  // ambiguity: their `location` has always held a display *name* ("Rivendell"),
  // never an id, so comparing an incoming location id against it would only
  // ever match by coincidence (a location whose name happens to equal its own
  // id-shaped id). Adding the same fallback here would risk false matches
  // without recovering any real ones, so this stays as it was.
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
  const updateRumorNote = useCallback(async (rumorId: string, note: DomainData<RumorNote> & IdentifiableContent) => {
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

  // Ids issued during this session but not yet reflected in `rumors` (loaded
  // state). Two rumors can be created back-to-back within a single `act()` /
  // event handler before the first create's write has round-tripped through
  // `refreshRumors()` and re-rendered this provider -- a collision check
  // against `getRumorById` alone would miss that first id and silently let
  // the second create overwrite it. This ref is the second source of truth
  // `isTaken` below consults, alongside already-loaded data. Shared across
  // addRumor and combineRumors since both write into the same `rumors`
  // collection/id-space.
  const issuedIds = useRef<Set<string>>(new Set());

  const isRumorIdTaken = useCallback(
    (candidateId: string) => issuedIds.current.has(candidateId) || Boolean(getRumorById(candidateId)),
    [getRumorById]
  );

  // Add rumor
  const addRumor = useCallback(async (rumorData: DomainData<Rumor>) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add rumors');
    }

    // Generate ID from title, disambiguating only on collision
    const id = generateUniqueEntityId(rumorData.title, isRumorIdTaken);
    issuedIds.current.add(id);

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
  }, [user, userProfile, addData, refreshRumors, isRumorIdTaken]);

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

    // Generate ID from title, disambiguating only on collision
    const id = generateUniqueEntityId(title, isRumorIdTaken);
    issuedIds.current.add(id);

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
  }, [user, userProfile, getRumorById, addData, updateData, refreshRumors, isRumorIdTaken]);

  // Convert rumors to quest
  const convertToQuest = useCallback(async (rumorIds: string[], questData: any) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to convert rumors to quest');
    }

    const rumorsToConvert = rumorIds.map(id => getRumorById(id)).filter(Boolean) as Rumor[];
    if (rumorsToConvert.length !== rumorIds.length) {
      throw new Error('One or more rumors not found');
    }

    // Generate a proper quest ID from the title. This writes into the
    // `quests` collection, a different id-space than this context tracks, so
    // there is no `isTaken` lookup available here (never was); this call
    // preserves the pre-existing behaviour exactly -- a title that slugifies
    // to a non-empty string keeps that slug, and an empty/missing title falls
    // back to a random id, matching the fallback this replaced.
    const questId = generateUniqueEntityId(questData.title || '', () => false);

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
    // Trailing `|| null` normalizes the type. The real `useFirebaseData` declares
    // `useState<string | null>(null)`, so `writeError` is never `undefined` in
    // production -- but suites that mock the hook return an object with no `error`
    // key at all, which makes this expression `undefined` and violates the
    // `string | null` contract consumers rely on. Cheap to keep, and it means the
    // contract holds regardless of how the hook is supplied.
    error: error || writeError || null,
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