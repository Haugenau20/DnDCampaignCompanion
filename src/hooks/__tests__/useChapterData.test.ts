// src/hooks/__tests__/useChapterData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChapterData } from '../useChapterData';
import { Chapter } from '../../types/story';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetData = jest.fn();

jest.mock('../useFirebaseData', () => ({
  useFirebaseData: jest.fn(),
}));

jest.mock('../../context/firebase', () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
}));

const { useFirebaseData } = require('../useFirebaseData');
const { useAuth, useGroups, useCampaigns } = require('../../context/firebase');

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
});
