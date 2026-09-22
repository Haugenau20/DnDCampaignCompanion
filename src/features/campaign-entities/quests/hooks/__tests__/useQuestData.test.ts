// src/hooks/__tests__/useQuestData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuestData } from '../useQuestData';
import { Quest, QuestStatus } from '../../types';

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
describe('useQuestData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupContextMocks();
    setupFirebaseDataMock();
    mockGetData.mockResolvedValue([]);
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

  describe('fetchQuests', () => {
    test('should return empty array when no activeGroupId', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.quests).toEqual([]);
    });

    test('should return empty array when no activeCampaignId', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.quests).toEqual([]);
    });

    test('should set quests from getData result', async () => {
      const quests = [makeQuest('1', 'Dragon Hunt'), makeQuest('2', 'Lost Artifact')];
      mockGetData.mockResolvedValue(quests);

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.quests.length).toBe(2));
    });

    test('should handle getData returning null gracefully', async () => {
      // Covers the `data || []` branch
      mockGetData.mockResolvedValue(null as any);

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.quests).toEqual([]);
    });

    test('should handle getData errors gracefully', async () => {
      mockGetData.mockRejectedValue(new Error('Firebase error'));

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const refreshResult = await act(async () => result.current.refreshQuests());
      expect(refreshResult).toEqual([]);
    });
  });

  describe('getQuestById', () => {
    test('should find quest by ID', async () => {
      const quests = [makeQuest('q-1', 'Dragon Hunt'), makeQuest('q-2', 'Lost Artifact')];
      mockGetData.mockResolvedValue(quests);
      setupFirebaseDataMock({ data: quests, loading: false, error: null });

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.quests.length).toBe(2));

      // Manually trigger refresh to populate quests state
      await act(async () => {
        await result.current.refreshQuests();
      });

      const found = result.current.getQuestById('q-1');
      expect(found).toBeDefined();
      expect(found?.title).toBe('Dragon Hunt');
    });

    test('should return undefined for non-existent quest ID', async () => {
      mockGetData.mockResolvedValue([]);

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const found = result.current.getQuestById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  /*
    Documents written before T050 hold `objectives` as bare strings, and one is
    enough to crash `QuestDirectory`'s search on `obj.description.toLowerCase()`.
    Quests reach state by TWO routes, and the first fix normalised only one --
    which left the defect fully live, because the effect below is what the
    directory renders from on a warm load. It was found in Chrome against a
    seeded pre-fix document, never here, so each route now gets its own case
    with the other route deliberately returning nothing.
  */
  describe('legacy documents with string objectives', () => {
    const legacy = {
      ...makeQuest('legacy-1', 'Written before the fix'),
      objectives: ['Find the old road', 'Cross the marshes'],
    } as unknown as Quest;

    test('are coerced when they arrive through the explicit fetch', async () => {
      mockGetData.mockResolvedValue([legacy]);
      setupFirebaseDataMock({ data: [], loading: false, error: null });

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.quests).toHaveLength(1));

      expect(result.current.quests[0].objectives).toEqual([
        { id: 'objective-0', description: 'Find the old road', completed: false },
        { id: 'objective-1', description: 'Cross the marshes', completed: false },
      ]);
    });

    test('are coerced when they arrive through the data effect', async () => {
      // `getData` never settles, so `fetchQuests` cannot write to state and
      // only the effect can populate the list. This is the route the first
      // fix missed. (Returning `[]` instead would race: the effect fills the
      // list, then the resolved empty fetch clears it again.)
      mockGetData.mockReturnValue(new Promise(() => {}));
      setupFirebaseDataMock({ data: [legacy], loading: false, error: null });

      const { result } = renderHook(() => useQuestData());
      await waitFor(() => expect(result.current.quests).toHaveLength(1));

      expect(result.current.quests[0].objectives).toEqual([
        { id: 'objective-0', description: 'Find the old road', completed: false },
        { id: 'objective-1', description: 'Cross the marshes', completed: false },
      ]);
    });

    test('survive the expression that crashed the directory', async () => {
      mockGetData.mockReturnValue(new Promise(() => {}));
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
      mockGetData.mockResolvedValue(quests);

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
      mockGetData.mockResolvedValue(quests);

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
      // The mounting fetch resolves to the same list, so nothing races it
      // back to empty behind the assertions.
      mockGetData.mockResolvedValue(quests);
      const { result, rerender } = renderHook(() => useQuestData());

      await waitFor(() => expect(result.current.quests).toHaveLength(1));

      // The write's refresh: in flight, with the list still on screen.
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
      // the switch and the new fetch resolving.
      const quests = [makeQuest('quest-1', 'Defeat Saruman')];
      setupFirebaseDataMock({ data: quests });
      // The mounting fetch resolves to the same list, so nothing races it
      // back to empty behind the assertions.
      mockGetData.mockResolvedValue(quests);
      const { result, rerender } = renderHook(() => useQuestData());

      await waitFor(() => expect(result.current.quests).toHaveLength(1));

      setupContextMocks('group-1', 'campaign-2');
      setupFirebaseDataMock({ data: [], loading: true });
      mockGetData.mockResolvedValue([]);
      rerender();

      expect(result.current.quests).toEqual([]);
      expect(result.current.loading).toBe(true);
    });
  });
});
