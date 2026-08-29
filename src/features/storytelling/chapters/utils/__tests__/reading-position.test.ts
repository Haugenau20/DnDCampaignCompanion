// src/features/storytelling/chapters/utils/__tests__/reading-position.test.ts
import {
  scrollPercent,
  positionToScrollTop,
  isAtCompletion,
  clampPercent,
  COMPLETION_THRESHOLD,
} from '../reading-position';

describe('scrollPercent', () => {
  it('reports 0 at the top of a scrollable chapter', () => {
    expect(scrollPercent(0, 2000, 500)).toBe(0);
  });

  it('reports 100 at the bottom', () => {
    expect(scrollPercent(1500, 2000, 500)).toBe(100);
  });

  it('reports the fraction of the scrollable range, not of the content', () => {
    // Range is 1500, not 2000: 750px down is halfway, not 37.5%.
    expect(scrollPercent(750, 2000, 500)).toBe(50);
  });

  it('rounds to a whole percent', () => {
    expect(scrollPercent(1, 2000, 500)).toBe(0);
    expect(scrollPercent(500, 2000, 500)).toBe(33);
  });

  // A chapter shorter than the viewport can never be scrolled, so treating it
  // as 0% would make it impossible to finish.
  it('treats unscrollable content as fully read', () => {
    expect(scrollPercent(0, 400, 500)).toBe(100);
    expect(scrollPercent(0, 500, 500)).toBe(100);
  });

  it('clamps an over-scrolled offset instead of exceeding 100', () => {
    // Elastic/rubber-band scrolling can report a scrollTop past the maximum.
    expect(scrollPercent(1800, 2000, 500)).toBe(100);
  });

  it('clamps a negative offset to 0', () => {
    expect(scrollPercent(-40, 2000, 500)).toBe(0);
  });

  // jsdom reports both as 0 on every element that has not been laid out.
  it('does not produce NaN when both measurements are zero', () => {
    expect(scrollPercent(0, 0, 0)).toBe(100);
  });
});

describe('positionToScrollTop', () => {
  it('inverts scrollPercent', () => {
    expect(positionToScrollTop(50, 2000, 500)).toBe(750);
    expect(positionToScrollTop(100, 2000, 500)).toBe(1500);
    expect(positionToScrollTop(0, 2000, 500)).toBe(0);
  });

  it('clamps a legacy page number into range rather than scrolling past the end', () => {
    expect(positionToScrollTop(480, 2000, 500)).toBe(1500);
  });

  it('restores unscrollable content to the top', () => {
    expect(positionToScrollTop(70, 400, 500)).toBe(0);
  });
});

describe('isAtCompletion', () => {
  it('accepts the threshold and anything above it', () => {
    expect(isAtCompletion(COMPLETION_THRESHOLD)).toBe(true);
    expect(isAtCompletion(100)).toBe(true);
  });

  it('rejects anything below the threshold', () => {
    expect(isAtCompletion(COMPLETION_THRESHOLD - 1)).toBe(false);
    expect(isAtCompletion(0)).toBe(false);
  });

  // The last line is readable before the container bottoms out; demanding an
  // exact 100 would leave chapters permanently unfinishable.
  it('does not demand an exact bottom', () => {
    expect(COMPLETION_THRESHOLD).toBeLessThan(100);
  });
});

describe('clampPercent', () => {
  it('passes through an in-range value', () => {
    expect(clampPercent(42)).toBe(42);
  });

  it('clamps both ends', () => {
    expect(clampPercent(-10)).toBe(0);
    expect(clampPercent(999)).toBe(100);
  });

  // A non-finite stored value is corrupt rather than merely out of range, so
  // it reads as "not started" instead of being clamped to either end.
  it('maps a non-finite value to 0', () => {
    expect(clampPercent(NaN)).toBe(0);
    expect(clampPercent(Infinity)).toBe(0);
    expect(clampPercent(-Infinity)).toBe(0);
  });
});
