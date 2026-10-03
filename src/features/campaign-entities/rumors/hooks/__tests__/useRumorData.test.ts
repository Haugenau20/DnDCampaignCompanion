// src/features/campaign-entities/rumors/hooks/__tests__/useRumorData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRumorData } from '../useRumorData';
import { Rumor, RumorStatus, SourceType } from '../../types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockRetry = jest.fn();

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

const makeRumor = (id: string, title: string): Rumor => ({
  id,
  title,
  content: `Content about ${title}`,
  status: 'unconfirmed' as RumorStatus,
  sourceType: 'tavern' as SourceType,
  sourceName: 'Local Tavern',
  relatedNPCs: [],
  relatedLocations: [],
  notes: [],
  createdBy: 'user-1',
  createdByUsername: 'TestUser',
  dateAdded: '2025-01-01T00:00:00.000Z',
});

const setupFirebaseDataMock = (overrides: Record<string, unknown> = {}) => {
  (useFirebaseData as jest.Mock).mockReturnValue({
    retry: mockRetry,
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
describe('useRumorData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupContextMocks();
    setupFirebaseDataMock();
  });

  describe('return shape', () => {
    test('should expose rumors, loading, error, refreshRumors, hasRequiredContext', async () => {
      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toHaveProperty('rumors');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refreshRumors');
      expect(result.current).toHaveProperty('hasRequiredContext');
    });

    test('should start with empty rumors array', async () => {
      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.rumors).toEqual([]);
    });
  });

  describe('hasRequiredContext', () => {
    test('should be true when both groupId and campaignId are present', async () => {
      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(true);
    });

    test('should be false when groupId is null', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });

    test('should be false when campaignId is null', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });
  });

  // The list is the listener's latest snapshot, and a refresh is a retry of
  // the listener rather than a read (T032). These replaced tests that fed the
  // list through `getData`, which nothing calls any more.
  describe('listening', () => {
    test('is empty when no activeGroupId', () => {
      setupContextMocks(null, 'campaign-1');
      setupFirebaseDataMock({ data: [makeRumor('2', 'Lost ship'), makeRumor('1', 'Dragon spotted')] });
      const { result } = renderHook(() => useRumorData());
      expect(result.current.rumors).toEqual([]);
    });

    test('is empty when no activeCampaignId', () => {
      setupContextMocks('group-1', null);
      setupFirebaseDataMock({ data: [makeRumor('2', 'Lost ship'), makeRumor('1', 'Dragon spotted')] });
      const { result } = renderHook(() => useRumorData());
      expect(result.current.rumors).toEqual([]);
    });

    test('lists the snapshot in the order Firestore returns them', () => {
      setupFirebaseDataMock({ data: [makeRumor('2', 'Lost ship'), makeRumor('1', 'Dragon spotted')] });
      const { result } = renderHook(() => useRumorData());
      expect(result.current.rumors.map((item) => item.title)).toEqual(['Lost ship', 'Dragon spotted']);
    });

    test('follows a snapshot that empties the collection', () => {
      setupFirebaseDataMock({ data: [makeRumor('2', 'Lost ship'), makeRumor('1', 'Dragon spotted')] });
      const { result, rerender } = renderHook(() => useRumorData());
      expect(result.current.rumors).toHaveLength(2);

      // The last record was deleted, here or by another player.
      setupFirebaseDataMock({ data: [] });
      rerender();

      expect(result.current.rumors).toEqual([]);
    });

    test('refreshRumors retries the listener and resolves to the list', async () => {
      mockRetry.mockResolvedValue([makeRumor('2', 'Lost ship'), makeRumor('1', 'Dragon spotted')]);
      const { result } = renderHook(() => useRumorData());

      let refreshed: Rumor[] = [];
      await act(async () => {
        refreshed = await result.current.refreshRumors();
      });

      expect(mockRetry).toHaveBeenCalledTimes(1);
      expect(refreshed.map((item) => item.title)).toEqual(['Lost ship', 'Dragon spotted']);
    });

    test('refreshRumors leaves the listener alone while no campaign is selected', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useRumorData());

      await expect(result.current.refreshRumors()).resolves.toEqual([]);
      expect(mockRetry).not.toHaveBeenCalled();
    });
  });

  describe('data synchronization', () => {
    test('should update rumors when Firebase data is non-empty', async () => {
      const rumors = [makeRumor('1', 'Rumor A'), makeRumor('2', 'Rumor B')];
      setupFirebaseDataMock({ data: rumors, loading: false, error: null });

      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.rumors.length).toBe(2));
    });

    test('should clear rumors when no user context', async () => {
      setupContextMocks(null, null, null);
      setupFirebaseDataMock({ data: [], loading: false, error: null });

      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.rumors).toEqual([]);
    });

    // `useFirebaseData` is now `autoFetch: false` here, so its
    // AUTH_STATE_CHANGED_EVENT listener -- the thing that used to clear
    // `data` on sign-out -- no longer runs. `data` can therefore still hold
    // the previous user's records at the moment sign-out is observed. The
    // effect's guard order is what has to catch that: "signed out" must be
    // checked before "data is present", or the previous user's rumors would
    // render on a signed-out screen.
    test('clears the list on sign-out, even though the fetched data is still held', async () => {
      const rumors = [makeRumor('1', 'Dragon spotted'), makeRumor('2', 'Lost ship')];
      setupFirebaseDataMock({ data: rumors, loading: false, error: null });

      const { result, rerender } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.rumors).toHaveLength(2));

      // Sign out: FirebaseContext nulls both activeGroupId and
      // activeCampaignId, but `data` -- no longer cleared by the dropped
      // listener -- still resolves to the same populated array.
      setupContextMocks(null, null, null);
      setupFirebaseDataMock({ data: rumors, loading: false, error: null });
      rerender();

      expect(result.current.rumors).toEqual([]);
    });
  });

  describe('passthrough from useFirebaseData', () => {
    test('should expose loading state from useFirebaseData', () => {
      setupFirebaseDataMock({ loading: true });
      const { result } = renderHook(() => useRumorData());
      expect(result.current.loading).toBe(true);
    });

    test('should expose error state from useFirebaseData', async () => {
      setupFirebaseDataMock({ error: 'Network error', loading: false });
      const { result } = renderHook(() => useRumorData());
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
      const records = [makeRumor('rumor-1', 'Dwarves in Moria')];
      setupFirebaseDataMock({ data: records });
      const { result, rerender } = renderHook(() => useRumorData());

      await waitFor(() => expect(result.current.rumors).toHaveLength(1));

      setupFirebaseDataMock({ data: records, loading: true });
      rerender();

      expect(result.current.loading).toBe(false);
      expect(result.current.rumors).toHaveLength(1);
    });

    test('a first read with nothing on screen is loading', () => {
      setupFirebaseDataMock({ data: [], loading: true });
      const { result } = renderHook(() => useRumorData());

      expect(result.current.loading).toBe(true);
    });

    test('switching campaign empties the list rather than showing the last one', async () => {
      const records = [makeRumor('rumor-1', 'Dwarves in Moria')];
      setupFirebaseDataMock({ data: records });
      const { result, rerender } = renderHook(() => useRumorData());

      await waitFor(() => expect(result.current.rumors).toHaveLength(1));

      setupContextMocks('group-1', 'campaign-2');
      setupFirebaseDataMock({ data: [], loading: true });
      rerender();

      expect(result.current.rumors).toEqual([]);
      expect(result.current.loading).toBe(true);
    });
  });
});
