// src/features/storytelling/stories/utils/__tests__/book-appearance.test.ts
import { pickBookIndex, deriveBookAppearances } from '../book-appearance';
import { deriveChapterProgress } from 'features/storytelling/chapters/utils/chapter-progress';
import { Chapter } from 'features/storytelling/chapters/types';

const chapter = (order: number, extra: Partial<Chapter> = {}): Chapter =>
  ({
    id: `chapter-${String(order).padStart(2, '0')}`,
    order,
    title: `Chapter ${order}`,
    summary: `Summary ${order}`,
    content: 'x'.repeat(500),
    ...extra,
  } as Chapter);

const appearancesFor = (chapters: Chapter[], bookCount = 11) =>
  deriveBookAppearances(deriveChapterProgress(chapters, undefined), bookCount);

describe('pickBookIndex', () => {
  it('stays within the available range', () => {
    for (let order = 1; order <= 40; order += 1) {
      const index = pickBookIndex(order, order * 3, 11);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(11);
    }
  });

  it('is stable for the same inputs', () => {
    expect(pickBookIndex(7, 12, 11)).toBe(pickBookIndex(7, 12, 11));
  });

  it('gives neighbouring chapters different books, so a shelf is not uniform', () => {
    const a = pickBookIndex(4, 10, 11);
    const b = pickBookIndex(5, 10, 11);
    expect(a).not.toBe(b);
  });

  it('does not divide by zero when there are no book components', () => {
    expect(pickBookIndex(3, 9, 0)).toBe(0);
  });
});

describe('deriveBookAppearances', () => {
  it('returns an entry for every chapter, keyed by id', () => {
    const appearances = appearancesFor([chapter(1), chapter(2), chapter(3)]);
    expect(appearances.size).toBe(3);
    expect(appearances.get('chapter-02')).toBeDefined();
  });

  // Thickness carries chapter length; a longer chapter is a fatter book.
  it('makes a longer chapter thicker than a shorter one', () => {
    const appearances = appearancesFor([
      chapter(1, { content: 'x'.repeat(200) }),
      chapter(2, { content: 'x'.repeat(4000) }),
    ]);
    const thin = appearances.get('chapter-01')!.width;
    const thick = appearances.get('chapter-02')!.width;
    expect(thick).toBeGreaterThan(thin);
  });

  // The previous shelf used absolute cutoffs (>3500 chars, >3000, ...). Every
  // chapter in the sample data is 444-799 characters, so they all landed in one
  // bucket and the variation silently disappeared. Scaling to the observed
  // range keeps it visible whatever the campaign's typical chapter size.
  it('spreads thickness across a narrow range of lengths', () => {
    const appearances = appearancesFor([
      chapter(1, { content: 'x'.repeat(444) }),
      chapter(2, { content: 'x'.repeat(620) }),
      chapter(3, { content: 'x'.repeat(799) }),
    ]);
    const widths = [1, 2, 3].map(
      (n) => appearances.get(`chapter-0${n}`)!.width
    );
    expect(new Set(widths).size).toBe(3);
    expect(widths[0]).toBeLessThan(widths[2]);
  });

  it('gives every chapter the same thickness when they are all the same length', () => {
    const appearances = appearancesFor([chapter(1), chapter(2)]);
    expect(appearances.get('chapter-01')!.width).toBe(
      appearances.get('chapter-02')!.width
    );
  });

  it('keeps thickness within the spine range', () => {
    const appearances = appearancesFor([
      chapter(1, { content: '' }),
      chapter(2, { content: 'x'.repeat(100000) }),
    ]);
    appearances.forEach((a) => {
      expect(a.width).toBeGreaterThanOrEqual(34);
      expect(a.width).toBeLessThanOrEqual(58);
    });
  });

  it('does not throw on a chapter with no content', () => {
    expect(() => appearancesFor([chapter(1, { content: undefined })])).not.toThrow();
  });

  // Height is deliberately NOT tied to length -- thickness already carries
  // that. Height is arbitrary-but-fixed so the shelf has the uneven skyline a
  // real one has.
  it('varies height across chapters of identical length', () => {
    const appearances = appearancesFor(
      Array.from({ length: 10 }, (_, i) => chapter(i + 1))
    );
    const heights = [...appearances.values()].map((a) => a.height);
    expect(new Set(heights).size).toBeGreaterThan(1);
  });

  it('keeps height within the shelf range', () => {
    const appearances = appearancesFor(
      Array.from({ length: 30 }, (_, i) => chapter(i + 1))
    );
    appearances.forEach((a) => {
      expect(a.height).toBeGreaterThanOrEqual(116);
      expect(a.height).toBeLessThanOrEqual(176);
    });
  });

  // A book that looked different on each visit would be worse than no variety.
  it('gives a chapter the same appearance every time', () => {
    const first = appearancesFor([chapter(1), chapter(2), chapter(3)]);
    const second = appearancesFor([chapter(1), chapter(2), chapter(3)]);
    expect(second.get('chapter-02')).toEqual(first.get('chapter-02'));
  });

  it('handles an empty shelf without producing NaN', () => {
    const appearances = deriveBookAppearances([], 11);
    expect(appearances.size).toBe(0);
  });
});
