// src/features/campaign-entities/quests/context/QuestContext.tsx
import React, { createContext, useContext, useCallback, useRef } from 'react';
import { Quest, QuestStatus, QuestContextValue } from '../types';
import { DomainData } from 'core/types/common';
import { useQuestData } from '../hooks/useQuestData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useUser, useGroups, useCampaigns } from 'features/user-management';
import { generateUniqueEntityId } from 'core/utils/entity-id';
import { referencesLocation } from '../../locations/utils/location-display';
import { moveObjective } from '../utils/quest-presentation';
import { Location } from '../../locations/types';

// Create the context but DON'T export it (to match NPCContext pattern)
const QuestContext = createContext<QuestContextValue | undefined>(undefined);

export const QuestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use the useQuestData hook to handle data fetching
  const { quests, loading, error, getQuestById, refreshQuests: fetchQuests, hasRequiredContext } = useQuestData();
  // `autoFetch: false` because nothing renders off this instance's `data`:
  // the list comes from `useQuestData()` above. Its `error` is bound as
  // `writeError` so write failures are not conflated with read failures
  // (bug #1401).
  const { addData, updateData, deleteData, error: writeError } = useFirebaseData<Quest>({
    collection: 'quests',
    autoFetch: false
  });
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();

  // Create a wrapper for fetchQuests that returns void instead of Quest[]
  const refreshQuests = useCallback(async (): Promise<void> => {
    await fetchQuests();
  }, [fetchQuests]);

  // Get quests by status
  const getQuestsByStatus = useCallback((status: QuestStatus) => {
    return quests.filter(quest => quest.status === status);
  }, [quests]);

  // Get quests by location. Matches the canonical `locationId` first,
  // falling back to a case-insensitive comparison against the legacy
  // free-text `location` -- checked against both the Location's id and its
  // name, since an un-migrated document's `location` may hold either -- for
  // documents written before `locationId` existed. See the contract on
  // `NPC.location` and `referencesLocation`'s doc comment.
  //
  // Takes the whole `Location`, not a bare id: resolving a legacy name back
  // to an id would need the full locations array, which not every consumer
  // of this helper is guaranteed to have (see `referencesLocation`'s doc
  // comment; `NPCContext`'s sibling helper is the concrete case that needs
  // it). `keyLocations` is a separate concept -- named locations mentioned in
  // the quest write-up, not a reference to a Location record -- so it keeps
  // its own comparison against the Location's `name` rather than joining the
  // id/legacy-text fallback above; case-insensitive to match everything else
  // here.
  const getQuestsByLocation = useCallback((location: Location) => {
    return quests.filter(quest =>
      referencesLocation(quest, location) ||
      quest.keyLocations?.some(
        keyLocation => keyLocation.name.toLowerCase() === location.name.toLowerCase()
      )
    );
  }, [quests]);

  // Get quests by NPC
  // One relation list (D15.7). This used to also match `importantNPCs` by
  // `npc.name === npcId` -- comparing a free-text name against an id, which
  // could only ever match by accident.
  const getQuestsByNPC = useCallback((npcId: string) => {
    return quests.filter(quest => quest.relatedNPCIds?.includes(npcId));
  }, [quests]);

  // Ids issued during this session but not yet reflected in `quests` (loaded
  // state). Two quests can be created back-to-back within a single `act()` /
  // event handler before the first create's write has round-tripped through
  // `refreshQuests()` and re-rendered this provider -- a collision check
  // against `getQuestById` alone would miss that first id and silently let
  // the second create overwrite it. This ref is the second source of truth
  // `isTaken` below consults, alongside already-loaded data.
  const issuedIds = useRef<Set<string>>(new Set());

  // Update quest status
  const updateQuestStatus = useCallback(async (questId: string, status: QuestStatus) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update quest status');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to update quest status');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const now = new Date().toISOString();

    const updatedQuest = {
      ...quest,
      status,
      // If completing, set the completion date
      ...(status === 'completed' && { dateCompleted: now })
    };

    await updateData(questId, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, activeGroupId, activeCampaignId, getQuestById, updateData, refreshQuests]);

  /**
   * The one guard every objective write shares: signed in, a campaign in
   * context, and a quest that exists. Returns the quest so the caller can
   * work from it.
   */
  const questForObjectiveWrite = useCallback((questId: string): Quest => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update objectives');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to update objectives');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    return quest;
  }, [user, userProfile, activeGroupId, activeCampaignId, getQuestById]);

  /** Write a new objective list, leaving every other field of the quest alone. */
  const writeObjectives = useCallback(
    async (quest: Quest, objectives: Quest['objectives']) => {
      await updateData(quest.id, { ...quest, objectives });
      await refreshQuests();
    },
    [updateData, refreshQuests]
  );

  /**
   * Tick or untick one objective.
   *
   * **Completing the last objective no longer completes the quest** (`15-5`
   * item 7). It used to, silently: ticking the third of three flipped the
   * status to `completed` and stamped `dateCompleted` in the same write, with
   * nothing on screen saying so. A party that ticks the last objective has
   * usually not finished the quest -- the reward is unclaimed, the patron
   * unvisited -- and a status nobody chose is a status nobody trusts.
   *
   * The offer lives on the page (`QuestObjectives`), which shows *"Every
   * objective is ticked -- mark the quest completed?"* and completes only when
   * asked. `markQuestCompleted` is still the one write that concludes a quest.
   *
   * A ticked objective keeps its place in the list: the array is mapped, never
   * reordered or partitioned, so nothing moves under someone mid-session.
   */
  const updateQuestObjective = useCallback(async (questId: string, objectiveId: string, completed: boolean) => {
    const quest = questForObjectiveWrite(questId);

    const updatedObjectives = quest.objectives.map(obj =>
      obj.id === objectiveId ? { ...obj, completed } : obj
    );

    await writeObjectives(quest, updatedObjectives);
  }, [questForObjectiveWrite, writeObjectives]);

  /**
   * Add an objective to the end of the list.
   *
   * Appended, never inserted: the order is the party's plan, and a new
   * objective is the next thing to do rather than a correction to the order of
   * what came before. `crypto.randomUUID` matches how every other nested
   * record in the product (rumour notes, extracted entities) issues an id.
   */
  const addQuestObjective = useCallback(async (questId: string, description: string) => {
    const quest = questForObjectiveWrite(questId);
    const trimmed = description.trim();
    if (!trimmed) {
      throw new Error('An objective needs something to say.');
    }

    await writeObjectives(quest, [
      ...quest.objectives,
      { id: crypto.randomUUID(), description: trimmed, completed: false },
    ]);
  }, [questForObjectiveWrite, writeObjectives]);

  /** Reword an objective, keeping whether it is ticked and where it sits. */
  const editQuestObjective = useCallback(async (questId: string, objectiveId: string, description: string) => {
    const quest = questForObjectiveWrite(questId);
    const trimmed = description.trim();
    if (!trimmed) {
      throw new Error('An objective needs something to say.');
    }

    await writeObjectives(
      quest,
      quest.objectives.map(obj =>
        obj.id === objectiveId ? { ...obj, description: trimmed } : obj
      )
    );
  }, [questForObjectiveWrite, writeObjectives]);

  /**
   * Move one objective one place up or down.
   *
   * A move that would fall off either end writes nothing at all, rather than
   * writing the list back unchanged: a no-op write would still stamp
   * `dateModified` and credit a modification nobody made (§8).
   */
  const moveQuestObjective = useCallback(async (questId: string, objectiveId: string, direction: 'up' | 'down') => {
    const quest = questForObjectiveWrite(questId);
    const reordered = moveObjective(quest.objectives, objectiveId, direction);
    if (reordered === quest.objectives) {
      return;
    }

    await writeObjectives(quest, reordered);
  }, [questForObjectiveWrite, writeObjectives]);

  // Add quest
  const addQuest = useCallback(async (questData: DomainData<Quest>) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add quests');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to add quests');
    }

    // Generate ID from title, disambiguating only on collision
    const isTaken = (candidateId: string) =>
      issuedIds.current.has(candidateId) || Boolean(getQuestById(candidateId));

    const id = generateUniqueEntityId(questData.title, isTaken);
    issuedIds.current.add(id);

    // Not a complete Quest -- attribution is stamped by DocumentService.createDocument,
    // not supplied here. See DomainData's doc comment in core/types/common.ts.
    const newQuest = {
      id,
      ...questData,
      // Ensure arrays are properly initialized
      objectives: questData.objectives || [],
      relatedNPCIds: questData.relatedNPCIds || [],
      leads: questData.leads || [],
      keyLocations: questData.keyLocations || [],
      complications: questData.complications || [],
      rewards: questData.rewards || []
    };
    
    // Add the document with the explicit ID
    await addData(newQuest, id);
    await refreshQuests();
    return id;
  }, [user, userProfile, activeGroupId, activeCampaignId, getQuestById, addData, refreshQuests]);

  // Update existing quest
  const updateQuest = useCallback(async (quest: Quest) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to update quests');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to update quests');
    }

    const updatedQuest = {
      ...quest
    };

    await updateData(quest.id, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, activeGroupId, activeCampaignId, updateData, refreshQuests]);

  // Delete quest
  const deleteQuest = useCallback(async (questId: string) => {
    if (!user) {
      throw new Error('User must be authenticated to delete quests');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to delete quests');
    }

    await deleteData(questId);
    await refreshQuests();
  }, [user, activeGroupId, activeCampaignId, deleteData, refreshQuests]);

  // Mark quest as completed
  const markQuestCompleted = useCallback(async (questId: string, dateCompleted?: string) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to complete quests');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to complete quests');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const now = new Date().toISOString();
    const completionDate = dateCompleted || now;

    // Mark all objectives as completed
    const completedObjectives = quest.objectives.map(obj => ({
      ...obj,
      completed: true
    }));

    const updatedQuest = {
      ...quest,
      status: 'completed' as QuestStatus,
      dateCompleted: completionDate,
      objectives: completedObjectives
    };

    await updateData(questId, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, activeGroupId, activeCampaignId, getQuestById, updateData, refreshQuests]);

  // Mark quest as failed
  const markQuestFailed = useCallback(async (questId: string) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to mark quests as failed');
    }

    if (!activeGroupId || !activeCampaignId) {
      throw new Error('Group and campaign context must be set to mark quests as failed');
    }

    const quest = getQuestById(questId);
    if (!quest) {
      throw new Error('Quest not found');
    }

    const updatedQuest = {
      ...quest,
      status: 'failed' as QuestStatus
    };

    await updateData(questId, updatedQuest);
    await refreshQuests();
  }, [user, userProfile, activeGroupId, activeCampaignId, getQuestById, updateData, refreshQuests]);

  const value: QuestContextValue = {
    quests,
    isLoading: loading,
    // Trailing `|| null` normalizes the type. The real `useFirebaseData` declares
    // `useState<string | null>(null)`, so `writeError` is never `undefined` in
    // production -- but suites that mock the hook return an object with no `error`
    // key at all, which makes this expression `undefined` and violates the
    // `string | null` contract consumers rely on. Cheap to keep, and it means the
    // contract holds regardless of how the hook is supplied.
    error: error || writeError || null,
    getQuestById,
    getQuestsByStatus,
    getQuestsByLocation,
    getQuestsByNPC,
    updateQuestStatus,
    updateQuestObjective,
    addQuestObjective,
    editQuestObjective,
    moveQuestObjective,
    addQuest,
    updateQuest,
    deleteQuest,
    markQuestCompleted,
    markQuestFailed,
    refreshQuests,
    hasRequiredContext
  };

  return (
    <QuestContext.Provider value={value}>
      {children}
    </QuestContext.Provider>
  );
};

// Export the hook directly from the context file
export const useQuests = () => {
  const context = useContext(QuestContext);
  if (context === undefined) {
    throw new Error('useQuests must be used within a QuestProvider');
  }
  return context;
};