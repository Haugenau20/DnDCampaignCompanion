// src/features/storytelling/chapters/utils/chapter-progress.ts
import { Chapter, StoryProgress } from '../types';

/**
 * Reading state of a single chapter, derived entirely from data the app already
 * stores. `storyProgress.chapterProgress[id]` has carried `isComplete` and
 * `lastPosition` since the feature was written; nothing here adds a field.
 */
export type ChapterReadState = 'read' | 'reading' | 'unread';

/**
 * A chapter paired with everything the two views need to render its state, so
 * neither view has to reach into `storyProgress` itself. Both `ChapterList` and
 * `BookshelfView` consume exactly this shape.
 */
export interface ChapterWithProgress {
  chapter: Chapter;
  state: ChapterReadState;
  /**
   * How far through the chapter the reader got, 0-100.
   *
   * `lastPosition` is a **percentage** as of the reader redesign. It previously
   * held a 1-based page number, and those values are deliberately read as-is
   * rather than migrated: a stored `2` becomes 2%, i.e. the top of the chapter,
   * which is a harmless misread that corrects itself the first time the chapter
   * is opened. Anything outside 0-100 is clamped, so legacy data from a long
   * chapter cannot produce a nonsense bar.
   */
  percentRead: number;
  /** True for `storyProgress.currentChapter` — the row the resume bar points at. */
  isCurrent: boolean;
}

/**
 * Campaign-wide reading summary backing the resume bar.
 */
export interface StorySummary {
  total: number;
  read: number;
  /** total - read. Named for the caption ("31 to go") rather than derived at each call site. */
  remaining: number;
  /** Percent of chapters completed, 0-100, for the campaign-wide bar. */
  percentComplete: number;
  /** The chapter the reader is on, if any. */
  current: ChapterWithProgress | null;
  /**
   * Where Resume should navigate. Falls back to the first chapter when nothing
   * has been read, which is what turns the bar into "Start reading → Chapter 1".
   */
  resumeChapterId: string | null;
  /** Scroll percentage to restore on arrival, 0-100. */
  resumePosition: number;
  /** False when no chapter has any recorded progress. */
  hasStarted: boolean;
}

/** Clamp a stored position into the 0-100 range the UI can render. */
const toPercent = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

/**
 * Pair each chapter with its reading state, in `order`.
 *
 * A chapter counts as `reading` when it has progress but is not complete —
 * either because it is the current chapter or because it was left part-way
 * through earlier. Both are things the reader wants to see; only the current
 * one gets the promoted row treatment, which is why `isCurrent` is separate
 * from `state` rather than folded into it.
 */
export function deriveChapterProgress(
  chapters: Chapter[],
  storyProgress: StoryProgress | undefined
): ChapterWithProgress[] {
  const progressById = storyProgress?.chapterProgress ?? {};
  const currentId = storyProgress?.currentChapter;

  return [...chapters]
    .sort((a, b) => a.order - b.order)
    .map(chapter => {
      const entry = progressById[chapter.id];
      const percentRead = toPercent(entry?.lastPosition);
      const isCurrent = Boolean(currentId) && chapter.id === currentId;

      let state: ChapterReadState = 'unread';
      if (entry?.isComplete) {
        state = 'read';
      } else if (isCurrent || percentRead > 0) {
        state = 'reading';
      }

      return { chapter, state, percentRead, isCurrent };
    });
}

/**
 * Campaign-wide summary for the resume bar.
 *
 * Resume targets the current chapter when there is one, otherwise the first
 * chapter left part-way through, otherwise chapter one. That ordering matters:
 * `currentChapter` is the most recent intent, but it is not always set, and
 * falling straight to chapter one would throw away a half-read chapter.
 */
export function summariseProgress(
  items: ChapterWithProgress[]
): StorySummary {
  const total = items.length;
  const read = items.filter(item => item.state === 'read').length;
  const current = items.find(item => item.isCurrent) ?? null;
  const partial = items.find(item => item.state === 'reading') ?? null;

  const resumeTarget = current ?? partial ?? null;
  const hasStarted = read > 0 || items.some(item => item.state === 'reading');

  return {
    total,
    read,
    remaining: Math.max(0, total - read),
    percentComplete: total === 0 ? 0 : Math.round((read / total) * 100),
    current,
    resumeChapterId: resumeTarget?.chapter.id ?? items[0]?.chapter.id ?? null,
    resumePosition: resumeTarget?.percentRead ?? 0,
    hasStarted,
  };
}

/** A contiguous block of chapters, headed "Chapters 1–10". */
export interface ChapterGroup {
  label: string;
  items: ChapterWithProgress[];
  /** True when any chapter in the group is read or being read. */
  hasActivity: boolean;
}

/**
 * Group chapters into tens for the section headers both views use.
 * Labels use an en dash, matching the existing "Chapters 1–10" heading.
 */
export function groupChaptersByTens(
  items: ChapterWithProgress[],
  size = 10
): ChapterGroup[] {
  const groups: ChapterGroup[] = [];

  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    const first = slice[0]?.chapter.order ?? i + 1;
    const last = slice[slice.length - 1]?.chapter.order ?? first;

    groups.push({
      label: `Chapters ${first}–${last}`,
      items: slice,
      hasActivity: slice.some(item => item.state !== 'unread'),
    });
  }

  return groups;
}

/** One rendered row: either a chapter, or a collapsed run standing in for several. */
export type ChapterRow =
  | { kind: 'chapter'; item: ChapterWithProgress }
  | {
      kind: 'run';
      /** Stable key for React and for the expand-state set. */
      id: string;
      items: ChapterWithProgress[];
      /** "4–7" */
      rangeLabel: string;
    };

/**
 * Collapse runs of consecutive read chapters into a single row.
 *
 * With 39 chapters, a fully-read prefix is what makes the list unscannable, and
 * it is also the part the reader least needs to see. A run must be at least
 * `minRun` long and must not touch the current chapter — collapsing the rows
 * either side of where you are would hide the context you are reading in.
 */
export function collapseReadRuns(
  items: ChapterWithProgress[],
  minRun = 3
): ChapterRow[] {
  const currentIndex = items.findIndex(item => item.isCurrent);
  const rows: ChapterRow[] = [];
  let i = 0;

  while (i < items.length) {
    if (items[i].state !== 'read') {
      rows.push({ kind: 'chapter', item: items[i] });
      i += 1;
      continue;
    }

    // Extend across consecutive read chapters.
    let end = i;
    while (end + 1 < items.length && items[end + 1].state === 'read') end += 1;

    const length = end - i + 1;
    const touchesCurrent =
      currentIndex !== -1 && currentIndex >= i - 1 && currentIndex <= end + 1;

    if (length >= minRun && !touchesCurrent) {
      const runItems = items.slice(i, end + 1);
      rows.push({
        kind: 'run',
        id: `run-${runItems[0].chapter.id}-${runItems[runItems.length - 1].chapter.id}`,
        items: runItems,
        rangeLabel: `${runItems[0].chapter.order}–${runItems[runItems.length - 1].chapter.order}`,
      });
    } else {
      for (let k = i; k <= end; k += 1) {
        rows.push({ kind: 'chapter', item: items[k] });
      }
    }

    i = end + 1;
  }

  return rows;
}

/**
 * Free-text filter over title and summary. Case-insensitive, trimmed; an empty
 * query returns everything rather than nothing.
 */
export function filterChapters(
  items: ChapterWithProgress[],
  query: string
): ChapterWithProgress[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter(({ chapter }) =>
    `${chapter.title ?? ''} ${chapter.summary ?? ''}`.toLowerCase().includes(q)
  );
}
