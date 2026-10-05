// src/test-utils/update-after-reading.ts

/**
 * Resolves a `RecordChange` the way a context's transaction does (T083), for
 * page suites that mock the context: a function is given the record as
 * stored, a patch is returned as it is.
 *
 * @param change - what the page passed to `updateNPC` / `updateQuest` / …
 * @param stored - the record as the suite's "server" holds it
 * @throws when a function-form change finds no record, as the context does
 */
export function resolveRecordChange<T>(
  change: Partial<T> | ((current: T) => Partial<T>),
  stored: T | undefined
): Partial<T> {
  if (typeof change !== 'function') return change;
  if (!stored) throw new Error('Record not found');
  return change(stored);
}

/**
 * An `updateDataAfterReading` for suites that mock `useFirebaseData` (T083).
 *
 * `decide` reads the records the suite already serves through its data-hook
 * mock -- the suite's stand-in for what the server holds -- and the fields it
 * returns go to the suite's own `updateData` mock. A payload assertion on
 * `updateData` then reads the same whether the context wrote a plain patch or
 * worked one out in a transaction.
 *
 * @param updateData - the suite's `updateData` mock
 * @param recordOf - the record the suite serves for an id
 */
export function updateAfterReadingThrough<T>(
  updateData: (id: string, fields: Partial<T>) => unknown,
  recordOf: (id: string) => T | undefined
) {
  return jest.fn(
    async (
      id: string,
      decide: (read: (otherId: string) => Promise<T | undefined>) => Promise<Partial<T>>
    ) => {
      const fields = await decide(async (otherId) => recordOf(otherId));
      await updateData(id, fields);
    }
  );
}

/** What a `createDocumentWithUpdates` decision commits. */
export interface CreatedWithUpdates<S> {
  create: Record<string, any>;
  updates: Array<{ id: string; data: Partial<S> }>;
}

/**
 * A `createDocumentWithUpdates` for suites that mock `useFirestore` (T088).
 *
 * `decide` reads the records the suite already serves -- its stand-in for
 * what the server holds -- and what it decides goes to the suite's `commit`
 * mock, which may throw to refuse (a taken id, a failed write). Nothing is
 * committed when `decide` refuses.
 *
 * @param recordOf - the record the suite serves for an id
 * @param commit - receives the new document's collection and id, the source
 *   collection, and the decision
 */
export function createWithUpdatesThrough<S>(
  recordOf: (id: string) => S | undefined,
  commit: (collection: string, id: string, sourceCollection: string, decided: CreatedWithUpdates<S>) => unknown
) {
  return jest.fn(
    async (
      collection: string,
      id: string,
      sourceCollection: string,
      decide: (read: (otherId: string) => Promise<S | undefined>) => Promise<CreatedWithUpdates<S>>
    ) => {
      const decided = await decide(async (otherId) => recordOf(otherId));
      await commit(collection, id, sourceCollection, decided);
    }
  );
}
