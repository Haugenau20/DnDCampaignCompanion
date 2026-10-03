// src/features/campaign-entities/rumors/hooks/useRumorData.ts
import { Rumor } from '../types';
import { useCampaignCollection } from 'shared/hooks/useCampaignCollection';

/** Rumours are shown in the order Firestore returns them. */
const asStored = (rumors: Rumor[]): Rumor[] => rumors;

/**
 * The active campaign's rumors, kept current by a Firestore listener (T032).
 * See `useCampaignCollection` for how the list, `loading` and the refresh behave.
 * @returns The rumors, loading and error state, a retry, and the campaign context status
 */
export const useRumorData = () => {
  const { items, loading, error, refresh, hasRequiredContext, missingContext } =
    useCampaignCollection<Rumor>('rumors', asStored);

  return {
    rumors: items,
    loading,
    error,
    refreshRumors: refresh,
    hasRequiredContext,
    missingContext
  };
};

export default useRumorData;
