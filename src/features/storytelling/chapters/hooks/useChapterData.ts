// src/features/storytelling/chapters/hooks/useChapterData.ts
import { Chapter } from '../types';
import { useCampaignCollection } from 'shared/hooks/useCampaignCollection';

/** In reading order. */
const byOrder = (chapters: Chapter[]): Chapter[] =>
  [...chapters].sort((a, b) => a.order - b.order);

/**
 * The active campaign's chapters, kept current by a Firestore listener (T032).
 * See `useCampaignCollection` for how the list, `loading` and the refresh behave.
 * @param options.enabled Whether anything reads the list right now; see
 *   `useListenerDemand`. Defaults to `true`.
 * @returns The chapters, loading and error state, a retry, and the campaign context status
 */
export const useChapterData = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { items, loading, error, refresh, hasRequiredContext } =
    useCampaignCollection<Chapter>('chapters', byOrder, enabled);

  return {
    chapters: items,
    loading,
    error,
    refreshChapters: refresh,
    hasRequiredContext
  };
};

export default useChapterData;
