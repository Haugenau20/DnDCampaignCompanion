// functions/src/shared/checkedBulkWriter.ts
import {
  DocumentData,
  DocumentReference,
  getFirestore,
  UpdateData,
} from "firebase-admin/firestore";

/** A BulkWriter whose `close()` fails when any of its writes did. */
export interface CheckedBulkWriter {
  update(
    ref: DocumentReference,
    data: UpdateData<DocumentData>
  ): void;
  delete(ref: DocumentReference): void;
  /**
   * Flushes every write, then throws if any of them failed.
   *
   * @param {string} what What the writes were, for the error message
   */
  close(what: string): Promise<void>;
}

/**
 * A BulkWriter that reports its failures.
 *
 * BulkWriter rather than WriteBatch because a batch caps at 500 operations,
 * and a group's or a campaign's records can exceed that; BulkWriter chunks
 * and retries on its own. But its `close()` never rejects: a write that
 * exhausted its retries rejects only its own promise (DATA-004). So every
 * write's outcome is kept, caught on the spot so none goes unhandled, and
 * checked when the writer closes.
 *
 * @return {CheckedBulkWriter} The writer
 */
export function checkedBulkWriter(): CheckedBulkWriter {
  const writer = getFirestore().bulkWriter();
  const outcomes: Promise<{error: unknown} | null>[] = [];
  const observe = (write: Promise<unknown>) => {
    outcomes.push(write.then(() => null, (error) => ({error})));
  };

  return {
    update: (ref, data) => observe(writer.update(ref, data)),
    delete: (ref) => observe(writer.delete(ref)),
    close: async (what) => {
      await writer.close();
      const failures = (await Promise.all(outcomes))
        .filter((outcome): outcome is {error: unknown} => outcome !== null);
      if (failures.length > 0) {
        const first = failures[0].error;
        throw new Error(
          `${failures.length} ${what} could not be written: ${
            first instanceof Error ? first.message : String(first)
          }`
        );
      }
    },
  };
}
