// src/shared/hooks/__tests__/useFirebaseData.subscription.test.ts
// `useFirebaseData`'s listener mode (T032): with `subscribeTo`, an instance
// follows a Firestore listener instead of fetching, and a refresh after a
// write answers from the latest snapshot without a read.

import { renderHook, act, waitFor } from '@testing-library/react';
import { useFirebaseData } from '../useFirebaseData';

const mockGetCollection = jest.fn();
const mockSubscribeToCollection = jest.fn();
const mockCreateDocument = jest.fn();
const mockUpdateDocumentWithAttribution = jest.fn();
const mockDeleteDocument = jest.fn();

const mockFirestore = {
  getCollection: mockGetCollection,
  subscribeToCollection: mockSubscribeToCollection,
  createDocument: mockCreateDocument,
  updateDocumentWithAttribution: mockUpdateDocumentWithAttribution,
  deleteDocument: mockDeleteDocument,
};

jest.mock('@/features/user-management', () => ({
  useFirestore: () => mockFirestore,
  AUTH_STATE_CHANGED_EVENT: 'auth-state-changed',
}));

interface Item {
  id: string;
  name: string;
}

/**
 * A stand-in for Firestore's listeners: records each one opened, lets a test
 * push snapshots or an error into it, and whether it has been closed.
 */
interface FakeListener {
  path: string;
  emit: (documents: Item[]) => void;
  fail: (error: Error) => void;
  closed: boolean;
}

let listeners: FakeListener[];

beforeEach(() => {
  jest.clearAllMocks();
  listeners = [];
  mockSubscribeToCollection.mockImplementation(
    (path: string, onNext: (d: Item[]) => void, onError: (e: Error) => void) => {
      const listener: FakeListener = { path, emit: onNext, fail: onError, closed: false };
      listeners.push(listener);
      return () => {
        listener.closed = true;
      };
    }
  );
  mockCreateDocument.mockResolvedValue(undefined);
  mockUpdateDocumentWithAttribution.mockResolvedValue(undefined);
  mockDeleteDocument.mockResolvedValue(undefined);
});

const PATH_A = 'groups/g/campaigns/a/items';
const PATH_B = 'groups/g/campaigns/b/items';

const renderSubscribed = (initialPath: string | null) =>
  renderHook(
    ({ path }: { path: string | null }) =>
      useFirebaseData<Item>({ collection: 'items', subscribeTo: path }),
    { initialProps: { path: initialPath } }
  );

describe('useFirebaseData with subscribeTo', () => {
  test('opens one listener on the given path and never fetches', () => {
    renderSubscribed(PATH_A);

    expect(listeners.map(l => l.path)).toEqual([PATH_A]);
    expect(mockGetCollection).not.toHaveBeenCalled();
  });

  test('is loading until the first snapshot, then holds its documents', () => {
    const { result } = renderSubscribed(PATH_A);
    expect(result.current.loading).toBe(true);

    act(() => listeners[0].emit([{ id: '1', name: 'Bilbo' }]));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual([{ id: '1', name: 'Bilbo' }]);
  });

  test('follows later snapshots, including one that empties the collection', () => {
    const { result } = renderSubscribed(PATH_A);
    act(() => listeners[0].emit([{ id: '1', name: 'Bilbo' }]));
    act(() => listeners[0].emit([{ id: '1', name: 'Bilbo' }, { id: '2', name: 'Frodo' }]));
    expect(result.current.data).toHaveLength(2);

    act(() => listeners[0].emit([]));
    expect(result.current.data).toEqual([]);
  });

  test('getData answers from the latest snapshot without a read', async () => {
    const { result } = renderSubscribed(PATH_A);
    act(() => listeners[0].emit([{ id: '1', name: 'Bilbo' }]));

    let answered: Item[] = [];
    await act(async () => {
      answered = await result.current.getData();
    });

    expect(answered).toEqual([{ id: '1', name: 'Bilbo' }]);
    expect(mockGetCollection).not.toHaveBeenCalled();
  });

  test('getData before the first snapshot waits for it', async () => {
    const { result } = renderSubscribed(PATH_A);

    let answered: Item[] | undefined;
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.getData().then(documents => {
        answered = documents;
      });
    });
    expect(answered).toBeUndefined();

    await act(async () => {
      listeners[0].emit([{ id: '1', name: 'Bilbo' }]);
      await pending;
    });
    expect(answered).toEqual([{ id: '1', name: 'Bilbo' }]);
  });

  test('changing the path closes the old listener and opens the new one', () => {
    const { result, rerender } = renderSubscribed(PATH_A);
    act(() => listeners[0].emit([{ id: '1', name: 'Bilbo' }]));

    rerender({ path: PATH_B });

    expect(listeners[0].closed).toBe(true);
    expect(listeners.map(l => l.path)).toEqual([PATH_A, PATH_B]);
    expect(result.current.loading).toBe(true);

    act(() => listeners[1].emit([{ id: '9', name: 'Smaug' }]));
    expect(result.current.data).toEqual([{ id: '9', name: 'Smaug' }]);
  });

  test('a null path opens no listener, holds nothing and is not loading', async () => {
    const { result } = renderSubscribed(null);

    expect(listeners).toHaveLength(0);
    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(false);
    await expect(result.current.getData()).resolves.toEqual([]);
  });

  test('going from a path to null closes the listener and empties the data', () => {
    const { result, rerender } = renderSubscribed(PATH_A);
    act(() => listeners[0].emit([{ id: '1', name: 'Bilbo' }]));

    rerender({ path: null });

    expect(listeners[0].closed).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  test('unmounting closes the listener', () => {
    const { unmount } = renderSubscribed(PATH_A);
    unmount();
    expect(listeners[0].closed).toBe(true);
  });

  test('a listener error is reported, and getData stops waiting', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderSubscribed(PATH_A);

    act(() => listeners[0].fail(new Error('Missing or insufficient permissions.')));

    expect(result.current.error).toBe('Missing or insufficient permissions.');
    expect(result.current.loading).toBe(false);
    await expect(result.current.getData()).resolves.toEqual([]);
  });

  test('retry reopens a listener that failed, and resolves with its first snapshot', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderSubscribed(PATH_A);
    act(() => listeners[0].fail(new Error('unavailable')));

    let answered: Item[] | undefined;
    act(() => {
      void result.current.retry().then(documents => {
        answered = documents;
      });
    });

    // Firestore closes a failed listener; the page's Retry is the only way
    // back, so it must open a new one rather than answer from the failure.
    expect(listeners).toHaveLength(2);
    expect(listeners[1].path).toBe(PATH_A);
    expect(result.current.error).toBeNull();

    await act(async () => listeners[1].emit([{ id: '1', name: 'Bilbo' }]));
    expect(answered).toEqual([{ id: '1', name: 'Bilbo' }]);
    expect(result.current.data).toEqual([{ id: '1', name: 'Bilbo' }]);
  });

  test('retry on a healthy listener opens nothing and reads nothing', async () => {
    const { result } = renderSubscribed(PATH_A);
    act(() => listeners[0].emit([{ id: '1', name: 'Bilbo' }]));

    await expect(result.current.retry()).resolves.toEqual([{ id: '1', name: 'Bilbo' }]);
    expect(listeners).toHaveLength(1);
    expect(mockGetCollection).not.toHaveBeenCalled();
  });

  test('after a path change, data holds nothing of the old path before the new snapshot', () => {
    const { result, rerender } = renderSubscribed(PATH_A);
    act(() => listeners[0].emit([{ id: '1', name: 'Bilbo' }]));

    rerender({ path: PATH_B });

    // Campaign B's page must never list campaign A's records, even briefly.
    expect(result.current.data).toEqual([]);
  });

  test('a write leaves data to the listener rather than adding the record twice', async () => {
    const { result } = renderSubscribed(PATH_A);
    act(() => listeners[0].emit([]));

    await act(async () => {
      await result.current.addData({ name: 'Bilbo' } as any, 'bilbo');
    });
    // The SDK delivers the write through the listener; nothing else may add it.
    expect(result.current.data).toEqual([]);

    act(() => listeners[0].emit([{ id: 'bilbo', name: 'Bilbo' }]));
    expect(result.current.data).toEqual([{ id: 'bilbo', name: 'Bilbo' }]);

    await act(async () => {
      await result.current.updateData('bilbo', { name: 'Mr Baggins' });
      await result.current.deleteData('bilbo');
    });
    expect(result.current.data).toEqual([{ id: 'bilbo', name: 'Bilbo' }]);
  });
});
