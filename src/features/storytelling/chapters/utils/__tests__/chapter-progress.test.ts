// src/features/storytelling/chapters/utils/__tests__/chapter-progress.test.ts
import {
  deriveChapterProgress,
  summariseProgress,
  groupChaptersByTens,
  collapseReadRuns,
  filterChapters,
} from '../chapter-progress';
import { Chapter, StoryProgress } from '../../types';

const chapter = (order: number, extra: Partial<Chapter> = {}): Chapter =>
  ({
    id: `chapter-${String(order).padStart(2, '0')}`,
    order,
    title: `Chapter ${order}`,
    summary: `Summary for ${order}`,
    content: 'body',
    ...extra,
  } as Chapter);

const progress = (
  entries: Record<string, { lastPosition?: number; isComplete?: boolean }>,
  currentChapter = ''
): StoryProgress =>
  ({
    currentChapter,
    lastRead: new Date(),
    chapterProgress: Object.fromEntries(
      Object.entries(entries).map(([id, v]) => [
        id,
        {
          chapterId: id,
          lastPosition: v.lastPosition ?? 0,
          isComplete: v.isComplete ?? false,
          lastRead: new Date(),
        },
      ])
    ),
  } as StoryProgress);

describe('deriveChapterProgress', () => {
  it('sorts by order regardless of input order', () => {
    const items = deriveChapterProgress([chapter(3), chapter(1), chapter(2)], undefined);
    expect(items.map(i => i.chapter.order)).toEqual([1, 2, 3]);
  });

  it('marks completed chapters read', () => {
    const items = deriveChapterProgress(
      [chapter(1)],
      progress({ 'chapter-01': { isComplete: true } })
    );
    expect(items[0].state).toBe('read');
  });

  it('marks the current chapter reading even with no recorded position', () => {
    const items = deriveChapterProgress([chapter(1)], progress({}, 'chapter-01'));
    expect(items[0].state).toBe('reading');
    expect(items[0].isCurrent).toBe(true);
  });

  it('marks a part-read chapter reading even when it is not current', () => {
    const items = deriveChapterProgress(
      [chapter(1), chapter(2)],
      progress({ 'chapter-01': { lastPosition: 40 } }, 'chapter-02')
    );
    expect(items[0].state).toBe('reading');
    expect(items[0].isCurrent).toBe(false);
  });

  it('treats a chapter with no entry as unread', () => {
    const items = deriveChapterProgress([chapter(1)], progress({}));
    expect(items[0].state).toBe('unread');
    expect(items[0].percentRead).toBe(0);
  });

  it('completion wins over a partial position', () => {
    const items = deriveChapterProgress(
      [chapter(1)],
      progress({ 'chapter-01': { lastPosition: 50, isComplete: true } })
    );
    expect(items[0].state).toBe('read');
  });

  // lastPosition used to be a 1-based page number. Legacy values are read as
  // percentages rather than migrated, so they must not produce a nonsense bar.
  it('clamps out-of-range legacy positions into 0-100', () => {
    const items = deriveChapterProgress(
      [chapter(1), chapter(2)],
      progress({ 'chapter-01': { lastPosition: 480 }, 'chapter-02': { lastPosition: -5 } })
    );
    expect(items[0].percentRead).toBe(100);
    expect(items[1].percentRead).toBe(0);
  });

  it('survives an undefined storyProgress', () => {
    expect(() => deriveChapterProgress([chapter(1)], undefined)).not.toThrow();
  });
});

describe('summariseProgress', () => {
  it('counts read and remaining, and rounds the percentage', () => {
    const items = deriveChapterProgress(
      [chapter(1), chapter(2), chapter(3)],
      progress({ 'chapter-01': { isComplete: true } })
    );
    const s = summariseProgress(items);
    expect(s.total).toBe(3);
    expect(s.read).toBe(1);
    expect(s.remaining).toBe(2);
    expect(s.percentComplete).toBe(33);
  });

  it('resumes at the current chapter and its position', () => {
    const items = deriveChapterProgress(
      [chapter(1), chapter(2)],
      progress({ 'chapter-02': { lastPosition: 62 } }, 'chapter-02')
    );
    const s = summariseProgress(items);
    expect(s.resumeChapterId).toBe('chapter-02');
    expect(s.resumePosition).toBe(62);
    expect(s.hasStarted).toBe(true);
  });

  // currentChapter is not always set; falling straight to chapter one would
  // discard a chapter the reader is demonstrably part-way through.
  it('falls back to a part-read chapter when no current chapter is set', () => {
    const items = deriveChapterProgress(
      [chapter(1), chapter(2)],
      progress({ 'chapter-02': { lastPosition: 30 } })
    );
    expect(summariseProgress(items).resumeChapterId).toBe('chapter-02');
  });

  it('points at chapter one and reports not-started when nothing is read', () => {
    const items = deriveChapterProgress([chapter(1), chapter(2)], progress({}));
    const s = summariseProgress(items);
    expect(s.resumeChapterId).toBe('chapter-01');
    expect(s.resumePosition).toBe(0);
    expect(s.hasStarted).toBe(false);
  });

  it('handles an empty chapter list without dividing by zero', () => {
    const s = summariseProgress([]);
    expect(s.percentComplete).toBe(0);
    expect(s.resumeChapterId).toBeNull();
  });
});

describe('groupChaptersByTens', () => {
  it('labels groups by real chapter order, not slice index', () => {
    const items = deriveChapterProgress(
      Array.from({ length: 12 }, (_, i) => chapter(i + 1)),
      undefined
    );
    const groups = groupChaptersByTens(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('Chapters 1–10');
    expect(groups[1].label).toBe('Chapters 11–12');
  });

  it('flags which groups have any reading activity', () => {
    const items = deriveChapterProgress(
      Array.from({ length: 20 }, (_, i) => chapter(i + 1)),
      progress({ 'chapter-01': { isComplete: true } })
    );
    const groups = groupChaptersByTens(items);
    expect(groups[0].hasActivity).toBe(true);
    expect(groups[1].hasActivity).toBe(false);
  });
});

describe('collapseReadRuns', () => {
  const build = (states: Array<'read' | 'unread'>, currentOrder?: number) => {
    const chapters = states.map((_, i) => chapter(i + 1));
    const entries: Record<string, { isComplete?: boolean }> = {};
    states.forEach((s, i) => {
      if (s === 'read') entries[chapters[i].id] = { isComplete: true };
    });
    const currentId = currentOrder ? chapters[currentOrder - 1].id : '';
    return deriveChapterProgress(chapters, progress(entries, currentId));
  };

  it('collapses a run of three or more read chapters', () => {
    const rows = collapseReadRuns(build(['read', 'read', 'read', 'unread']));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: 'run', rangeLabel: '1–3' });
    expect(rows[1]).toMatchObject({ kind: 'chapter' });
  });

  it('leaves a run shorter than the minimum expanded', () => {
    const rows = collapseReadRuns(build(['read', 'read', 'unread']));
    expect(rows.every(r => r.kind === 'chapter')).toBe(true);
  });

  // Collapsing the rows either side of where you are would hide the context
  // you are actually reading in.
  it('does not collapse a run adjacent to the current chapter', () => {
    const rows = collapseReadRuns(build(['read', 'read', 'read', 'unread'], 4));
    expect(rows.every(r => r.kind === 'chapter')).toBe(true);
  });

  it('collapses a run that is far from the current chapter', () => {
    const rows = collapseReadRuns(
      build(['read', 'read', 'read', 'unread', 'unread', 'unread'], 6)
    );
    expect(rows.filter(r => r.kind === 'run')).toHaveLength(1);
  });

  it('gives each run a stable, unique key', () => {
    const rows = collapseReadRuns(
      build(['read', 'read', 'read', 'unread', 'read', 'read', 'read'])
    );
    const runs = rows.filter(r => r.kind === 'run') as Array<{ id: string }>;
    expect(runs).toHaveLength(2);
    expect(new Set(runs.map(r => r.id)).size).toBe(2);
  });

  it('preserves every chapter exactly once across the output', () => {
    const items = build(['read', 'read', 'read', 'unread', 'read']);
    const rows = collapseReadRuns(items);
    const flattened = rows.flatMap(r => (r.kind === 'run' ? r.items : [r.item]));
    expect(flattened.map(i => i.chapter.id)).toEqual(items.map(i => i.chapter.id));
  });
});

describe('filterChapters', () => {
  const items = deriveChapterProgress(
    [
      chapter(1, { title: 'An Unexpected Party', summary: 'Bilbo joins the dwarves' }),
      chapter(2, { title: 'Roast Mutton', summary: 'Trolls and elvish weapons' }),
    ],
    undefined
  );

  it('returns everything for an empty or whitespace query', () => {
    expect(filterChapters(items, '')).toHaveLength(2);
    expect(filterChapters(items, '   ')).toHaveLength(2);
  });

  it('matches on title, case-insensitively', () => {
    expect(filterChapters(items, 'roast')).toHaveLength(1);
  });

  it('matches on summary too', () => {
    expect(filterChapters(items, 'dwarves')[0].chapter.order).toBe(1);
  });

  it('returns nothing when there is no match', () => {
    expect(filterChapters(items, 'balrog')).toHaveLength(0);
  });

  it('does not throw on a chapter with no summary', () => {
    const sparse = deriveChapterProgress([chapter(1, { summary: undefined })], undefined);
    expect(() => filterChapters(sparse, 'x')).not.toThrow();
  });
});
