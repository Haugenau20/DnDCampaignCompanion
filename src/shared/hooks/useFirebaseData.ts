// src/shared/hooks/useFirebaseData.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useFirestore } from 'features/user-management';
import { AUTH_STATE_CHANGED_EVENT } from 'features/user-management';
import { CreateAlongside, DomainData } from 'core/types/common';
import { DocumentAlreadyExistsError } from 'core/services/firebase/data/DocumentAlreadyExistsError';

interface UseFirebaseDataOptions<T> {
  /**
   * The collection the write methods (and fetch mode) act on. Pass the full
   * path a campaign's providers get from `useCampaignCollectionPath`, not the
   * bare name: each write method is bound to the path of the render it was
   * created in, so an operation that started in one campaign finishes there
   * even if the player switches meanwhile (T082). `null` means there is no
   * campaign to write to: writes refuse, and a fetch finds nothing.
   */
  collection: string | null;
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
   * The `use*Data` READ hooks do not use this option: they listen through
   * `subscribeTo` below, which ignores it.
   *
   * **Every production call site that fetches passes `false`**, so the `true` default
   * survives only for a future caller that wants the simple behaviour. Do not
   * read that as "the default is dead and can be inverted": inverting it would
   * make every new call site silently non-fetching, which is the failure that
   * is hard to notice. The safe default is the one that fetches.
   *
   * A consequence worth knowing: `false` also means the
   * `AUTH_STATE_CHANGED_EVENT` listener is never registered, so `data` is NOT
   * emptied on sign-out. Any consumer reading `data` must therefore check
   * "signed out / no campaign" BEFORE it checks whether `data` is populated,
   * or it will render the previous user's records. The five read hooks do
   * exactly that, and each of their suites pins it.
   */
  autoFetch?: boolean;
  /**
   * Listen to the collection instead of fetching it (T032).
   *
   * A full collection path (`groups/g/campaigns/c/npcs`), or `null` while
   * there is nothing to listen to yet (signed out, no group or campaign).
   * Leave it out entirely for the fetch behaviour described above.
   *
   * With it, `data` follows the listener: the whole collection on the first
   * snapshot, then every change -- another player's, or this client's own
   * write, which the SDK delivers before the write's promise resolves. So the
   * refetch a provider used to make after each write is no longer a read:
   * `getData()` answers from the latest snapshot, and only waits when the
   * first snapshot for the current path has not arrived yet.
   *
   * `loading` is true until that first snapshot. Changing the path closes the
   * old listener and opens the new one, and `data` holds nothing until the new
   * path's first snapshot -- never the previous path's records; `null` empties
   * it. A failed listener stays closed until `retry()` reopens it.
   *
   * The write methods do not touch `data` in this mode: the listener already
   * carries the write, and appending it as well would show it twice.
   * `autoFetch` is ignored.
   */
  subscribeTo?: string | null;
}

/** One shared empty list, so an unscoped instance's `data` keeps its identity across renders. */
const EMPTY: never[] = [];

/** What a write says when there is no campaign to write to. */
const NO_CAMPAIGN = 'No campaign selected';

export function useFirebaseData<T extends Record<string, any>>(
  options: UseFirebaseDataOptions<T>
) {
  const subscribing = options.subscribeTo !== undefined;
  const subscribeTo = options.subscribeTo ?? null;
  const autoFetch = !subscribing && (options.autoFetch ?? true);
  const [data, setData] = useState<T[]>([]);
  // Subscription mode: the path `data` was delivered for. `data` is only
  // returned while it matches the current path, so a campaign switch can
  // never show the previous campaign's records under the new one's name.
  const [dataPath, setDataPath] = useState<string | null>(null);
  // Bumped by `retry()` to reopen a listener Firestore closed after an error.
  const [attempt, setAttempt] = useState(0);
  // A write-only instance has nothing in flight on mount, so it must not claim
  // to be loading -- that flag would otherwise stay `true` for this instance's
  // entire life and lie to any future consumer.
  const [loading, setLoading] = useState(subscribing ? subscribeTo !== null : autoFetch);
  const [error, setError] = useState<string | null>(null);
  const {
    getCollection,
    subscribeToCollection,
    createDocument,
    updateDocumentWithAttribution,
    updateDocumentAfterReading,
    updateDocumentsAfterReading,
    queryFromServer,
    createDocumentWithUpdates,
    deleteDocument
  } = useFirestore();

  // Subscription mode: the latest snapshot (undefined until the current
  // path's first one), and the `getData()` calls waiting for it.
  const latestSnapshot = useRef<T[] | undefined>(subscribing && subscribeTo === null ? [] : undefined);
  const snapshotWaiters = useRef<Array<(documents: T[]) => void>>([]);

  /** Records a snapshot and releases every `getData()` waiting for one. */
  const publishSnapshot = useCallback((documents: T[]) => {
    latestSnapshot.current = documents;
    const waiters = snapshotWaiters.current;
    snapshotWaiters.current = [];
    waiters.forEach(resolve => resolve(documents));
  }, []);

  useEffect(() => {
    if (!subscribing) {
      return;
    }

    if (subscribeTo === null) {
      setData([]);
      setLoading(false);
      publishSnapshot([]);
      return;
    }

    latestSnapshot.current = undefined;
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToCollection<T>(
      subscribeTo,
      (documents) => {
        setData(documents);
        setDataPath(subscribeTo);
        setLoading(false);
        publishSnapshot(documents);
      },
      (err) => {
        // Firestore closes a listener after an error, so this path is done:
        // answer anyone waiting with nothing rather than leaving them hanging.
        console.error(`Error listening to ${subscribeTo}:`, err.message);
        setError(err.message || 'Failed to fetch data');
        setData([]);
        setDataPath(subscribeTo);
        setLoading(false);
        publishSnapshot([]);
      }
    );

    return unsubscribe;
  }, [subscribing, subscribeTo, subscribeToCollection, publishSnapshot, attempt]);

  const getData = useCallback(async () => {
    if (subscribing) {
      const latest = latestSnapshot.current;
      if (latest !== undefined) {
        return latest;
      }
      return new Promise<T[]>(resolve => {
        snapshotWaiters.current.push(resolve);
      });
    }

    if (options.collection === null) {
      setData([]);
      return [];
    }

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
  }, [subscribing, options.collection, getCollection]);

  /**
   * Try again after a failure.
   *
   * In listener mode this reopens the listener when Firestore has closed it
   * after an error, and resolves with its first snapshot; a listener that is
   * healthy is left alone and answers from its latest snapshot -- no read
   * either way unless the listener had failed. In fetch mode it refetches.
   */
  const retry = useCallback(async () => {
    if (subscribing && subscribeTo !== null && error !== null) {
      latestSnapshot.current = undefined;
      setAttempt(previous => previous + 1);
    }
    return getData();
  }, [subscribing, subscribeTo, error, getData]);

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
  const addData = useCallback(async (
    newData: DomainData<T> & { id?: string },
    documentId?: string,
    alongside?: CreateAlongside
  ) => {
    setLoading(true);
    setError(null);
    try {
      if (options.collection === null) throw new Error(NO_CAMPAIGN);
      const id = documentId ||
                (options.idField ? (newData as unknown as T)[options.idField] as string : crypto.randomUUID());

      if (alongside) {
        // One transaction: the record and the change commit together (T088).
        await createDocumentWithUpdates(options.collection, id, alongside.collection, async (read) => ({
          create: newData,
          updates: [{ id: alongside.id, data: alongside.change(await read(alongside.id), id) }],
        }));
      } else {
        await createDocument(options.collection, newData, id);
      }
      if (!subscribing) {
        setData(prevData => [...prevData, { ...newData, id } as unknown as T]);
      }
      return id;
    } catch (err) {
      // A taken id is the one failure whose own message is addressed to
      // developers (it names service methods). `error` is rendered to players
      // by the contexts, so publish the player-safe wording; the throw below is
      // unchanged so callers can still recognise it and pick another id (#1402).
      const errorMessage = err instanceof DocumentAlreadyExistsError
        ? err.userMessage
        : err instanceof Error ? err.message : 'Failed to add data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [subscribing, options.collection, options.idField, createDocument, createDocumentWithUpdates]);

  const updateData = useCallback(async (id: string, updatedData: Partial<T>) => {
    setLoading(true);
    setError(null);
    try {
      if (options.collection === null) throw new Error(NO_CAMPAIGN);
      await updateDocumentWithAttribution(options.collection, id, updatedData);
      if (!subscribing) {
        setData(prevData =>
          prevData.map(item =>
            'id' in item && item.id === id ? { ...item, ...updatedData } : item
          )
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [subscribing, options.collection, updateDocumentWithAttribution]);

  /**
   * `updateData` for a write whose validity depends on other records: `decide`
   * reads them by id inside a transaction and returns the fields to write, or
   * throws to refuse. See `DocumentService.updateDocumentAfterReading`.
   */
  const updateDataAfterReading = useCallback(async (
    id: string,
    decide: (read: (otherId: string) => Promise<T | undefined>) => Promise<Partial<T>>
  ) => {
    setLoading(true);
    setError(null);
    try {
      if (options.collection === null) throw new Error(NO_CAMPAIGN);
      await updateDocumentAfterReading<T>(options.collection, id, decide);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options.collection, updateDocumentAfterReading]);

  /**
   * `updateDataAfterReading` for several records at once: `decide` reads by
   * id inside one transaction and returns the updates, possibly none (T088).
   * See `DocumentService.updateDocumentsAfterReading`.
   */
  const updateManyAfterReading = useCallback(async (
    decide: (read: (id: string) => Promise<T | undefined>) => Promise<Array<{ id: string; data: Partial<T> }>>
  ) => {
    setLoading(true);
    setError(null);
    try {
      if (options.collection === null) throw new Error(NO_CAMPAIGN);
      await updateDocumentsAfterReading<T>(options.collection, decide);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options.collection, updateDocumentsAfterReading]);

  /**
   * The records whose `field` equals `value`, as the server holds them now,
   * never the local cache (T088). Offline, it fails.
   */
  const queryData = useCallback(async (field: string, value: unknown): Promise<T[]> => {
    if (options.collection === null) throw new Error(NO_CAMPAIGN);
    return queryFromServer<T>(options.collection, field, value);
  }, [options.collection, queryFromServer]);

  const deleteData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      if (options.collection === null) throw new Error(NO_CAMPAIGN);
      await deleteDocument(options.collection, id);
      if (!subscribing) {
        setData(prevData => prevData.filter(item => 'id' in item && item.id !== id));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [subscribing, options.collection, deleteDocument]);

  return {
    data: subscribing && dataPath !== subscribeTo ? EMPTY : data,
    loading,
    error,
    getData,
    retry,
    addData,
    updateData,
    updateDataAfterReading,
    updateManyAfterReading,
    queryData,
    deleteData,
    setDocument: addData // Backward compatibility
  };
}