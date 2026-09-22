// src/shared/hooks/useFirebaseData.ts
import { useState, useCallback, useEffect } from 'react';
import { useFirestore } from 'features/user-management';
import { AUTH_STATE_CHANGED_EVENT } from 'features/user-management';
import { DomainData } from 'core/types/common';

interface UseFirebaseDataOptions<T> {
  collection: string;
  idField?: keyof T;
  /**
   * Whether this instance owns a copy of the collection.
   *
   * Defaults to `true`: the hook fetches on mount and refetches on every auth
   * state change. Pass `false` for a **write-only** instance — one mounted
   * purely for `addData`/`updateData`/`deleteData`, whose `data` array nothing
   * renders. Such an instance fetching the collection is pure waste: a second
   * set of transforms, promises, loading states and React updates against data
   * no one reads. See the note on `addData` below.
   *
   * This is per-call-site rather than a change of default because at least one
   * second instance is NOT write-only: `StoryContext`'s `story-progress`
   * instance genuinely reads `data`.
   */
  autoFetch?: boolean;
}

export function useFirebaseData<T extends Record<string, any>>(
  options: UseFirebaseDataOptions<T>
) {
  const { autoFetch = true } = options;
  const [data, setData] = useState<T[]>([]);
  // A write-only instance has nothing in flight on mount, so it must not claim
  // to be loading -- that flag would otherwise stay `true` for this instance's
  // entire life and lie to any future consumer.
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const {
    getCollection,
    createDocument,
    updateDocumentWithAttribution,
    deleteDocument
  } = useFirestore();

  const getData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedData = await getCollection<T>(options.collection);
      setData(fetchedData);
      return fetchedData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('Error fetching data:', errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [options.collection, getCollection]);

  // Fetch data on mount -- unless this instance is write-only.
  useEffect(() => {
    if (!autoFetch) {
      return;
    }
    getData();
  }, [getData, autoFetch]);

  // Refresh data on auth state changes -- unless this instance is write-only.
  useEffect(() => {
    if (!autoFetch) {
      return;
    }

    const handleAuthStateChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{authenticated: boolean}>;
      
      // Clear data immediately on sign out
      if (!customEvent.detail.authenticated) {
        setData([]);
      }
      
      // Refresh data on both sign in and sign out
      getData();
    };

    window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
    
    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
    };
  }, [getData, autoFetch]);

  /**
   * Add a new document to the collection.
   *
   * `newData` only needs to be `DomainData<T> & { id?: string }` (domain fields,
   * no attribution) rather than a complete `T`: the write goes through
   * `createDocument`, whose implementation (`DocumentService.createDocument`)
   * spreads its own server-fetched attribution metadata AFTER the caller's data
   * (`{ ...data, ...attributionMetadata }`), so any `ContentAttribution` fields
   * a caller supplied here would be overwritten anyway. Requiring them in the
   * type was a false requirement this hook never actually needed enforced.
   *
   * The optimistic `setData` append below is genuinely incomplete: it lacks the
   * server-stamped attribution (`createdBy`, `dateAdded`, etc.) until the next
   * fetch replaces it. That is safe because nothing renders off a write-only
   * instance's `data` array -- each of the five contexts (NPC/Quest/Rumor/
   * Location/Story) gets the list it actually renders from a *separate*
   * `useFirebaseData<T>` instance owned by its own read hook, and never
   * destructures `data` from the instance it calls `addData` on.
   *
   * That was once an accident worth documenting. It is now the contract:
   * those instances pass `autoFetch: false`, so their `data` array holds only
   * optimistic appends, never a fetched collection, and reading it would be a
   * mistake the option name warns against.
   */
  const addData = useCallback(async (newData: DomainData<T> & { id?: string }, documentId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const id = documentId ||
                (options.idField ? (newData as unknown as T)[options.idField] as string : crypto.randomUUID());

      await createDocument(options.collection, newData, id);
      setData(prevData => [...prevData, { ...newData, id } as unknown as T]);
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options.collection, options.idField, createDocument]);

  const updateData = useCallback(async (id: string, updatedData: Partial<T>) => {
    setLoading(true);
    setError(null);
    try {
      await updateDocumentWithAttribution(options.collection, id, updatedData);
      setData(prevData =>
        prevData.map(item =>
          'id' in item && item.id === id ? { ...item, ...updatedData } : item
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options.collection, updateDocumentWithAttribution]);

  const deleteData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteDocument(options.collection, id);
      setData(prevData => prevData.filter(item => 'id' in item && item.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options.collection, deleteDocument]);

  return {
    data,
    loading,
    error,
    getData,
    addData,
    updateData,
    deleteData,
    setDocument: addData // Backward compatibility
  };
}