// src/hooks/__tests__/useQuestData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuestData } from '../useQuestData';
import { Quest, QuestStatus } from '../../types/quest';

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
});
