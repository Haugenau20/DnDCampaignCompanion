// src/utils/__dev__/generators/contentGenerators/recordNotes.ts

import { doc, setDoc } from 'firebase/firestore';

/** Who the sample data says wrote a note that does not say so itself. */
export interface NoteAuthor {
  uid: string;
  username: string;
}

/**
 * Write a record, and its notes as documents of their own (T133):
 * `{collection}/{id}/notes/{noteId}`, as the app writes them. The record is
 * stored with an empty `notes` array, as production's are since
 * `scripts/migrate-records.js`; the sample data lists each record's notes
 * beside it only because that is where they are easiest to read.
 *
 * Each note keeps its fields and gains the attribution the app's writes
 * stamp, unless it carries its own. Its `dateAdded` is a millisecond past the
 * note before it, so the notes read back in the order they are listed.
 *
 * @param db Firestore
 * @param collectionPath The record's collection, as path segments
 * @param record The record, with the notes to write as documents
 * @param author Who wrote a note that names no author of its own
 * @param formattedDate When the sample data was written
 */
export async function writeRecordWithNotes<T extends { id: string; notes?: readonly object[] }>(
  db: any,
  collectionPath: readonly string[],
  record: T,
  author: NoteAuthor,
  formattedDate: string
): Promise<void> {
  const [first, ...rest] = collectionPath;
  await setDoc(doc(db, first, ...rest, record.id), { ...record, notes: [] });

  const base = new Date(formattedDate).getTime();
  for (const [index, note] of (record.notes ?? []).entries()) {
    const fields = note as Record<string, unknown>;
    const noteId = typeof fields.id === 'string' ? fields.id : `${record.id}-note-${index + 1}`;
    const written = new Date(base + index).toISOString();
    await setDoc(doc(db, first, ...rest, record.id, 'notes', noteId), {
      createdBy: author.uid,
      createdByUsername: author.username,
      modifiedBy: author.uid,
      modifiedByUsername: author.username,
      ...fields,
      dateAdded: written,
      dateModified: written,
    });
  }
}
