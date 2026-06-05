// src/hooks/__tests__/useRumorData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRumorData } from '../useRumorData';
import { Rumor, RumorStatus, SourceType } from '../../types/rumor';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetData = jest.fn();

jest.mock('../useFirebaseData', () => ({
  useFirebaseData: jest.fn(),
}));

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
}));

const { useFirebaseData } = require('../useFirebaseData');
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
describe('useRumorData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupContextMocks();
    setupFirebaseDataMock();
    mockGetData.mockResolvedValue([]);
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

  describe('fetchRumors', () => {
    test('should return empty array when no activeGroupId', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.rumors).toEqual([]);
    });

    test('should return empty array when no activeCampaignId', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.rumors).toEqual([]);
    });

    test('should set rumors from getData result', async () => {
      const rumors = [makeRumor('1', 'Dragon spotted'), makeRumor('2', 'Lost ship')];
      mockGetData.mockResolvedValue(rumors);

      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.rumors.length).toBe(2));
    });

    test('should return fetched rumors from refreshRumors', async () => {
      const rumors = [makeRumor('1', 'Strange lights in the forest')];
      mockGetData.mockResolvedValue(rumors);

      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let refreshResult: Rumor[] = [];
      await act(async () => {
        refreshResult = await result.current.refreshRumors();
      });

      expect(refreshResult).toHaveLength(1);
      expect(refreshResult[0].title).toBe('Strange lights in the forest');
    });

    test('should handle getData returning null gracefully', async () => {
      mockGetData.mockResolvedValue(null as any);

      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.rumors).toEqual([]);
    });

    test('should handle getData errors gracefully', async () => {
      mockGetData.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => useRumorData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const refreshResult = await act(async () => result.current.refreshRumors());
      expect(refreshResult).toEqual([]);
    });
  });

  describe('data synchronization', () => {
    test('should update rumors when Firebase data is non-empty', async () => {
      const rumors = [makeRumor('1', 'Rumor A'), makeRumor('2', 'Rumor B')];
      setupFirebaseDataMock({ data: rumors, loading: false, error: null });
      mockGetData.mockResolvedValue(rumors);

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
});
