// src/features/campaign-entities/locations/hooks/useLocationData.ts
import { Location } from '../types';
import { useCampaignCollection } from 'shared/hooks/useCampaignCollection';

/** Locations are shown in the order Firestore returns them. */
const asStored = (locations: Location[]): Location[] => locations;

/**
 * The active campaign's locations, kept current by a Firestore listener (T032).
 * See `useCampaignCollection` for how the list, `loading` and the refresh behave.
 * @param options.enabled Whether anything reads the list right now; see
 *   `useListenerDemand`. Defaults to `true`.
 * @returns The locations, loading and error state, a retry, and the campaign context status
 */
export const useLocationData = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { items, loading, error, refresh, hasRequiredContext, missingContext } =
    useCampaignCollection<Location>('locations', asStored, enabled);

  return {
    locations: items,
    loading,
    error,
    refreshLocations: refresh,
    hasRequiredContext,
    missingContext
  };
};

export default useLocationData;
