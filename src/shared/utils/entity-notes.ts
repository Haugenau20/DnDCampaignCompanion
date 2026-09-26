// src/shared/utils/entity-notes.ts

/**
 * The shape an NPC's and a location's notes share.
 *
 * Both are stored as a plain array on their record, with no id. A note is
 * therefore found by what it says -- date, text and author together -- rather
 * than by its position, because the pages show notes oldest first and the
 * stored array is in the order they were written.
 */
export interface EntityNote {
  date: string;
  text: string;
  author?: string;
}

/**
 * Said when the note the user is acting on is no longer in the record.
 *
 * Seen only if the page's copy is behind the store -- another player edited or
 * deleted the same note first. Refusing is safer than guessing which note was
 * meant, and the refetch after any write shows the user what is there now.
 */
export const NOTE_CHANGED_MESSAGE =
  'This note was changed by someone else. Reload the page to see it.';

const sameNote = (a: EntityNote, b: EntityNote): boolean =>
  a.date === b.date && a.text === b.text && (a.author ?? '') === (b.author ?? '');

const indexOfNote = <T extends EntityNote>(notes: readonly T[], target: T): number => {
  const index = notes.findIndex((note) => sameNote(note, target));
  if (index === -1) {
    throw new Error(NOTE_CHANGED_MESSAGE);
  }
  return index;
};

/**
 * The notes with `target`'s text replaced, everything else untouched.
 *
 * The date and author stay: a note records when something happened at the
 * table and who wrote it down, and fixing a typo changes neither.
 *
 * @throws when `target` is not in `notes` (see `NOTE_CHANGED_MESSAGE`)
 */
export const replaceNoteText = <T extends EntityNote>(
  notes: readonly T[],
  target: T,
  text: string
): T[] => {
  const index = indexOfNote(notes, target);
  return notes.map((note, i) => (i === index ? { ...note, text } : note));
};

/**
 * The notes without `target`. Removes one note even if two are identical.
 *
 * @throws when `target` is not in `notes` (see `NOTE_CHANGED_MESSAGE`)
 */
export const removeNote = <T extends EntityNote>(notes: readonly T[], target: T): T[] => {
  const index = indexOfNote(notes, target);
  return notes.filter((_, i) => i !== index);
};
