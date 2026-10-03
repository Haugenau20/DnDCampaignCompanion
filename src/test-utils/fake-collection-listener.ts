// src/test-utils/fake-collection-listener.ts

/**
 * A stand-in for Firestore's collection listeners, for suites that mock
 * `DocumentService` (T032).
 *
 * `subscribe` replaces `DocumentService.subscribeToCollection`. Each listener
 * it opens gets its first snapshot from `firstSnapshot` -- a jest mock the test
 * can resolve, reject, or hold open with a deferred promise, the way it once
 * configured `getCollection` -- and from then on every write made through
 * `create`, `update` or `remove` is delivered to every open listener, as the
 * SDK's latency compensation does before the write's promise resolves.
 *
 * Install the write fakes as the mocked service's implementations
 * (`createDocument.mockImplementation(listener.create)`); a test that needs a
 * write to fail can still override them.
 */
export function createFakeCollectionListener<T extends { id: string }>() {
  let documents: T[] = [];
  const open = new Set<(documents: T[]) => void>();

  /** What a newly opened listener's first snapshot delivers. */
  const firstSnapshot = jest.fn<Promise<T[]>, []>(() => Promise.resolve(documents));

  /** Delivers the current documents to every open listener. */
  const emit = () => open.forEach((onNext) => onNext([...documents]));

  const subscribe = jest.fn(
    (
      _path: string,
      onNext: (documents: T[]) => void,
      onError: (error: Error) => void,
      _constraints?: unknown[]
    ) => {
      let closed = false;
      firstSnapshot().then(
        (initial) => {
          if (closed) return;
          documents = initial ?? [];
          open.add(onNext);
          onNext([...documents]);
        },
        (error: Error) => {
          if (!closed) onError(error);
        }
      );
      return () => {
        closed = true;
        open.delete(onNext);
      };
    }
  );

  return {
    subscribe,
    firstSnapshot,
    emit,
    /** `createDocument(path, data, id)`, delivered to the listeners. */
    create: async (_path: string, data: Partial<T>, id: string) => {
      documents = [...documents, { ...data, id } as T];
      emit();
    },
    /** `updateDocument*(path, id, changes)`, delivered to the listeners. */
    update: async (_path: string, id: string, changes: Partial<T>) => {
      documents = documents.map((document) => (document.id === id ? { ...document, ...changes } : document));
      emit();
    },
    /** `deleteDocument(path, id)`, delivered to the listeners. */
    remove: async (_path: string, id: string) => {
      documents = documents.filter((document) => document.id !== id);
      emit();
    },
    /** Forget the documents and every listener; call in `beforeEach`. */
    reset: () => {
      documents = [];
      open.clear();
      firstSnapshot.mockImplementation(() => Promise.resolve(documents));
    },
  };
}
