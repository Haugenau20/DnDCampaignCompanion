// src/shared/utils/edit-conflict.ts

/**
 * Said when a save is refused because the text changed since the editor opened.
 *
 * `InlineEditor` does not show this message: it recognises the error and offers
 * a choice instead. The message is for anywhere else the error surfaces.
 */
export const EDIT_CONFLICT_MESSAGE =
  'Someone else changed this while you were editing. Nothing was saved.';

/**
 * A save refused because the stored text is no longer what the editor opened
 * with (T083): two people editing the same field from the same version.
 *
 * Thrown inside the write's transaction, so nothing is written. It carries the
 * stored text, so the editor can show both versions and let the user choose.
 */
export class EditConflictError extends Error {
  /** The text the record holds now: the other person's version. */
  readonly theirs: string;

  constructor(theirs: string) {
    super(EDIT_CONFLICT_MESSAGE);
    this.name = 'EditConflictError';
    this.theirs = theirs;
  }
}

/** True for an {@link EditConflictError}. */
export const isEditConflict = (error: unknown): error is EditConflictError =>
  error instanceof EditConflictError;

/**
 * Refuses a text edit when the stored text moved on since the editor opened.
 *
 * Not a conflict when nothing moved, nor when the stored text already says
 * what this save would write: two people who made the same fix agree.
 *
 * @param stored - the text as the server holds it now (`undefined` reads as empty)
 * @param openedWith - the text the editor started from
 * @param value - the text being saved
 * @throws {EditConflictError} when the stored text is neither
 */
export const assertUnchanged = (
  stored: string | undefined,
  openedWith: string,
  value: string
): void => {
  const current = stored ?? '';
  if (current !== openedWith && current !== value) {
    throw new EditConflictError(current);
  }
};

/**
 * A record change that sets one text field, unless someone else changed it
 * since the editor opened.
 *
 * It is a function change, so `writeRecordChange` runs it inside a transaction
 * against the record the server holds: the comparison and the write are one
 * step, and a refused save writes nothing.
 *
 * @param field - the text field being edited
 * @param value - the new text
 * @param openedWith - the text the editor started from
 */
export const editedText =
  <T>(field: keyof T & string, value: string, openedWith: string) =>
  (current: T): Partial<T> => {
    assertUnchanged(current[field] as unknown as string | undefined, openedWith, value);
    return { [field]: value } as Partial<T>;
  };
