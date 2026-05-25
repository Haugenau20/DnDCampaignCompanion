// src/hooks/__tests__/useSagaData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSagaData } from '../useSagaData';
import { SagaData } from '../../types/saga';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetDocument = jest.fn();
const mockSetDocument = jest.fn();
const mockUpdateDocument = jest.fn();

jest.mock('@/features/user-management', () => ({
  useFirestore: jest.fn(),
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
}));

const { useFirestore, useAuth, useGroups, useCampaigns } = require('@/features/user-management');

const makeSaga = (title: string = 'The Great Saga'): SagaData => ({
  title,
  content: 'Long ago in a land of dragons...',
  lastUpdated: '2025-06-01T00:00:00.000Z',
  version: '1.0.0',
  createdBy: 'user-1',
  createdByUsername: 'TestUser',
  dateAdded: '2025-01-01T00:00:00.000Z',
});

const setupFirestoreMock = () => {
  (useFirestore as jest.Mock).mockReturnValue({
    getDocument: mockGetDocument,
    setDocument: mockSetDocument,
    updateDocument: mockUpdateDocument,
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
describe('useSagaData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFirestoreMock();
    setupContextMocks();
    mockGetDocument.mockResolvedValue(null);
    mockSetDocument.mockResolvedValue(undefined);
    mockUpdateDocument.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------
  describe('return shape', () => {
    test('should expose all required properties', async () => {
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toHaveProperty('saga');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('fetchSaga');
      expect(result.current).toHaveProperty('saveSaga');
      expect(result.current).toHaveProperty('updateSaga');
      expect(result.current).toHaveProperty('hasRequiredContext');
    });

    test('should start with null saga', async () => {
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.saga).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // hasRequiredContext
  // -------------------------------------------------------------------------
  describe('hasRequiredContext', () => {
    test('should be true when both groupId and campaignId are present', async () => {
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(true);
    });

    test('should be false when groupId is null', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });

    test('should be false when campaignId is null', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.hasRequiredContext).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // fetchSaga
  // -------------------------------------------------------------------------
  describe('fetchSaga', () => {
    test('should return null and not fetch when no activeGroupId', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.saga).toBeNull();
      expect(mockGetDocument).not.toHaveBeenCalled();
    });

    test('should return null and not fetch when no activeCampaignId', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.saga).toBeNull();
      expect(mockGetDocument).not.toHaveBeenCalled();
    });

    test('should fetch saga from correct document path', async () => {
      const saga = makeSaga();
      mockGetDocument.mockResolvedValue(saga);

      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetDocument).toHaveBeenCalledWith('saga', 'sagaData');
    });

    test('should set saga state after successful fetch', async () => {
      const saga = makeSaga('Epic Adventure');
      mockGetDocument.mockResolvedValue(saga);

      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.saga).toEqual(saga);
    });

    test('should handle fetch errors gracefully', async () => {
      mockGetDocument.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Failed to load saga data');
      expect(result.current.saga).toBeNull();
    });

    test('should return saga from manual fetchSaga call', async () => {
      const saga = makeSaga('Manual Fetch Saga');
      mockGetDocument.mockResolvedValue(saga);

      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let fetchedSaga: SagaData | null = null;
      await act(async () => {
        fetchedSaga = await result.current.fetchSaga();
      });

      expect(fetchedSaga).toEqual(saga);
    });
  });

  // -------------------------------------------------------------------------
  // saveSaga
  // -------------------------------------------------------------------------
  describe('saveSaga', () => {
    test('should call setDocument with correct arguments', async () => {
      const saga = makeSaga('New Saga');
      mockGetDocument.mockResolvedValue(null);

      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.saveSaga(saga);
      });

      expect(mockSetDocument).toHaveBeenCalledWith('saga', 'sagaData', saga);
    });

    test('should update saga state after successful save', async () => {
      const saga = makeSaga('Saved Saga');
      mockGetDocument.mockResolvedValue(null);

      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.saveSaga(saga);
      });

      expect(result.current.saga).toEqual(saga);
    });

    test('should return true on successful save', async () => {
      const saga = makeSaga();

      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let saveResult: boolean = false;
      await act(async () => {
        saveResult = await result.current.saveSaga(saga);
      });

      expect(saveResult).toBe(true);
    });

    test('should return false when no activeGroupId', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let saveResult: boolean = true;
      await act(async () => {
        saveResult = await result.current.saveSaga(makeSaga());
      });

      expect(saveResult).toBe(false);
    });

    test('should return false when no activeCampaignId', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let saveResult: boolean = true;
      await act(async () => {
        saveResult = await result.current.saveSaga(makeSaga());
      });

      expect(saveResult).toBe(false);
    });

    test('should return false when setDocument throws', async () => {
      mockSetDocument.mockRejectedValue(new Error('Write failed'));

      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let saveResult: boolean = true;
      await act(async () => {
        saveResult = await result.current.saveSaga(makeSaga());
      });

      expect(saveResult).toBe(false);
      expect(result.current.error).toBe('Failed to save saga data');
    });
  });

  // -------------------------------------------------------------------------
  // updateSaga
  // -------------------------------------------------------------------------
  describe('updateSaga', () => {
    test('should call updateDocument with correct arguments', async () => {
      mockGetDocument.mockResolvedValue(makeSaga('Old Title'));

      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const updates = { title: 'New Title' };

      await act(async () => {
        await result.current.updateSaga(updates);
      });

      expect(mockUpdateDocument).toHaveBeenCalledWith('saga', 'sagaData', updates);
    });

    test('should merge updates into existing saga state', async () => {
      const initialSaga = makeSaga('Original Title');
      mockGetDocument.mockResolvedValue(initialSaga);

      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.saga?.title).toBe('Original Title'));

      await act(async () => {
        await result.current.updateSaga({ title: 'Updated Title' });
      });

      expect(result.current.saga?.title).toBe('Updated Title');
      // Other fields should be unchanged
      expect(result.current.saga?.content).toBe(initialSaga.content);
    });

    test('should return true on successful update', async () => {
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let updateResult: boolean = false;
      await act(async () => {
        updateResult = await result.current.updateSaga({ title: 'New Title' });
      });

      expect(updateResult).toBe(true);
    });

    test('should return false when no activeGroupId', async () => {
      setupContextMocks(null, 'campaign-1');
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let updateResult: boolean = true;
      await act(async () => {
        updateResult = await result.current.updateSaga({ title: 'New' });
      });

      expect(updateResult).toBe(false);
    });

    test('should return false when no activeCampaignId', async () => {
      setupContextMocks('group-1', null);
      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let updateResult: boolean = true;
      await act(async () => {
        updateResult = await result.current.updateSaga({ title: 'New' });
      });

      expect(updateResult).toBe(false);
    });

    test('should return false and set error when updateDocument throws', async () => {
      mockUpdateDocument.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useSagaData());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let updateResult: boolean = true;
      await act(async () => {
        updateResult = await result.current.updateSaga({ title: 'New' });
      });

      expect(updateResult).toBe(false);
      expect(result.current.error).toBe('Failed to update saga data');
    });
  });
});
