// src/features/campaign-entities/shared/writeRecordChange.ts
import { RecordChange } from 'core/types/common';

/** The two writers `useFirebaseData` hands a context. */
interface RecordWriters<T> {
  updateData: (id: string, fields: Partial<T>) => Promise<void>;
  updateDataAfterReading: (
    id: string,
    decide: (read: (otherId: string) => Promise<T | undefined>) => Promise<Partial<T>>
  ) => Promise<void>;
}

/**
 * Writes one {@link RecordChange} to a record (T083).
 *
 * Fields go straight to `updateData`. A function runs inside a transaction
 * against the record as the server holds it, so a list it extends or trims
 * keeps whatever another player changed since the page's copy was taken --
 * and if the record has gone, nothing is written.
 *
 * @param writers - the context's `useFirebaseData` writers
 * @param id - the record
 * @param change - the fields, or how to work them out
 * @param notFound - the error when the record no longer exists, e.g. `'NPC not found'`
 * @param extra - fields every write of this context carries (a rumour's attribution)
 */
export async function writeRecordChange<T>(
  { updateData, updateDataAfterReading }: RecordWriters<T>,
  id: string,
  change: RecordChange<T>,
  notFound: string,
  extra: Partial<T> = {}
): Promise<void> {
  if (typeof change !== 'function') {
    await updateData(id, { ...change, ...extra });
    return;
  }
  await updateDataAfterReading(id, async (read) => {
    const current = await read(id);
    if (!current) {
      throw new Error(notFound);
    }
    return { ...change(current), ...extra };
  });
}
