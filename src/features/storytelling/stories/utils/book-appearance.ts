// src/features/storytelling/stories/utils/book-appearance.ts
import { ChapterWithProgress } from 'features/storytelling/chapters/utils/chapter-progress';

/**
 * How a chapter is drawn on the shelf.
 *
 * The shelf briefly rendered every chapter as an identical flat rectangle, on
 * the reasoning that the old per-chapter colour and height "encoded nothing".
 * That conflates *carries no data* with *does no work*: on a shelf, variety is
 * what makes thirty-odd objects read as books rather than as a bar chart, and
 * a shelf that reads as a bar chart has no reason to exist beside the list
 * view. Identity and read state were also treated as competing for one channel,
 * which they never were — the art carries identity, and a treatment applied
 * over it (fading, a ring) carries state.
 *
 * So: which book a chapter is, and how tall it stands, are decoration; how
 * thick it is carries the chapter's length. All three are stable for a given
 * chapter, because a book that changed appearance between visits would be
 * worse than no variety at all.
 */

/** Spine thickness range, in px. Narrow enough to still read as a spine. */
const MIN_WIDTH = 34;
const MAX_WIDTH = 58;

/** Standing height range, in px. */
const MIN_HEIGHT = 116;
const MAX_HEIGHT = 176;

export interface BookAppearance {
  /** Index into the caller's array of book components. */
  bookIndex: number;
  /** Spine thickness in px — proportional to the chapter's length. */
  width: number;
  /** Standing height in px — arbitrary but stable, for character. */
  height: number;
}

/**
 * A small stable hash of a string, for picking an arbitrary-but-fixed value
 * per chapter. Not cryptographic and not trying to be: it only needs to spread
 * ids across a range and return the same answer every time.
 */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Pick which book illustration a chapter gets.
 *
 * Keyed on order plus title length, matching what the shelf did before the
 * flat-rectangle rework, so chapters keep the books readers already associate
 * with them.
 */
export function pickBookIndex(order: number, titleLength: number, bookCount: number): number {
  if (bookCount <= 0) return 0;
  return (Math.abs(Math.trunc(order)) + Math.abs(Math.trunc(titleLength))) % bookCount;
}

/**
 * Map a chapter's content length onto a spine thickness, **relative to the
 * other chapters on the shelf** rather than against absolute thresholds.
 *
 * The previous shelf used fixed cutoffs (>3500 chars, >3000, …) which assumed
 * chapters thousands of characters long. Against the sample data, where every
 * chapter is 444–799 characters, every book landed in the same bucket and the
 * variation silently vanished. Scaling to the observed range means the shelf
 * shows relative length whatever the campaign's typical chapter size, which is
 * the only thing a reader can actually judge by eye anyway.
 */
function scaleWidth(length: number, shortest: number, longest: number): number {
  if (longest <= shortest) return Math.round((MIN_WIDTH + MAX_WIDTH) / 2);
  const ratio = (length - shortest) / (longest - shortest);
  return Math.round(MIN_WIDTH + ratio * (MAX_WIDTH - MIN_WIDTH));
}

/**
 * Derive every chapter's appearance in one pass, keyed by chapter id.
 *
 * Done for the whole shelf at once because thickness is relative: a single
 * chapter cannot know how thick it should be without seeing the others.
 */
export function deriveBookAppearances(
  items: ChapterWithProgress[],
  bookCount: number
): Map<string, BookAppearance> {
  const lengths = items.map((item) => item.chapter.content?.length ?? 0);
  const shortest = lengths.length > 0 ? Math.min(...lengths) : 0;
  const longest = lengths.length > 0 ? Math.max(...lengths) : 0;

  const appearances = new Map<string, BookAppearance>();

  items.forEach((item, index) => {
    const { chapter } = item;
    const heightSpread = MAX_HEIGHT - MIN_HEIGHT;

    appearances.set(chapter.id, {
      bookIndex: pickBookIndex(chapter.order, chapter.title?.length ?? 0, bookCount),
      width: scaleWidth(lengths[index], shortest, longest),
      height: MIN_HEIGHT + (hashString(chapter.id) % (heightSpread + 1)),
    });
  });

  return appearances;
}
