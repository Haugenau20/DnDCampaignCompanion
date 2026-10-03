// src/features/campaign-entities/quests/hooks/useQuestData.ts
import { useCallback } from 'react';
import { Quest } from '../types';
import { normaliseObjectives } from '../utils/quest-objectives';
import { useCampaignCollection } from 'shared/hooks/useCampaignCollection';

/**
 * Make a batch of stored quests safe to render.
 *
 * `buildDocument` stops new bare-string objectives being written, but every
 * quest converted from a note before T050 already holds them, and one is
 * enough to crash `QuestDirectory`'s search on `obj.description.toLowerCase()`.
 * Coercing on read makes existing data safe without waiting for an edit; the
 * next write through `writeObjectives` persists the repair. Every snapshot
 * passes through here, so there is no second path for a bare string to slip
 * through (found in Chrome, when there were two).
 */
const readable = (quests: Quest[]): Quest[] =>
  quests.map((quest) => ({
    ...quest,
    objectives: normaliseObjectives(quest.objectives),
  }));

/**
 * The active campaign's quests, kept current by a Firestore listener (T032).
 * See `useCampaignCollection` for how the list, `loading` and the refresh behave.
 * @returns The quests, loading and error state, a lookup by id, a retry, and
 *   the campaign context status
 */
export const useQuestData = () => {
  const { items: quests, loading, error, refresh, hasRequiredContext, missingContext } =
    useCampaignCollection<Quest>('quests', readable);

  /**
   * Get a quest by ID
   */
  const getQuestById = useCallback((id: string) => {
    return quests.find(quest => quest.id === id);
  }, [quests]);

  return {
    quests,
    loading,
    error,
    getQuestById,
    refreshQuests: refresh,
    hasRequiredContext,
    missingContext
  };
};

export default useQuestData;
