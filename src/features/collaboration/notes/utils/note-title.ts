// src/features/collaboration/notes/utils/note-title.ts

import { Note } from "../types";
import { deriveTitle } from "shared/utils/derived-title";

/**
 * Re-exported, not redefined.
 *
 * The algorithm moved to `shared/utils/derived-title` when the rumour row
 * needed the same one. These two names stay exported from here because the
 * collaboration barrel publishes them and note-facing callers read better
 * against a note-shaped module; the single implementation lives in `shared/`.
 */
export { deriveTitle, MAX_DERIVED_TITLE_LENGTH } from "shared/utils/derived-title";

/**
 * The literal title every note got on creation before this redesign
 * introduced content-derived titles. It is PERSISTED on pre-existing
 * Firestore documents as `title: "New Note"` -- there is no data migration
 * for it (out of scope; the app must read the data it already has).
 *
 * This is a presentational special-case, not a general rule: a note whose
 * title merely *contains* this string (e.g. "New Notes on the cave") is
 * still a real, explicit title. Only an exact match (after trimming) is
 * treated as "no title was ever set".
 */
export const LEGACY_DEFAULT_TITLE = "New Note";

/**
 * The title to display for a note.
 *
 * An explicit title always wins. Otherwise the title is derived from the
 * content. `null` means the note has neither — the caller renders
 * "Untitled note" in muted colour, and that is the *only* note that should
 * ever read "Untitled".
 */
export function displayTitle(note: Pick<Note, "title" | "content">): string | null {
  const explicit = (note.title ?? "").trim();
  // The exact legacy placeholder is not a real title -- see
  // LEGACY_DEFAULT_TITLE. Anything else the user (or extraction) actually
  // set, including a string that merely contains it, wins as explicit.
  if (explicit && explicit !== LEGACY_DEFAULT_TITLE) return explicit;

  const derived = deriveTitle(note.content ?? "");
  return derived || null;
}
