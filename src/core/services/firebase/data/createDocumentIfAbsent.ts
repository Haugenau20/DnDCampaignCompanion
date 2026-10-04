// src/core/services/firebase/data/createDocumentIfAbsent.ts
import { DocumentData, DocumentReference, Firestore, runTransaction } from 'firebase/firestore';

/**
 * Writes a new document at `ref` only if nothing is there yet, as one atomic
 * step.
 *
 * A `getDoc` followed by `setDoc` is not a uniqueness check: two clients can
 * both read "absent" before either writes, and the second `setDoc` then
 * replaces the first record, author and all (T081, DATA-001). Inside a
 * transaction Firestore notices the document appeared between the read and
 * the commit and re-runs the function, which then sees it and refuses.
 *
 * `buildData` runs only once the id is known to be free, so a refusal costs
 * nothing else; it may run more than once if the transaction is retried.
 *
 * Needs the server: offline, the transaction fails rather than queueing.
 *
 * @param db Firestore instance
 * @param ref Where the new document goes
 * @param buildData Produces the document's contents
 * @returns `true` if the document was created, `false` if one already existed
 */
export async function createDocumentIfAbsent(
  db: Firestore,
  ref: DocumentReference,
  buildData: () => DocumentData | Promise<DocumentData>
): Promise<boolean> {
  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists()) {
      return false;
    }
    transaction.set(ref, await buildData());
    return true;
  });
}
