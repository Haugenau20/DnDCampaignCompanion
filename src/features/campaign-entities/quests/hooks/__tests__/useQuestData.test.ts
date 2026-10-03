// src/hooks/__tests__/useQuestData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuestData } from '../useQuestData';
import { Quest, QuestStatus } from '../../types';

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

const makeQuest = (id: string, title: string, status: QuestStatus = 'active'): Quest => ({
  id,
  title,
  description: `Description of ${title}`,
  status,
  objectives: [],
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
describe('useQuestData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupContextMocks();
    setupFirebaseDataMock();
  });

  describe('return shape', () => {
    test('should expose quests, loading, error, getQuestById, refreshQuests, hasRequiredContext', async () => {
      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toHaveProperty('quests');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('getQuestById');
      expect(result.current).toHaveProperty('refreshQuests');
      expect(result.current).toHaveProperty('hasRequiredContext');
    });

    test('should start with empty quests array', async () => {
      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.quests).toEqual([]);
    });
  });

  describe('hasRequiredContext', () => {
    test('should be true when both groupId and campaignId are present', async () => {
      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(true);
    });

    test('should be false when groupId is null', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });

    test('should be false when campaignId is null', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useQuestData());
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
      setupFirebaseDataMock({ data: [makeQuest('2', 'Lost Artifact'), makeQuest('1', 'Dragon Hunt')] });
      const { result } = renderHook(() => useQuestData());
      expect(result.current.quests).toEqual([]);
    });

    test('is empty when no activeCampaignId', () => {
      setupContextMocks('group-1', null);
      setupFirebaseDataMock({ data: [makeQuest('2', 'Lost Artifact'), makeQuest('1', 'Dragon Hunt')] });
      const { result } = renderHook(() => useQuestData());
      expect(result.current.quests).toEqual([]);
    });

    test('lists the snapshot in the order Firestore returns them', () => {
      setupFirebaseDataMock({ data: [makeQuest('2', 'Lost Artifact'), makeQuest('1', 'Dragon Hunt')] });
      const { result } = renderHook(() => useQuestData());
      expect(result.current.quests.map((item) => item.title)).toEqual(['Lost Artifact', 'Dragon Hunt']);
    });

    test('follows a snapshot that empties the collection', () => {
      setupFirebaseDataMock({ data: [makeQuest('2', 'Lost Artifact'), makeQuest('1', 'Dragon Hunt')] });
      const { result, rerender } = renderHook(() => useQuestData());
      expect(result.current.quests).toHaveLength(2);

      // The last record was deleted, here or by another player.
      setupFirebaseDataMock({ data: [] });
      rerender();

      expect(result.current.quests).toEqual([]);
    });

    test('refreshQuests retries the listener and resolves to the list', async () => {
      mockRetry.mockResolvedValue([makeQuest('2', 'Lost Artifact'), makeQuest('1', 'Dragon Hunt')]);
      const { result } = renderHook(() => useQuestData());

      let refreshed: Quest[] = [];
      await act(async () => {
        refreshed = await result.current.refreshQuests();
      });

      expect(mockRetry).toHaveBeenCalledTimes(1);
      expect(refreshed.map((item) => item.title)).toEqual(['Lost Artifact', 'Dragon Hunt']);
    });

    test('refreshQuests leaves the listener alone while no campaign is selected', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useQuestData());

      await expect(result.current.refreshQuests()).resolves.toEqual([]);
      expect(mockRetry).not.toHaveBeenCalled();
    });
  });

  describe('getQuestById', () => {
    test('should find quest by ID', async () => {
      const quests = [makeQuest('q-1', 'Dragon Hunt'), makeQuest('q-2', 'Lost Artifact')];
      setupFirebaseDataMock({ data: quests, loading: false, error: null });

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.quests.length).toBe(2));

      const found = result.current.getQuestById('q-1');
      expect(found).toBeDefined();
      expect(found?.title).toBe('Dragon Hunt');
    });

    test('should return undefined for non-existent quest ID', async () => {

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const found = result.current.getQuestById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  /*
    Documents written before T050 hold `objectives` as bare strings, and one is
    enough to crash `QuestDirectory`'s search on `obj.description.toLowerCase()`.
    Quests used to reach state by two routes, and the first fix normalised only
    one -- found in Chrome against a seeded pre-fix document, never here. Since
    T032 there are two ways out of the hook instead: the list, and what a
    refresh resolves to. Each gets its own case.
  */
  describe('legacy documents with string objectives', () => {
    const legacy = {
      ...makeQuest('legacy-1', 'Written before the fix'),
      objectives: ['Find the old road', 'Cross the marshes'],
    } as unknown as Quest;

    test('are coerced in what a refresh resolves to', async () => {
      mockRetry.mockResolvedValue([legacy]);
      setupFirebaseDataMock({ data: [], loading: false, error: null });

      const { result } = renderHook(() => useQuestData());
      let refreshed: Quest[] = [];
      await act(async () => {
        refreshed = await result.current.refreshQuests();
      });

      expect(refreshed[0].objectives).toEqual([
        { id: 'objective-0', description: 'Find the old road', completed: false },
        { id: 'objective-1', description: 'Cross the marshes', completed: false },
      ]);
    });

    test('are coerced when they arrive through the listener', async () => {
      setupFirebaseDataMock({ data: [legacy], loading: false, error: null });

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.quests).toHaveLength(1));

      expect(result.current.quests[0].objectives).toEqual([
        { id: 'objective-0', description: 'Find the old road', completed: false },
        { id: 'objective-1', description: 'Cross the marshes', completed: false },
      ]);
    });

    test('survive the expression that crashed the directory', async () => {
      setupFirebaseDataMock({ data: [legacy], loading: false, error: null });

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.quests).toHaveLength(1));

      // QuestDirectory.tsx:199, verbatim.
      expect(() =>
        result.current.quests.some((q) =>
          q.objectives.some((o) => o.description.toLowerCase().includes('marshes'))
        )
      ).not.toThrow();
    });
  });

  describe('data synchronization', () => {
    test('should update quests when Firebase data is non-empty', async () => {
      const quests = [makeQuest('1', 'Quest A'), makeQuest('2', 'Quest B')];
      setupFirebaseDataMock({ data: quests, loading: false, error: null });

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.quests.length).toBe(2));
    });

    test('should clear quests when no user context', async () => {
      setupContextMocks(null, null, null);
      setupFirebaseDataMock({ data: [], loading: false, error: null });

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.quests).toEqual([]);
    });

    // `useFirebaseData` is now `autoFetch: false` here, so its
    // AUTH_STATE_CHANGED_EVENT listener -- the thing that used to clear
    // `data` on sign-out -- no longer runs. `data` can therefore still hold
    // the previous user's records at the moment sign-out is observed. The
    // effect's guard order is what has to catch that: "signed out" must be
    // checked before "data is present", or the previous user's quests would
    // render on a signed-out screen.
    test('clears the list on sign-out, even though the fetched data is still held', async () => {
      const quests = [makeQuest('1', 'Dragon Hunt'), makeQuest('2', 'Lost Artifact')];
      setupFirebaseDataMock({ data: quests, loading: false, error: null });

      const { result, rerender } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.quests).toHaveLength(2));

      // Sign out: FirebaseContext nulls both activeGroupId and
      // activeCampaignId, but `data` -- no longer cleared by the dropped
      // listener -- still resolves to the same populated array.
      setupContextMocks(null, null, null);
      setupFirebaseDataMock({ data: quests, loading: false, error: null });
      rerender();

      expect(result.current.quests).toEqual([]);
    });
  });

  describe('passthrough from useFirebaseData', () => {
    test('should expose loading state from useFirebaseData', () => {
      setupFirebaseDataMock({ loading: true });
      const { result } = renderHook(() => useQuestData());
      expect(result.current.loading).toBe(true);
    });

    test('should expose error state from useFirebaseData', async () => {
      setupFirebaseDataMock({ error: 'Firestore error', loading: false });
      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('Firestore error');
    });
  });
  // -------------------------------------------------------------------------
  // `loading` means "there is nothing to show yet"
  // -------------------------------------------------------------------------
  describe('loading means "nothing to show yet", not "a fetch is in flight"', () => {
    // CHANGED DELIBERATELY. This hook used to hand out `useFirebaseData`'s raw
    // in-flight flag, which is raised by the refresh every write in this app
    // ends with as well as by the first read. Consumers pass it to
    // `usePageGate`, so a gate re-entered `resolving` after every save and
    // `GatedContent` unmounted what was on screen. Measured in Chrome on
    // `/quests`: ticking an objective in an open row wrote correctly (1 of 3
    // became 2 of 3) and closed the row under the cursor, because the
    // directory that held the "which rows are open" state had been destroyed
    // and rebuilt. The two cases below are the whole distinction.

    test('a refetch behind quests already on screen is not loading', async () => {
      const quests = [makeQuest('quest-1', 'Defeat Saruman')];
      setupFirebaseDataMock({ data: quests });
      const { result, rerender } = renderHook(() => useQuestData());

      await waitFor(() => expect(result.current.quests).toHaveLength(1));

      // In flight again, with the list still on screen.
      setupFirebaseDataMock({ data: quests, loading: true });
      rerender();

      expect(result.current.loading).toBe(false);
      expect(result.current.quests).toHaveLength(1);
    });

    test('a first read with nothing on screen is loading', () => {
      setupFirebaseDataMock({ data: [], loading: true });
      const { result } = renderHook(() => useQuestData());

      expect(result.current.loading).toBe(true);
    });

    test('switching campaign empties the list rather than showing the last one', async () => {
      // Otherwise the rule above would keep the previous campaign's quests on
      // screen -- no longer behind a skeleton -- for the whole window between
      // the switch and the new listener's first snapshot.
      const quests = [makeQuest('quest-1', 'Defeat Saruman')];
      setupFirebaseDataMock({ data: quests });
      const { result, rerender } = renderHook(() => useQuestData());

      await waitFor(() => expect(result.current.quests).toHaveLength(1));

      setupContextMocks('group-1', 'campaign-2');
      setupFirebaseDataMock({ data: [], loading: true });
      rerender();

      expect(result.current.quests).toEqual([]);
      expect(result.current.loading).toBe(true);
    });
  });
});
