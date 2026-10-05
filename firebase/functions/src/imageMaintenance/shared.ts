// functions/src/imageMaintenance/shared.ts
import type {File} from "@google-cloud/storage";

/**
 * How old an unreferenced file must be before the sweep deletes it. An upload
 * is written before the document that points at it, so a younger file may be
 * one whose document write is still on its way.
 */
export const MIN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * How long a `pendingUploads` entry holds its file (T084, IMG-003). The client
 * writes the entry before it uploads and deletes it once the document that
 * points at the file is written. A write queued in a tab that went offline
 * lives only as long as that tab -- the app keeps no offline persistence -- so
 * a month is far past any write that can still land. After it the upload is
 * abandoned: the entry is deleted and the file judged like any other.
 */
export const PENDING_LEASE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Deletes `files` with at most `concurrency` requests open at once.
 *
 * @param {File[]} files The files to delete
 * @param {number} concurrency How many deletes may be in flight
 * @return {Promise<Array<object>>} Per file, whether it failed and why
 */
export async function deleteWithin(
  files: File[],
  concurrency: number
): Promise<Array<{failed: false} | {failed: true; reason: unknown}>> {
  const outcomes: Array<{failed: false} | {failed: true; reason: unknown}> =
    new Array(files.length);
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      try {
        await files[i].delete({ignoreNotFound: true});
        outcomes[i] = {failed: false};
      } catch (reason) {
        outcomes[i] = {failed: true, reason};
      }
    }
  };
  const workers = Math.max(1, Math.min(concurrency, files.length));
  await Promise.all(Array.from({length: workers}, worker));
  return outcomes;
}
