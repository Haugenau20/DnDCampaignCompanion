// src/features/campaign-entities/npcs/hooks/useNPCData.ts
import { NPC } from '../types';
import { useCampaignCollection } from 'shared/hooks/useCampaignCollection';

/** Alphabetical by name. */
const byName = (npcs: NPC[]): NPC[] =>
  [...npcs].sort((a, b) => a.name.localeCompare(b.name));

/**
 * The active campaign's NPCs, kept current by a Firestore listener (T032).
 * See `useCampaignCollection` for how the list, `loading` and the refresh behave.
 * @returns The NPCs, loading and error state, a retry, and the campaign context status
 */
export const useNPCData = () => {
  const { items, loading, error, refresh, hasRequiredContext, missingContext } =
    useCampaignCollection<NPC>('npcs', byName);

  return {
    npcs: items,
    loading,
    error,
    refreshNPCs: refresh,
    hasRequiredContext,
    missingContext
  };
};

export default useNPCData;
