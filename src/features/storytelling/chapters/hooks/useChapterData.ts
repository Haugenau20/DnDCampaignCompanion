// src/features/storytelling/chapters/hooks/useChapterData.ts
import { Chapter } from '../types';
import { useCampaignCollection } from 'shared/hooks/useCampaignCollection';
import { inReadingOrder } from '../utils/chapter-order';

/**
 * The active campaign's chapters in reading order, as stored, kept current by
 * a Firestore listener (T032). `StoryContext` numbers them by place for
 * readers (T088).
 * See `useCampaignCollection` for how the list, `loading` and the refresh behave.
 * @param options.enabled Whether anything reads the list right now; see
 *   `useListenerDemand`. Defaults to `true`.
 * @returns The chapters, loading and error state, a retry, and the campaign context status
 */
export const useChapterData = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { items, loading, error, refresh, hasRequiredContext } =
    useCampaignCollection<Chapter>('chapters', inReadingOrder, enabled);

  return {
    chapters: items,
    loading,
    error,
    refreshChapters: refresh,
    hasRequiredContext
  };
};

export default useChapterData;
