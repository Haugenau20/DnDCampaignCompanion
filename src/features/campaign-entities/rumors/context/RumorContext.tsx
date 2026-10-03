// src/features/campaign-entities/rumors/context/RumorContext.tsx - updating rumor context to use character names
import React, { createContext, useContext, useCallback, useRef } from 'react';
import { Rumor, RumorStatus, RumorNote, RumorContextValue } from '../types';
import { DomainData, IdentifiableContent } from 'core/types/common';
import { useRumorData } from '../hooks/useRumorData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useUser, useFirestore } from 'features/user-management';
import { buildCreationAttribution, buildModificationAttribution } from 'core/attribution';
import { createWithUniqueEntityId } from 'core/utils/entity-id';
import { rumorParagraph } from '../utils/rumor-title';
import { createListenerDemandContext, useListenerDemand, ListReaderOptions } from 'shared/hooks/useListenerDemand';
import { MAX_BATCH_WRITES } from '../../shared/commitEntityWrites';

const RumorContext = createContext<RumorContextValue | undefined>(undefined);

/**
 * Who is reading this provider's list right now (T032, `PERF-03`): the
 * listener is open only while some component that called `useRumors()` is
 * mounted, and for a while after. See `useListenerDemand`.
 */
const { DemandProvider: RumorDemandProvider, useDemand: useRumorDemand } = createListenerDemandContext();

export const RumorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const demand = useListenerDemand();
  const { rumors, loading, error } = useRumorData({ enabled: demand.wanted });
  // This second `useFirebaseData` instance is the one whose writes (addData/updateData/
  // deleteData) can actually fail; its `error` is renamed on destructure (`writeError`)
  // because the read instance above already binds the name `error`. Previously this
  // instance's error was never read anywhere, so write failures were invisible (bug #1401).
  //
  // `autoFetch: false` because nothing renders off its `data`: the list comes
  // from `useRumorData()` above.
  const { addData, updateData, deleteData, error: writeError } = useFirebaseData<Rumor>({
    collection: 'rumors',
    autoFetch: false
  });
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  const { createDocument, batchOperations } = useFirestore();

  /**
   * Writes to several rumours, committed as one batch (T032, `PERF-06`): one
   * round trip instead of one per rumour, and all or nothing, so a batch
   * action can never stop halfway through the selection.
   */
  const commitRumorWrites = useCallback(async (writes: Array<{
    type: 'update' | 'delete';
    id: string;
    data?: Partial<Rumor>;
  }>) => {
    if (writes.length === 0) return;
    if (writes.length > MAX_BATCH_WRITES) {
      throw new Error(`One action can change at most ${MAX_BATCH_WRITES} rumours at once.`);
    }
    await batchOperations(writes.map(write => ({ ...write, collection: 'rumors' })));
  }, [batchOperations]);

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
  }, [user, userProfile, activeGroupUserProfile, getRumorById, updateData]);

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
  }, [user, userProfile, activeGroupUserProfile, getRumorById, updateData]);

  // Ids issued during this session but not yet reflected in `rumors` (loaded
  // state). Two rumors can be created back-to-back within a single `act()` /
  // event handler before the first create's write has come back through
  // the listener and re-rendered this provider -- a collision check
  // against `getRumorById` alone would miss that first id and silently let
  // the second create overwrite it. This ref is the second source of truth
  // `isTaken` below consults, alongside already-loaded data. Shared across
  // addRumor and combineRumors since both write into the same `rumors`
  // collection/id-space.
  const issuedIds = useRef<Set<string>>(new Set());

  // The same bookkeeping for the `quests` collection, which convertToQuest
  // writes into: a separate id-space from the rumors above.
  const issuedQuestIds = useRef<Set<string>>(new Set());

  const isRumorLoaded = useCallback(
    (candidateId: string) => Boolean(getRumorById(candidateId)),
    [getRumorById]
  );

  // Add rumor
  const addRumor = useCallback(async (rumorData: DomainData<Rumor>) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add rumors');
    }

    const creationAttribution = buildCreationAttribution({ uid: user.uid, activeGroupUserProfile });

    // Create the complete rumor object including the id
    const buildRumor = (candidateId: string): Rumor => ({
      id: candidateId,  // Include the ID in the object
      ...rumorData,
      ...creationAttribution,
      // Ensure arrays are properly initialized
      relatedNPCs: rumorData.relatedNPCs || [],
      relatedLocations: rumorData.relatedLocations || [],
      notes: rumorData.notes || []
    });

    // Generate ID from title, disambiguating on collision -- including with a
    // rumor another session wrote that the listener has not delivered yet (#1402) -- and add the
    // document with the explicit ID
    const id = await createWithUniqueEntityId({
      name: rumorData.title,
      issuedIds: issuedIds.current,
      isLoaded: isRumorLoaded,
      write: (candidateId) => addData(buildRumor(candidateId), candidateId)
    });
    return id;
  }, [user, userProfile, activeGroupUserProfile, addData, isRumorLoaded]);

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
  }, [user, userProfile, activeGroupUserProfile, updateData]);

  // Delete rumor
  const deleteRumor = useCallback(async (rumorId: string) => {
    if (!user) {
      throw new Error('User must be authenticated to delete rumors');
    }

    await deleteData(rumorId);
  }, [user, deleteData]);

  /** Set the status of several rumours at once, in one batch. */
  const updateRumorsStatus = useCallback(async (rumorIds: string[], status: RumorStatus) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update rumor status');
    }
    if (rumorIds.some(id => !getRumorById(id))) {
      throw new Error('One or more rumors not found');
    }

    const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });
    await commitRumorWrites(rumorIds.map(id => ({
      type: 'update' as const,
      id,
      data: { status, ...modificationAttribution }
    })));
  }, [user, userProfile, activeGroupUserProfile, getRumorById, commitRumorWrites]);

  /** Delete several rumours at once, in one batch. */
  const deleteRumors = useCallback(async (rumorIds: string[]) => {
    if (!user) {
      throw new Error('User must be authenticated to delete rumors');
    }

    await commitRumorWrites(rumorIds.map(id => ({ type: 'delete' as const, id })));
  }, [user, commitRumorWrites]);

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
        rumorParagraph(rumor, { attributed: true })
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

    const buildCombinedRumor = (candidateId: string): Rumor => ({
      id: candidateId,
      title,
      content: combinedContent,
      status: newRumorData.status || 'unconfirmed',
      sourceType: newRumorData.sourceType || 'other',
      sourceName: newRumorData.sourceName || 'Multiple Sources',
      ...creationAttribution,
      relatedNPCs,
      relatedLocations,
      notes: initialNotes  // Use our explicit notes array
    });

    // Generate ID from title, disambiguating on collision -- including with a
    // rumor another session wrote that the listener has not delivered yet (#1402) -- and add the
    // new combined rumor with the explicit ID
    const id = await createWithUniqueEntityId({
      name: title,
      issuedIds: issuedIds.current,
      isLoaded: isRumorLoaded,
      write: (candidateId) => addData(buildCombinedRumor(candidateId), candidateId)
    });

    // Mark the original rumours as confirmed and linked to the new one -- all
    // of them in one batch, so a failure cannot leave some marked and some
    // not (T032, PERF-06). Only the fields that change are written.
    await commitRumorWrites(rumorsToMerge.map(rumor => ({
      type: 'update' as const,
      id: rumor.id,
      data: {
        status: 'confirmed' as RumorStatus,
        ...modificationAttribution,
        notes: [
          // Make sure the notes array is defined before trying to spread it
          ...(Array.isArray(rumor.notes) ? rumor.notes : []),
          {
            id: crypto.randomUUID(),
            content: `Combined into rumor: ${id}`,
            ...creationAttribution
          }
        ]
      }
    })));

    return id;
  }, [user, userProfile, activeGroupUserProfile, getRumorById, addData, commitRumorWrites, isRumorLoaded]);

  // Convert rumors to quest
  const convertToQuest = useCallback(async (rumorIds: string[], questData: any) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to convert rumors to quest');
    }

    const rumorsToConvert = rumorIds.map(id => getRumorById(id)).filter(Boolean) as Rumor[];
    if (rumorsToConvert.length !== rumorIds.length) {
      throw new Error('One or more rumors not found');
    }

    // Compute attribution once and reuse across the new quest document and
    // every original rumor updated below so the whole conversion operation
    // is attributed to a single actor/timestamp pair.
    const creationAttribution = buildCreationAttribution({ uid: user.uid, activeGroupUserProfile });
    const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });

    // Use the attribution-aware create path: this genuinely creates a new
    // quest document, so DocumentService.createDocument stamps attribution
    // for it (rather than the context hand-rolling it via creationAttribution).
    //
    // The ID comes from the title. This writes into the `quests` collection, a
    // different id-space than this context loads, so there is no loaded-state
    // lookup to consult (never was): `issuedQuestIds` and the write layer's
    // refusal are all that tell a taken quest slug apart. A title that
    // slugifies to a non-empty string keeps that slug unless it is taken, and
    // an empty/missing title falls back to a random id.
    const questId = await createWithUniqueEntityId({
      name: questData.title || '',
      issuedIds: issuedQuestIds.current,
      isLoaded: () => false,
      write: (candidateId) => createDocument('quests', {
        ...questData,
        id: candidateId
      }, candidateId)
    });

    // Mark every rumour as converted, in one batch (T032, PERF-06). Only the
    // fields that change are written.
    await commitRumorWrites(rumorsToConvert.map(rumor => ({
      type: 'update' as const,
      id: rumor.id,
      data: {
        convertedToQuestId: questId,
        ...modificationAttribution,
        notes: [
          ...(Array.isArray(rumor.notes) ? rumor.notes : []),
          {
            id: crypto.randomUUID(),
            content: `Converted to quest: ${questId}`,
            ...creationAttribution
          }
        ]
      }
    })));

    return questId;
  }, [user, userProfile, activeGroupUserProfile, getRumorById, createDocument, commitRumorWrites]);

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
    updateRumorsStatus,
    deleteRumors,
    combineRumors,
    convertToQuest
  };

  return (
    <RumorDemandProvider value={demand.retain}>
      <RumorContext.Provider value={value}>
        {children}
      </RumorContext.Provider>
    </RumorDemandProvider>
  );
};

export const useRumors = (options: ListReaderOptions = {}) => {
  useRumorDemand(options.subscribe ?? true);
  const context = useContext(RumorContext);
  if (context === undefined) {
    throw new Error('useRumors must be used within a RumorProvider');
  }
  return context;
};