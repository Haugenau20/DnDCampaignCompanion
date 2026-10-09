// src/features/storytelling/chapters/utils/chapter-byline.ts
import { authorName, creatorRef, modifierRef, type MemberDirectory } from 'shared/utils/author-name';
import { recordTimes } from 'core/attribution';
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

/**
 * Derive the reader's byline from a chapter's attribution fields.
 *
 * Names are the authors' current ones when `directory` is given (T132), else
 * the ones stored with the chapter; either way the character comes before the
 * username — the order `determineAttributionActor` uses — but creator and
 * editor are kept apart: that helper answers "who touched this last", and a
 * byline needs both.
 */
export function deriveChapterByline(
  attribution: Partial<ContentAttribution>,
  directory?: MemberDirectory
): ChapterByline {
  // The authors' current names where the group's members are known (T132).
  const recordedBy = authorName(creatorRef(attribution), directory) || undefined;
  const editor = authorName(modifierRef(attribution), directory) || undefined;

  // The server's times where the chapter has them, else its old strings (T132).
  const times = recordTimes(attribution);
  const added = times.created ?? undefined;
  const modified = attribution.modifiedAt || attribution.dateModified ? times.modified ?? undefined : undefined;

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
