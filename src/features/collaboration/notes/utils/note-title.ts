// src/features/collaboration/notes/utils/note-title.ts

import { Note } from "../types";

/**
 * Maximum length of a title derived from a note's content.
 *
 * Long enough for a real session heading, short enough that the index row's
 * title never wraps past one line at the width the list container gives it.
 */
export const MAX_DERIVED_TITLE_LENGTH = 80;

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
 * The title a note takes from its own content: its first non-empty line,
 * trimmed and capped at {@link MAX_DERIVED_TITLE_LENGTH} characters.
 *
 * The cap lands on a word boundary and adds **no ellipsis** — this value is
 * stored on the note, and a stored ellipsis would be indistinguishable from
 * one the user typed. Visual truncation is the index's job (`line-clamp-2`).
 *
 * @param content Raw note body
 * @returns The derived title, or "" when the content has no non-empty line
 */
export function deriveTitle(content: string): string {
  const firstLine = (content ?? "")
    .split("\n")
    .map(line => line.trim())
    .find(line => line.length > 0);

  if (!firstLine) return "";
  if (firstLine.length <= MAX_DERIVED_TITLE_LENGTH) return firstLine;

  // One character past the cap, so a space sitting exactly on the boundary
  // still counts as a boundary rather than forcing a cut one word earlier.
  const window = firstLine.slice(0, MAX_DERIVED_TITLE_LENGTH + 1);
  const lastSpace = window.lastIndexOf(" ");

  // A single token longer than the cap has no boundary to cut on.
  if (lastSpace <= 0) return firstLine.slice(0, MAX_DERIVED_TITLE_LENGTH);

  return window.slice(0, lastSpace).trimEnd();
}

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
