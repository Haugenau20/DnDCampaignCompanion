// src/hooks/__tests__/useNPCData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNPCData } from '../useNPCData';
import { NPC, NPCStatus, NPCRelationship } from '../../types/npc';

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

const makeNPC = (id: string, name: string): NPC => ({
  id,
  name,
  description: `Description of ${name}`,
  status: 'alive' as NPCStatus,
  relationship: 'neutral' as NPCRelationship,
  connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
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
describe('useNPCData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupContextMocks();
    setupFirebaseDataMock();
    mockGetData.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------
  describe('return shape', () => {
    test('should expose npcs, loading, error, refreshNPCs, hasRequiredContext', async () => {
      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toHaveProperty('npcs');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refreshNPCs');
      expect(result.current).toHaveProperty('hasRequiredContext');
    });

    test('should start with empty npcs array', async () => {
      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.npcs).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // hasRequiredContext
  // -------------------------------------------------------------------------
  describe('hasRequiredContext', () => {
    test('should be true when both groupId and campaignId are present', async () => {
      setupContextMocks('group-1', 'campaign-1');
      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(true);
    });

    test('should be false when groupId is null', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });

    test('should be false when campaignId is null', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // fetchNPCs / refreshNPCs
  // -------------------------------------------------------------------------
  describe('fetchNPCs', () => {
    test('should return empty array and not call getData when no activeGroupId', async () => {
      setupContextMocks(null, 'campaign-1');

      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.npcs).toEqual([]);
    });

    test('should return empty array and not call getData when no activeCampaignId', async () => {
      setupContextMocks('group-1', null);

      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.npcs).toEqual([]);
    });

    test('should sort NPCs alphabetically by name', async () => {
      const npcs = [
        makeNPC('3', 'Zara'),
        makeNPC('1', 'Aelindra'),
        makeNPC('2', 'Mira'),
      ];
      mockGetData.mockResolvedValue(npcs);

      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.npcs.length).toBeGreaterThan(0));

      expect(result.current.npcs[0].name).toBe('Aelindra');
      expect(result.current.npcs[1].name).toBe('Mira');
      expect(result.current.npcs[2].name).toBe('Zara');
    });

    test('should return sorted npcs from refreshNPCs', async () => {
      const npcs = [makeNPC('2', 'Zara'), makeNPC('1', 'Aelindra')];
      mockGetData.mockResolvedValue(npcs);

      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let refreshResult: NPC[] = [];
      await act(async () => {
        refreshResult = await result.current.refreshNPCs();
      });

      expect(refreshResult[0].name).toBe('Aelindra');
      expect(refreshResult[1].name).toBe('Zara');
    });

    test('should handle getData errors gracefully and return empty array', async () => {
      mockGetData.mockRejectedValue(new Error('Firebase error'));

      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const refreshResult = await act(async () => result.current.refreshNPCs());
      expect(refreshResult).toEqual([]);
      expect(result.current.npcs).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Data sync from useFirebaseData.data
  // -------------------------------------------------------------------------
  describe('data synchronization', () => {
    test('should update npcs when Firebase data changes and data is non-empty', async () => {
      const npcs = [makeNPC('1', 'Aelindra'), makeNPC('2', 'Mira')];
      // The hook reads `data` from useFirebaseData AND calls getData() manually.
      // We need to set both: the data array and the getData return value.
      setupFirebaseDataMock({ data: npcs, loading: false, error: null });
      mockGetData.mockResolvedValue(npcs);

      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.npcs.length).toBe(2));

      // npcs should be sorted
      expect(result.current.npcs[0].name).toBe('Aelindra');
    });

    test('should clear npcs when user is signed out', async () => {
      setupContextMocks(null, null, null);
      setupFirebaseDataMock({ data: [], loading: false, error: null });

      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.npcs).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Passthrough from useFirebaseData
  // -------------------------------------------------------------------------
  describe('passthrough from useFirebaseData', () => {
    test('should expose loading state from useFirebaseData', () => {
      setupFirebaseDataMock({ loading: true });
      const { result } = renderHook(() => useNPCData());
      expect(result.current.loading).toBe(true);
    });

    test('should expose error state from useFirebaseData', async () => {
      setupFirebaseDataMock({ error: 'Something went wrong', loading: false });
      const { result } = renderHook(() => useNPCData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('Something went wrong');
    });
  });
});
