// src/components/features/layouts/common/utils/__tests__/layoutUtils.test.ts
import {
  getRelativeTime,
  formatJournalDate,
  getContentTypeLabel,
  calculateCompletionPercentage,
} from '../layoutUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const msAgo = (ms: number): Date => new Date(Date.now() - ms);

// ---------------------------------------------------------------------------
// getRelativeTime (duplicate of dateFormatter — test independently)
// ---------------------------------------------------------------------------
describe('getRelativeTime', () => {
  it('returns "Just now" for a date less than a minute ago', () => {
    expect(getRelativeTime(msAgo(30 * SECOND))).toBe('Just now');
  });

  it('returns "1 minute ago" for ~1 minute ago', () => {
    expect(getRelativeTime(msAgo(61 * SECOND))).toBe('1 minute ago');
  });

  it('returns "2 minutes ago" for ~2 minutes ago', () => {
    expect(getRelativeTime(msAgo(2 * MINUTE + 5 * SECOND))).toBe('2 minutes ago');
  });

  it('returns "1 hour ago" for ~1 hour ago', () => {
    expect(getRelativeTime(msAgo(61 * MINUTE))).toBe('1 hour ago');
  });

  it('returns "2 hours ago" for ~2 hours ago', () => {
    expect(getRelativeTime(msAgo(2 * HOUR + MINUTE))).toBe('2 hours ago');
  });

  it('returns "1 day ago" for ~1 day ago', () => {
    expect(getRelativeTime(msAgo(DAY + HOUR))).toBe('1 day ago');
  });

  it('returns "4 days ago" for ~4 days ago', () => {
    expect(getRelativeTime(msAgo(4 * DAY + HOUR))).toBe('4 days ago');
  });

  it('returns a locale date string for dates older than 7 days', () => {
    const result = getRelativeTime(msAgo(8 * DAY));
    expect(result).not.toMatch(/ago/);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Locale-aware month name helper (matches what the implementation produces)
// ---------------------------------------------------------------------------
const localMonth = (monthIndex: number): string =>
  new Date(2024, monthIndex, 1).toLocaleString('default', { month: 'long' });

// ---------------------------------------------------------------------------
// formatJournalDate
// ---------------------------------------------------------------------------
describe('formatJournalDate', () => {
  it('formats the 1st with "st" suffix', () => {
    expect(formatJournalDate(new Date(2024, 0, 1))).toBe(`the 1st of ${localMonth(0)}`);
  });

  it('formats the 2nd with "nd" suffix', () => {
    expect(formatJournalDate(new Date(2024, 0, 2))).toBe(`the 2nd of ${localMonth(0)}`);
  });

  it('formats the 3rd with "rd" suffix', () => {
    expect(formatJournalDate(new Date(2024, 0, 3))).toBe(`the 3rd of ${localMonth(0)}`);
  });

  it('formats the 4th with "th" suffix', () => {
    expect(formatJournalDate(new Date(2024, 0, 4))).toBe(`the 4th of ${localMonth(0)}`);
  });

  it('uses "th" for 11th (st exception)', () => {
    expect(formatJournalDate(new Date(2024, 0, 11))).toBe(`the 11th of ${localMonth(0)}`);
  });

  it('uses "th" for 12th (nd exception)', () => {
    expect(formatJournalDate(new Date(2024, 0, 12))).toBe(`the 12th of ${localMonth(0)}`);
  });

  it('uses "th" for 13th (rd exception)', () => {
    expect(formatJournalDate(new Date(2024, 0, 13))).toBe(`the 13th of ${localMonth(0)}`);
  });

  it('formats the 21st with "st"', () => {
    expect(formatJournalDate(new Date(2024, 0, 21))).toBe(`the 21st of ${localMonth(0)}`);
  });

  it('formats the 31st with "st"', () => {
    expect(formatJournalDate(new Date(2024, 0, 31))).toBe(`the 31st of ${localMonth(0)}`);
  });

  it('includes correct (locale-aware) month name', () => {
    const expected = localMonth(11);
    expect(formatJournalDate(new Date(2024, 11, 25))).toMatch(expected);
  });
});

// ---------------------------------------------------------------------------
// getContentTypeLabel
// ---------------------------------------------------------------------------
describe('getContentTypeLabel', () => {
  it('returns "Story" for "chapter"', () => {
    expect(getContentTypeLabel('chapter')).toBe('Story');
  });

  it('returns "NPC" for "npc"', () => {
    expect(getContentTypeLabel('npc')).toBe('NPC');
  });

  it('returns "Quest" for "quest"', () => {
    expect(getContentTypeLabel('quest')).toBe('Quest');
  });

  it('returns "Rumor" for "rumor"', () => {
    expect(getContentTypeLabel('rumor')).toBe('Rumor');
  });

  it('returns "Location" for "location"', () => {
    expect(getContentTypeLabel('location')).toBe('Location');
  });

  it('capitalises the first letter for unknown types', () => {
    expect(getContentTypeLabel('session')).toBe('Session');
  });

  it('handles empty string without throwing', () => {
    expect(() => getContentTypeLabel('')).not.toThrow();
    expect(getContentTypeLabel('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// calculateCompletionPercentage
// ---------------------------------------------------------------------------
describe('calculateCompletionPercentage', () => {
  it('returns 0 for an empty array', () => {
    expect(calculateCompletionPercentage([])).toBe(0);
  });

  it('returns 0 when objectives is null/undefined (guard)', () => {
    // The implementation checks !objectives, so passing null should return 0
    expect(calculateCompletionPercentage(null as any)).toBe(0);
  });

  it('returns 0 when no objectives are completed', () => {
    const objectives = [
      { completed: false },
      { completed: false },
    ];
    expect(calculateCompletionPercentage(objectives)).toBe(0);
  });

  it('returns 100 when all objectives are completed', () => {
    const objectives = [
      { completed: true },
      { completed: true },
      { completed: true },
    ];
    expect(calculateCompletionPercentage(objectives)).toBe(100);
  });

  it('returns 50 when half of objectives are completed', () => {
    const objectives = [
      { completed: true },
      { completed: false },
    ];
    expect(calculateCompletionPercentage(objectives)).toBe(50);
  });

  it('rounds to the nearest integer', () => {
    // 1 of 3 = 33.333... → 33
    const objectives = [
      { completed: true },
      { completed: false },
      { completed: false },
    ];
    expect(calculateCompletionPercentage(objectives)).toBe(33);
  });

  it('handles a single completed objective', () => {
    expect(calculateCompletionPercentage([{ completed: true }])).toBe(100);
  });

  it('handles a single uncompleted objective', () => {
    expect(calculateCompletionPercentage([{ completed: false }])).toBe(0);
  });

  it('returns a value between 0 and 100 for mixed objectives', () => {
    const objectives = Array.from({ length: 10 }, (_, i) => ({
      completed: i < 7,
    }));
    const result = calculateCompletionPercentage(objectives);
    expect(result).toBe(70);
  });
});
