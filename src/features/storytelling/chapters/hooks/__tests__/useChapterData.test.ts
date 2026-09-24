// src/features/storytelling/chapters/hooks/__tests__/useChapterData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChapterData } from '../useChapterData';
import { Chapter } from 'features/storytelling/chapters/types';

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

const makeChapter = (id: string, title: string, order: number): Chapter => ({
  id,
  title,
  content: `Content of ${title}`,
  order,
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
describe('useChapterData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupContextMocks();
    setupFirebaseDataMock();
    mockGetData.mockResolvedValue([]);
  });

  describe('return shape', () => {
    test('should expose chapters, loading, error, refreshChapters, hasRequiredContext', async () => {
      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toHaveProperty('chapters');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refreshChapters');
      expect(result.current).toHaveProperty('hasRequiredContext');
    });

    test('should start with empty chapters array', async () => {
      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.chapters).toEqual([]);
    });
  });

  describe('hasRequiredContext', () => {
    test('should be true when both groupId and campaignId are present', async () => {
      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(true);
    });

    test('should be false when groupId is null', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });

    test('should be false when campaignId is null', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });
  });

  describe('fetchChapters - sorting', () => {
    test('should sort chapters by order number ascending', async () => {
      const chapters = [
        makeChapter('3', 'Chapter Three', 3),
        makeChapter('1', 'Chapter One', 1),
        makeChapter('2', 'Chapter Two', 2),
      ];
      mockGetData.mockResolvedValue(chapters);

      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.chapters.length).toBe(3));

      expect(result.current.chapters[0].order).toBe(1);
      expect(result.current.chapters[1].order).toBe(2);
      expect(result.current.chapters[2].order).toBe(3);
    });

    test('should return sorted chapters from refreshChapters', async () => {
      const chapters = [makeChapter('2', 'Ch 2', 2), makeChapter('1', 'Ch 1', 1)];
      mockGetData.mockResolvedValue(chapters);

      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let refreshResult: Chapter[] = [];
      await act(async () => {
        refreshResult = await result.current.refreshChapters();
      });

      expect(refreshResult[0].order).toBe(1);
      expect(refreshResult[1].order).toBe(2);
    });
  });

  describe('fetchChapters - guard conditions', () => {
    test('should return empty array and not call getData when no activeGroupId', async () => {
      setupContextMocks(null, 'campaign-1');

      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.chapters).toEqual([]);
    });

    test('should return empty array when no activeCampaignId', async () => {
      setupContextMocks('group-1', null);

      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.chapters).toEqual([]);
    });

    test('should handle getData errors gracefully', async () => {
      mockGetData.mockRejectedValue(new Error('Firebase error'));

      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const refreshResult = await act(async () => result.current.refreshChapters());
      expect(refreshResult).toEqual([]);
    });
  });

  describe('data synchronization from useFirebaseData.data', () => {
    test('should sort and set chapters when Firebase data is non-empty', async () => {
      const chapters = [makeChapter('2', 'Ch 2', 2), makeChapter('1', 'Ch 1', 1)];
      setupFirebaseDataMock({ data: chapters, loading: false, error: null });
      mockGetData.mockResolvedValue(chapters);

      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.chapters.length).toBe(2));

      expect(result.current.chapters[0].order).toBe(1);
    });

    test('should clear chapters when no user context', async () => {
      setupContextMocks(null, null, null);
      setupFirebaseDataMock({ data: [], loading: false, error: null });

      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.chapters).toEqual([]);
    });

    // `useFirebaseData` is now `autoFetch: false` here, so its
    // AUTH_STATE_CHANGED_EVENT listener -- the thing that used to clear
    // `data` on sign-out -- no longer runs. `data` can therefore still hold
    // the previous user's records at the moment sign-out is observed. The
    // effect's guard order is what has to catch that: "signed out" must be
    // checked before "data is present", or the previous user's chapters
    // would render on a signed-out screen.
    test('clears the list on sign-out, even though the fetched data is still held', async () => {
      const chapters = [makeChapter('1', 'Ch 1', 1), makeChapter('2', 'Ch 2', 2)];
      setupFirebaseDataMock({ data: chapters, loading: false, error: null });
      mockGetData.mockResolvedValue(chapters);

      const { result, rerender } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.chapters).toHaveLength(2));

      // Sign out: FirebaseContext nulls both activeGroupId and
      // activeCampaignId, but `data` -- no longer cleared by the dropped
      // listener -- still resolves to the same populated array.
      setupContextMocks(null, null, null);
      setupFirebaseDataMock({ data: chapters, loading: false, error: null });
      rerender();

      expect(result.current.chapters).toEqual([]);
    });
  });

  describe('passthrough from useFirebaseData', () => {
    test('should expose loading state from useFirebaseData', () => {
      setupFirebaseDataMock({ loading: true });
      const { result } = renderHook(() => useChapterData());
      expect(result.current.loading).toBe(true);
    });

    test('should expose error state from useFirebaseData', async () => {
      setupFirebaseDataMock({ error: 'Firestore offline', loading: false });
      const { result } = renderHook(() => useChapterData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('Firestore offline');
    });
  });

  // -------------------------------------------------------------------------
  // `loading` means "there is nothing to show yet"
  // -------------------------------------------------------------------------
  describe('loading means "nothing to show yet", not "a fetch is in flight"', () => {
    // T044. Every chapter write ends in `refreshChapters()`, which raises
    // `useFirebaseData`'s in-flight flag. The story pages pass this flag to
    // `usePageGate`, so a save re-entered `resolving` and `GatedContent`
    // swapped the page for its skeleton. The same rule already holds for the
    // four entity hooks (see `useQuestData.test.ts`).

    test('a refetch behind chapters already on screen is not loading', async () => {
      const chapters = [makeChapter('chapter-01', 'Prologue', 1)];
      setupFirebaseDataMock({ data: chapters });
      // The mounting fetch resolves to the same list, so nothing races it
      // back to empty behind the assertions.
      mockGetData.mockResolvedValue(chapters);
      const { result, rerender } = renderHook(() => useChapterData());

      await waitFor(() => expect(result.current.chapters).toHaveLength(1));

      // The write's refresh: in flight, with the list still on screen.
      setupFirebaseDataMock({ data: chapters, loading: true });
      rerender();

      expect(result.current.loading).toBe(false);
      expect(result.current.chapters).toHaveLength(1);
    });

    test('a first read with nothing on screen is loading', () => {
      setupFirebaseDataMock({ data: [], loading: true });
      const { result } = renderHook(() => useChapterData());

      expect(result.current.loading).toBe(true);
    });

    test('switching campaign empties the list rather than showing the last one', async () => {
      // Otherwise the rule above would keep the previous campaign's chapters
      // on screen -- no longer behind a skeleton -- for the whole window
      // between the switch and the new fetch resolving.
      const chapters = [makeChapter('chapter-01', 'Prologue', 1)];
      setupFirebaseDataMock({ data: chapters });
      mockGetData.mockResolvedValue(chapters);
      const { result, rerender } = renderHook(() => useChapterData());

      await waitFor(() => expect(result.current.chapters).toHaveLength(1));

      setupContextMocks('group-1', 'campaign-2');
      setupFirebaseDataMock({ data: [], loading: true });
      mockGetData.mockResolvedValue([]);
      rerender();

      expect(result.current.chapters).toEqual([]);
      expect(result.current.loading).toBe(true);
    });
  });
});
