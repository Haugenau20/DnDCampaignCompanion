// src/features/campaign-entities/locations/hooks/__tests__/useLocationData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLocationData } from '../useLocationData';
import { Location, LocationType, LocationStatus } from '../../types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetData = jest.fn();

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: jest.fn(),
}));

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
}));

const { useFirebaseData } = require('shared/hooks/useFirebaseData');
const { useAuth, useGroups, useCampaigns } = require('@/features/user-management');

const makeLocation = (id: string, name: string): Location => ({
  id,
  name,
  description: `Description of ${name}`,
  type: 'city' as LocationType,
  status: 'known' as LocationStatus,
  createdBy: 'user-1',
  createdByUsername: 'TestUser',
  dateAdded: '2025-01-01T00:00:00.000Z',
  tags: [],
  features: [],
  notes: [],
});

const setupFirebaseDataMock = (overrides: Record<string, unknown> = {}) => {
  (useFirebaseData as jest.Mock).mockReturnValue({
    getData: mockGetData,
    loading: false,
    error: null,
    data: [],
    ...overrides,
  });
};

const setupContextMocks = (
  groupId: string | null = 'group-1',
  campaignId: string | null = 'campaign-1',
  user: unknown = { uid: 'user-1' }
) => {
  (useAuth as jest.Mock).mockReturnValue({ user });
  (useGroups as jest.Mock).mockReturnValue({ activeGroupId: groupId });
  (useCampaigns as jest.Mock).mockReturnValue({ activeCampaignId: campaignId });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useLocationData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupContextMocks();
    setupFirebaseDataMock();
    mockGetData.mockResolvedValue([]);
  });

  describe('return shape', () => {
    test('should expose locations, loading, error, refreshLocations, hasRequiredContext', async () => {
      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toHaveProperty('locations');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refreshLocations');
      expect(result.current).toHaveProperty('hasRequiredContext');
    });

    test('should start with empty locations array', async () => {
      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.locations).toEqual([]);
    });
  });

  describe('hasRequiredContext', () => {
    test('should be true when both groupId and campaignId are present', async () => {
      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(true);
    });

    test('should be false when groupId is null', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });

    test('should be false when campaignId is null', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });
  });

  describe('fetchLocations', () => {
    test('should return empty array when no activeGroupId', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.locations).toEqual([]);
    });

    test('should return empty array when no activeCampaignId', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.locations).toEqual([]);
    });

    test('should set locations from getData result', async () => {
      const locations = [makeLocation('1', 'Tavern'), makeLocation('2', 'Castle')];
      mockGetData.mockResolvedValue(locations);

      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.locations.length).toBe(2));

      expect(result.current.locations).toHaveLength(2);
    });

    test('should handle getData returning null gracefully', async () => {
      mockGetData.mockResolvedValue(null as any);

      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.locations).toEqual([]);
    });

    test('should handle getData errors gracefully', async () => {
      mockGetData.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const refreshResult = await act(async () => result.current.refreshLocations());
      expect(refreshResult).toEqual([]);
    });

    test('should return fetched locations from refreshLocations', async () => {
      const locations = [makeLocation('1', 'Forest')];
      mockGetData.mockResolvedValue(locations);

      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let refreshResult: Location[] = [];
      await act(async () => {
        refreshResult = await result.current.refreshLocations();
      });

      expect(refreshResult).toHaveLength(1);
      expect(refreshResult[0].name).toBe('Forest');
    });
  });

  describe('data synchronization', () => {
    test('should update locations when Firebase data is non-empty', async () => {
      const locations = [makeLocation('1', 'Keep'), makeLocation('2', 'Harbor')];
      setupFirebaseDataMock({ data: locations, loading: false, error: null });
      mockGetData.mockResolvedValue(locations);

      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.locations.length).toBe(2));

      expect(result.current.locations).toHaveLength(2);
    });

    test('should clear locations when user is signed out', async () => {
      setupContextMocks(null, null, null);
      setupFirebaseDataMock({ data: [], loading: false, error: null });

      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.locations).toEqual([]);
    });

    // `useFirebaseData` is now `autoFetch: false` here, so its
    // AUTH_STATE_CHANGED_EVENT listener -- the thing that used to clear
    // `data` on sign-out -- no longer runs. `data` can therefore still hold
    // the previous user's records at the moment sign-out is observed. The
    // effect's guard order is what has to catch that: "signed out" must be
    // checked before "data is present", or the previous user's locations
    // would render on a signed-out screen.
    test('clears the list on sign-out, even though the fetched data is still held', async () => {
      const locations = [makeLocation('1', 'Tavern'), makeLocation('2', 'Castle')];
      setupFirebaseDataMock({ data: locations, loading: false, error: null });
      mockGetData.mockResolvedValue(locations);

      const { result, rerender } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.locations).toHaveLength(2));

      // Sign out: FirebaseContext nulls both activeGroupId and
      // activeCampaignId, but `data` -- no longer cleared by the dropped
      // listener -- still resolves to the same populated array.
      setupContextMocks(null, null, null);
      setupFirebaseDataMock({ data: locations, loading: false, error: null });
      rerender();

      expect(result.current.locations).toEqual([]);
    });
  });

  describe('passthrough from useFirebaseData', () => {
    test('should expose loading state from useFirebaseData', () => {
      setupFirebaseDataMock({ loading: true });
      const { result } = renderHook(() => useLocationData());
      expect(result.current.loading).toBe(true);
    });

    test('should expose error state from useFirebaseData', async () => {
      setupFirebaseDataMock({ error: 'Network error', loading: false });
      const { result } = renderHook(() => useLocationData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('Network error');
    });
  });
  // -------------------------------------------------------------------------
  // `loading` means "there is nothing to show yet"
  // -------------------------------------------------------------------------
  describe('loading means "nothing to show yet", not "a fetch is in flight"', () => {
    // CHANGED DELIBERATELY, for the reason recorded in full on
    // `useQuestData.test.ts`: this hook used to hand out `useFirebaseData`'s
    // raw in-flight flag, which the refresh at the end of every write raises
    // as well as the first read. Consumers pass it to `usePageGate`, so the
    // gate re-entered `resolving` after every save and unmounted what was on
    // screen. Implemented in four hooks, so pinned in four suites.

    test('a refetch behind records already on screen is not loading', async () => {
      const records = [makeLocation('loc-1', 'Rivendell')];
      setupFirebaseDataMock({ data: records });
      mockGetData.mockResolvedValue(records);
      const { result, rerender } = renderHook(() => useLocationData());

      await waitFor(() => expect(result.current.locations).toHaveLength(1));

      setupFirebaseDataMock({ data: records, loading: true });
      rerender();

      expect(result.current.loading).toBe(false);
      expect(result.current.locations).toHaveLength(1);
    });

    test('a first read with nothing on screen is loading', () => {
      setupFirebaseDataMock({ data: [], loading: true });
      const { result } = renderHook(() => useLocationData());

      expect(result.current.loading).toBe(true);
    });

    test('switching campaign empties the list rather than showing the last one', async () => {
      const records = [makeLocation('loc-1', 'Rivendell')];
      setupFirebaseDataMock({ data: records });
      mockGetData.mockResolvedValue(records);
      const { result, rerender } = renderHook(() => useLocationData());

      await waitFor(() => expect(result.current.locations).toHaveLength(1));

      setupContextMocks('group-1', 'campaign-2');
      setupFirebaseDataMock({ data: [], loading: true });
      mockGetData.mockResolvedValue([]);
      rerender();

      expect(result.current.locations).toEqual([]);
      expect(result.current.loading).toBe(true);
    });
  });
});
