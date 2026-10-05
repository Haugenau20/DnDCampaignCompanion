// src/features/campaign-entities/rumors/context/RumorContext.tsx - updating rumor context to use character names
import React, { createContext, useContext, useCallback, useRef } from 'react';
import { Rumor, RumorStatus, RumorNote, RumorContextValue } from '../types';
import { DomainData, IdentifiableContent, RecordChange } from 'core/types/common';
import { useRumorData } from '../hooks/useRumorData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { writeRecordChange } from '../../shared/writeRecordChange';
import { useCampaignCollectionPath } from 'shared/hooks/useCampaignCollectionPath';
import { useAuth, useUser, useFirestore } from 'features/user-management';
import { buildCreationAttribution, buildModificationAttribution } from 'core/attribution';
import { createWithUniqueEntityId } from 'core/utils/entity-id';
import { rumorParagraph } from '../utils/rumor-title';
import { createListenerDemandContext, useListenerDemand, ListReaderOptions } from 'shared/hooks/useListenerDemand';
import { commitEntityWrites, EntityBatchWrite, MAX_BATCH_WRITES } from '../../shared/commitEntityWrites';

const RumorContext = createContext<RumorContextValue | undefined>(undefined);

/**
 * Refuses a conversion or combination before anything is written when one
 * transaction could not hold it: the new record plus one update per rumour
 * (DATA-005). Checked after the commit instead, the new record was already
 * there and every retry made another.
 */
const assertFitsOneCommit = (rumorCount: number): void => {
  if (rumorCount + 1 > MAX_BATCH_WRITES) {
    throw new Error(`One action can change at most ${MAX_BATCH_WRITES - 1} rumours at once.`);
  }
};

/**
 * Reads every rumour of a conversion inside its transaction, as the server
 * holds it, refusing if one has gone since the page's copy was taken.
 */
const readAll = async (
  read: (id: string) => Promise<Rumor | undefined>,
  rumorIds: string[]
): Promise<Rumor[]> => {
  const current = await Promise.all(rumorIds.map(id => read(id)));
  if (current.some(rumor => !rumor)) {
    throw new Error('One or more rumors not found');
  }
  return current as Rumor[];
};

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
  // Writes name this render's campaign by full path, so one started here
  // lands here even if the player switches campaign before it runs -- a
  // conversion's quest and its rumour updates included (T082).
  const rumorsPath = useCampaignCollectionPath('rumors');
  const questsPath = useCampaignCollectionPath('quests');
  const { addData, updateData, updateDataAfterReading, deleteData, error: writeError } = useFirebaseData<Rumor>({
    collection: rumorsPath,
    autoFetch: false
  });
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  const { createDocumentWithUpdates } = useFirestore();

  /**
   * Writes to several rumours, committed as one batch (T032, `PERF-06`): one
   * round trip instead of one per rumour, and all or nothing, so a batch
   * action can never stop halfway through the selection.
   */
  const commitRumorWrites = useCallback(
    (writes: EntityBatchWrite<Rumor>[]) => commitEntityWrites(rumorsPath, 'rumours', writes),
    [rumorsPath]
  );

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

    if (!getRumorById(rumorId)) {
      throw new Error('Rumor not found');
    }

    const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });

    await updateData(rumorId, { status, ...modificationAttribution });
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

    // The notes alone, appended to the list the server holds (T083).
    await writeRecordChange(
      { updateData, updateDataAfterReading },
      rumorId,
      (current) => ({ notes: [...(current.notes ?? []), noteWithUser] }),
      'Rumor not found',
      modificationAttribution
    );
  }, [user, userProfile, activeGroupUserProfile, getRumorById, updateData, updateDataAfterReading]);

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

  // Update an existing rumour: only what `change` names; see `RecordChange` (T083)
  const updateRumor = useCallback(async (rumorId: string, change: RecordChange<Rumor>) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update rumors');
    }

    const modificationAttribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });

    await writeRecordChange(
      { updateData, updateDataAfterReading }, rumorId, change, 'Rumor not found', modificationAttribution
    );
  }, [user, userProfile, activeGroupUserProfile, updateData, updateDataAfterReading]);

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
    if (rumorsPath === null) {
      throw new Error('No campaign selected');
    }
    assertFitsOneCommit(rumorIds.length);

    if (rumorIds.some(id => !getRumorById(id))) {
      throw new Error('One or more rumors not found');
    }

    // Use the provided title or generate one
    const title = newRumorData.title || `Combined Rumor (${new Date().toLocaleDateString()})`;

    // Computed once, so the new rumour's note and every original's note name
    // one author and moment however often the transaction runs. The
    // documents' own attribution is stamped by the write.
    const creationAttribution = buildCreationAttribution({ uid: user.uid, activeGroupUserProfile });
    const combinedNoteId = crypto.randomUUID();
    const sourceNoteIds = new Map(rumorIds.map(id => [id, crypto.randomUUID()]));

    /**
     * The combined rumour and the marks on its sources, worked out from the
     * sources as the server holds them (T088): their notes, links and text as
     * they are at the commit, not as this page last saw them.
     */
    const decide = (candidateId: string) => async (read: (id: string) => Promise<Rumor | undefined>) => {
      const rumorsToMerge = await readAll(read, rumorIds);

      const combinedContent = newRumorData.content ||
        rumorsToMerge.map(rumor => rumorParagraph(rumor, { attributed: true })).join('\n\n');
      const relatedNPCs = [...new Set(
        rumorsToMerge.flatMap(rumor => Array.isArray(rumor.relatedNPCs) ? rumor.relatedNPCs : [])
      )];
      const relatedLocations = [...new Set(
        rumorsToMerge.flatMap(rumor => Array.isArray(rumor.relatedLocations) ? rumor.relatedLocations : [])
      )];

      const create: Rumor = {
        id: candidateId,
        title,
        content: combinedContent,
        status: newRumorData.status || 'unconfirmed',
        sourceType: newRumorData.sourceType || 'other',
        sourceName: newRumorData.sourceName || 'Multiple Sources',
        relatedNPCs,
        relatedLocations,
        notes: [{
          id: combinedNoteId,
          content: `Combined from rumors: ${rumorIds.join(', ')}`,
          ...creationAttribution
        }]
      } as Rumor;

      // Each original is confirmed and linked to the new one. Only the
      // fields that change are written.
      const updates = rumorsToMerge.map(rumor => ({
        id: rumor.id,
        data: {
          status: 'confirmed' as RumorStatus,
          notes: [
            ...(Array.isArray(rumor.notes) ? rumor.notes : []),
            {
              id: sourceNoteIds.get(rumor.id)!,
              content: `Combined into rumor: ${candidateId}`,
              ...creationAttribution
            }
          ]
        }
      }));
      return { create, updates };
    };

    // The new rumour and the marks commit together (DATA-005), under an id
    // from the title, disambiguated on collision -- including with a rumour
    // another session wrote that the listener has not delivered yet (#1402).
    return createWithUniqueEntityId({
      name: title,
      issuedIds: issuedIds.current,
      isLoaded: isRumorLoaded,
      write: (candidateId) => createDocumentWithUpdates<Rumor, Rumor>(
        rumorsPath, candidateId, rumorsPath, decide(candidateId)
      )
    });
  }, [user, userProfile, activeGroupUserProfile, getRumorById, createDocumentWithUpdates, isRumorLoaded, rumorsPath]);

  // Convert rumors to quest
  const convertToQuest = useCallback(async (rumorIds: string[], questData: any) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to convert rumors to quest');
    }
    if (questsPath === null || rumorsPath === null) {
      throw new Error('No campaign selected');
    }
    assertFitsOneCommit(rumorIds.length);

    if (rumorIds.some(id => !getRumorById(id))) {
      throw new Error('One or more rumors not found');
    }

    // Computed once, as in `combineRumors`.
    const creationAttribution = buildCreationAttribution({ uid: user.uid, activeGroupUserProfile });
    const noteIds = new Map(rumorIds.map(id => [id, crypto.randomUUID()]));

    /**
     * The quest, and every rumour marked as converted into it, from the
     * rumours as the server holds them (T088). Only the fields that change
     * are written.
     */
    const decide = (questId: string) => async (read: (id: string) => Promise<Rumor | undefined>) => {
      const rumorsToConvert = await readAll(read, rumorIds);
      return {
        create: { ...questData, id: questId },
        updates: rumorsToConvert.map(rumor => ({
          id: rumor.id,
          data: {
            convertedToQuestId: questId,
            notes: [
              ...(Array.isArray(rumor.notes) ? rumor.notes : []),
              {
                id: noteIds.get(rumor.id)!,
                content: `Converted to quest: ${questId}`,
                ...creationAttribution
              }
            ]
          }
        }))
      };
    };

    // The quest and the marks commit together (DATA-005). The ID comes from
    // the title. This writes into the `quests` collection, a different
    // id-space than this context loads, so there is no loaded-state lookup to
    // consult (never was): `issuedQuestIds` and the write's refusal of a taken
    // id are all that tell a taken quest slug apart. A title that slugifies to
    // a non-empty string keeps that slug unless it is taken, and an
    // empty/missing title falls back to a random id.
    return createWithUniqueEntityId({
      name: questData.title || '',
      issuedIds: issuedQuestIds.current,
      isLoaded: () => false,
      write: (questId) => createDocumentWithUpdates<Record<string, unknown>, Rumor>(
        questsPath, questId, rumorsPath, decide(questId)
      )
    });
  }, [user, userProfile, activeGroupUserProfile, getRumorById, createDocumentWithUpdates, questsPath, rumorsPath]);

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
    // The read alone: a rejected write must not take the page down (T085).
    loadError: error || null,
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