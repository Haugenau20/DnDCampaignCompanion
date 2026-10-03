// src/features/storytelling/chapters/utils/chapter-byline.ts
import type { ContentAttribution } from 'core/types/common';

/** What the reader's eyebrow and byline say about who wrote a chapter, and when. */
export interface ChapterByline {
  /** Who recorded the chapter: the character they were playing, else their username. */
  recordedBy?: string;
  /** When it was recorded, e.g. "12 March 2025". */
  recordedOn?: string;
  /** Who last edited it. Absent unless the chapter has really been edited since. */
  editedBy?: string;
  /** When it was last edited, e.g. "2 Oct 2026". */
  editedOn?: string;
}

/**
 * Creation stamps `modified*` with the creator and the same instant, so an
 * edit only counts when it came from someone else or more than this long
 * after creation. The same allowance `shouldShowModification` makes.
 */
const SAME_EVENT_MS = 1000;

/** Parse a stored ISO date, or undefined when it is missing or unreadable. */
function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Derive the reader's byline from a chapter's attribution fields.
 *
 * Names prefer the character the player was playing at the time, then their
 * username — the order `determineAttributionActor` uses — but creator and
 * editor are kept apart: that helper answers "who touched this last", and a
 * byline needs both.
 */
export function deriveChapterByline(
  attribution: Partial<ContentAttribution>
): ChapterByline {
  const recordedBy =
    attribution.createdByCharacterName || attribution.createdByUsername || undefined;
  const editor =
    attribution.modifiedByCharacterName || attribution.modifiedByUsername || undefined;

  const added = parseDate(attribution.dateAdded);
  const modified = parseDate(attribution.dateModified);

  const wasEdited =
    !!editor &&
    !!modified &&
    (editor !== recordedBy ||
      !added ||
      modified.getTime() > added.getTime() + SAME_EVENT_MS);

  return {
    recordedBy,
    recordedOn: added?.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    editedBy: wasEdited ? editor : undefined,
    editedOn: wasEdited
      ? modified?.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : undefined,
  };
}
