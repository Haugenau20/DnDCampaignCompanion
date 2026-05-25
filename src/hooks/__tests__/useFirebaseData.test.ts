// src/hooks/__tests__/useFirebaseData.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFirebaseData } from '../useFirebaseData';
import { AUTH_STATE_CHANGED_EVENT } from '@/features/user-management';

// ---------------------------------------------------------------------------
// Mock the firebase context hook
// ---------------------------------------------------------------------------
const mockGetCollection = jest.fn();
const mockSetDocument = jest.fn();
const mockUpdateDocument = jest.fn();
const mockDeleteDocument = jest.fn();

jest.mock('@/features/user-management', () => ({
  useFirestore: jest.fn(),
  AUTH_STATE_CHANGED_EVENT: 'auth-state-changed',
}));

// We need to get a reference to the mocked useFirestore
const { useFirestore } = require('@/features/user-management');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
interface TestItem {
  id: string;
  name: string;
}

const defaultFirestoreMock = () => {
  (useFirestore as jest.Mock).mockReturnValue({
    getCollection: mockGetCollection,
    setDocument: mockSetDocument,
    updateDocument: mockUpdateDocument,
    deleteDocument: mockDeleteDocument,
  });
};

const dispatchAuthEvent = (authenticated: boolean) => {
  const event = new CustomEvent(AUTH_STATE_CHANGED_EVENT, {
    detail: { authenticated },
  });
  window.dispatchEvent(event);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useFirebaseData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultFirestoreMock();
    mockGetCollection.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe('initial state', () => {
    test('should start in loading state', async () => {
      // Delay resolution so we can inspect the loading state
      let resolveCollection: (val: TestItem[]) => void;
      mockGetCollection.mockReturnValue(
        new Promise(resolve => {
          resolveCollection = resolve;
        })
      );

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual([]);
      expect(result.current.error).toBeNull();

      // Resolve to avoid dangling promises
      await act(async () => {
        resolveCollection!([]);
      });
    });

    test('should start with empty data array', () => {
      mockGetCollection.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );
      expect(result.current.data).toEqual([]);
    });

    test('should start with no error', () => {
      mockGetCollection.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );
      expect(result.current.error).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getData
  // -------------------------------------------------------------------------
  describe('getData', () => {
    test('should fetch data from the specified collection', async () => {
      const items: TestItem[] = [
        { id: '1', name: 'Alpha' },
        { id: '2', name: 'Beta' },
      ];
      mockGetCollection.mockResolvedValue(items);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockGetCollection).toHaveBeenCalledWith('items');
      expect(result.current.data).toEqual(items);
    });

    test('should set loading=false after successful fetch', async () => {
      mockGetCollection.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.loading).toBe(false);
    });

    test('should set error when fetch fails', async () => {
      mockGetCollection.mockRejectedValue(new Error('Firestore unavailable'));

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('Firestore unavailable');
    });

    test('should set fallback error message for non-Error rejections', async () => {
      mockGetCollection.mockRejectedValue('something went wrong');

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('Failed to fetch data');
    });

    test('should return empty array and set error on fetch failure', async () => {
      mockGetCollection.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const returnValue = await act(async () => result.current.getData());
      expect(returnValue).toEqual([]);
    });

    test('should return fetched data when getData is called manually', async () => {
      const items: TestItem[] = [{ id: '3', name: 'Gamma' }];
      mockGetCollection.mockResolvedValue(items);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const returnedData = await act(async () => result.current.getData());
      expect(returnedData).toEqual(items);
    });

    test('should clear error on subsequent successful fetch', async () => {
      mockGetCollection
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce([{ id: '1', name: 'Item' }]);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('First failure');

      await act(async () => {
        await result.current.getData();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // addData
  // -------------------------------------------------------------------------
  describe('addData', () => {
    test('should add new item optimistically to data array', async () => {
      mockGetCollection.mockResolvedValue([]);
      mockSetDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newItem: TestItem = { id: 'new-1', name: 'NewItem' };

      await act(async () => {
        await result.current.addData(newItem, 'new-1');
      });

      expect(result.current.data).toContainEqual(expect.objectContaining({ name: 'NewItem' }));
    });

    test('should use provided documentId for setDocument call', async () => {
      mockGetCollection.mockResolvedValue([]);
      mockSetDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newItem: TestItem = { id: 'explicit-id', name: 'Test' };

      await act(async () => {
        await result.current.addData(newItem, 'explicit-id');
      });

      expect(mockSetDocument).toHaveBeenCalledWith('items', 'explicit-id', newItem);
    });

    test('should use idField to derive document ID when no explicit ID given', async () => {
      mockGetCollection.mockResolvedValue([]);
      mockSetDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items', idField: 'id' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newItem: TestItem = { id: 'derived-id', name: 'Test' };

      await act(async () => {
        await result.current.addData(newItem);
      });

      expect(mockSetDocument).toHaveBeenCalledWith('items', 'derived-id', newItem);
    });

    test('should return the document ID after successful add', async () => {
      mockGetCollection.mockResolvedValue([]);
      mockSetDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newItem: TestItem = { id: 'ret-id', name: 'Test' };

      let returnedId: string | undefined;
      await act(async () => {
        returnedId = await result.current.addData(newItem, 'ret-id');
      });

      expect(returnedId).toBe('ret-id');
    });

    test('should set error and rethrow when setDocument fails', async () => {
      mockGetCollection.mockResolvedValue([]);
      mockSetDocument.mockRejectedValue(new Error('Write failed'));

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newItem: TestItem = { id: 'fail-id', name: 'Test' };

      let caughtError: Error | null = null;
      await act(async () => {
        try {
          await result.current.addData(newItem, 'fail-id');
        } catch (e) {
          caughtError = e as Error;
        }
      });

      expect(caughtError).not.toBeNull();
      expect((caughtError as unknown as Error).message).toBe('Write failed');
      expect(result.current.error).toBe('Write failed');
    });

    test('should use crypto.randomUUID when no documentId and no idField', async () => {
      mockGetCollection.mockResolvedValue([]);
      mockSetDocument.mockResolvedValue(undefined);

      // Mock crypto.randomUUID
      const mockUUID = 'generated-uuid-1234';
      const originalRandomUUID = global.crypto?.randomUUID;
      Object.defineProperty(global, 'crypto', {
        value: { randomUUID: jest.fn().mockReturnValue(mockUUID) },
        configurable: true,
      });

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newItem: TestItem = { id: '', name: 'Test' };

      let returnedId: string | undefined;
      await act(async () => {
        // No documentId, no idField → should use crypto.randomUUID
        returnedId = await result.current.addData(newItem);
      });

      expect(returnedId).toBe(mockUUID);
      expect(mockSetDocument).toHaveBeenCalledWith('items', mockUUID, newItem);

      // Restore
      Object.defineProperty(global, 'crypto', {
        value: { randomUUID: originalRandomUUID },
        configurable: true,
      });
    });

    test('should expose setDocument as alias for addData (backward compatibility)', async () => {
      mockGetCollection.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.setDocument).toBe(result.current.addData);
    });
  });

  // -------------------------------------------------------------------------
  // updateData
  // -------------------------------------------------------------------------
  describe('updateData', () => {
    test('should update item in data array after successful update', async () => {
      const initial: TestItem[] = [{ id: 'item-1', name: 'Original' }];
      mockGetCollection.mockResolvedValue(initial);
      mockUpdateDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updateData('item-1', { name: 'Updated' });
      });

      expect(result.current.data).toContainEqual(
        expect.objectContaining({ id: 'item-1', name: 'Updated' })
      );
    });

    test('should call updateDocument with correct arguments', async () => {
      mockGetCollection.mockResolvedValue([{ id: 'x', name: 'X' }]);
      mockUpdateDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const updates = { name: 'Changed' };

      await act(async () => {
        await result.current.updateData('x', updates);
      });

      expect(mockUpdateDocument).toHaveBeenCalledWith('items', 'x', updates);
    });

    test('should set error and rethrow when updateDocument fails', async () => {
      mockGetCollection.mockResolvedValue([{ id: 'x', name: 'X' }]);
      mockUpdateDocument.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      let caughtError: Error | null = null;
      await act(async () => {
        try {
          await result.current.updateData('x', { name: 'Changed' });
        } catch (e) {
          caughtError = e as Error;
        }
      });

      expect(caughtError).not.toBeNull();
      expect((caughtError as unknown as Error).message).toBe('Update failed');
      expect(result.current.error).toBe('Update failed');
    });

    test('should set fallback error message for non-Error updateDocument rejections', async () => {
      mockGetCollection.mockResolvedValue([{ id: 'x', name: 'X' }]);
      mockUpdateDocument.mockRejectedValue('non-error-rejection');

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        try {
          await result.current.updateData('x', { name: 'Changed' });
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Failed to update data');
    });

    test('should not modify other items when one item is updated', async () => {
      const items: TestItem[] = [
        { id: '1', name: 'One' },
        { id: '2', name: 'Two' },
      ];
      mockGetCollection.mockResolvedValue(items);
      mockUpdateDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updateData('1', { name: 'One-Updated' });
      });

      const item2 = result.current.data.find(i => i.id === '2');
      expect(item2?.name).toBe('Two');
    });
  });

  // -------------------------------------------------------------------------
  // deleteData
  // -------------------------------------------------------------------------
  describe('deleteData', () => {
    test('should remove item from data array after successful delete', async () => {
      const items: TestItem[] = [
        { id: 'del-1', name: 'ToDelete' },
        { id: 'keep-1', name: 'ToKeep' },
      ];
      mockGetCollection.mockResolvedValue(items);
      mockDeleteDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteData('del-1');
      });

      expect(result.current.data).not.toContainEqual(
        expect.objectContaining({ id: 'del-1' })
      );
      expect(result.current.data).toContainEqual(
        expect.objectContaining({ id: 'keep-1' })
      );
    });

    test('should call deleteDocument with correct arguments', async () => {
      mockGetCollection.mockResolvedValue([{ id: 'd-1', name: 'D1' }]);
      mockDeleteDocument.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteData('d-1');
      });

      expect(mockDeleteDocument).toHaveBeenCalledWith('items', 'd-1');
    });

    test('should set fallback error message for non-Error deleteDocument rejections', async () => {
      mockGetCollection.mockResolvedValue([{ id: 'd-1', name: 'D1' }]);
      mockDeleteDocument.mockRejectedValue('non-error-rejection');

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        try {
          await result.current.deleteData('d-1');
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('Failed to delete data');
    });

    test('should set error and rethrow when deleteDocument fails', async () => {
      mockGetCollection.mockResolvedValue([{ id: 'd-1', name: 'D1' }]);
      mockDeleteDocument.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      let caughtError: Error | null = null;
      await act(async () => {
        try {
          await result.current.deleteData('d-1');
        } catch (e) {
          caughtError = e as Error;
        }
      });

      expect(caughtError).not.toBeNull();
      expect((caughtError as unknown as Error).message).toBe('Delete failed');
      expect(result.current.error).toBe('Delete failed');
    });
  });

  // -------------------------------------------------------------------------
  // Auth state change listener
  // -------------------------------------------------------------------------
  describe('auth state change listener', () => {
    test('should clear data immediately on sign out', async () => {
      const items: TestItem[] = [{ id: '1', name: 'Item' }];
      mockGetCollection.mockResolvedValue(items);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual(items);

      // Simulate sign-out (after this call getData is triggered again, returning [])
      mockGetCollection.mockResolvedValue([]);

      await act(async () => {
        dispatchAuthEvent(false);
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
      // Data should be cleared
      expect(result.current.data).toEqual([]);
    });

    test('should refresh data on auth state change (sign in)', async () => {
      mockGetCollection.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newItems: TestItem[] = [{ id: '5', name: 'New' }];
      mockGetCollection.mockResolvedValue(newItems);

      await act(async () => {
        dispatchAuthEvent(true);
      });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual(newItems);
    });

    test('should remove auth listener on unmount', async () => {
      mockGetCollection.mockResolvedValue([]);
      const addSpy = jest.spyOn(window, 'addEventListener');
      const removeSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => {
        const added = addSpy.mock.calls.some(
          ([eventName]) => eventName === AUTH_STATE_CHANGED_EVENT
        );
        expect(added).toBe(true);
      });

      unmount();

      const removed = removeSpy.mock.calls.some(
        ([eventName]) => eventName === AUTH_STATE_CHANGED_EVENT
      );
      expect(removed).toBe(true);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------
  describe('return shape', () => {
    test('should expose all required fields', async () => {
      mockGetCollection.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('getData');
      expect(result.current).toHaveProperty('addData');
      expect(result.current).toHaveProperty('updateData');
      expect(result.current).toHaveProperty('deleteData');
      expect(result.current).toHaveProperty('setDocument');
    });

    test('should expose getData, addData, updateData, deleteData as functions', async () => {
      mockGetCollection.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useFirebaseData<TestItem>({ collection: 'items' })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(typeof result.current.getData).toBe('function');
      expect(typeof result.current.addData).toBe('function');
      expect(typeof result.current.updateData).toBe('function');
      expect(typeof result.current.deleteData).toBe('function');
    });
  });
});
