// src/components/features/layouts/common/utils/__tests__/dateFormatter.test.ts
import {
  getRelativeTime,
  formatJournalDate,
  formatDisplayDate,
} from '../dateFormatter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a Date that is `ms` milliseconds before "now". */
const msAgo = (ms: number): Date => new Date(Date.now() - ms);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------------------
// getRelativeTime
// ---------------------------------------------------------------------------
describe('getRelativeTime', () => {
  it('returns "Just now" for a date less than a minute ago', () => {
    const date = msAgo(30 * SECOND);
    expect(getRelativeTime(date)).toBe('Just now');
  });

  it('returns "1 minute ago" for a date ~1 minute ago', () => {
    const date = msAgo(61 * SECOND);
    expect(getRelativeTime(date)).toBe('1 minute ago');
  });

  it('returns "2 minutes ago" for a date ~2 minutes ago', () => {
    const date = msAgo(2 * MINUTE + 5 * SECOND);
    expect(getRelativeTime(date)).toBe('2 minutes ago');
  });

  it('returns "1 hour ago" for a date ~1 hour ago', () => {
    const date = msAgo(61 * MINUTE);
    expect(getRelativeTime(date)).toBe('1 hour ago');
  });

  it('returns "3 hours ago" for a date ~3 hours ago', () => {
    const date = msAgo(3 * HOUR + 5 * MINUTE);
    expect(getRelativeTime(date)).toBe('3 hours ago');
  });

  it('returns "1 day ago" for a date ~1 day ago', () => {
    const date = msAgo(1 * DAY + HOUR);
    expect(getRelativeTime(date)).toBe('1 day ago');
  });

  it('returns "3 days ago" for a date ~3 days ago', () => {
    const date = msAgo(3 * DAY + HOUR);
    expect(getRelativeTime(date)).toBe('3 days ago');
  });

  it('returns a locale date string for dates older than 7 days', () => {
    const date = msAgo(8 * DAY);
    const result = getRelativeTime(date);
    // Should be a date string produced by toLocaleDateString — not "ago"
    expect(result).not.toMatch(/ago/);
    expect(result.length).toBeGreaterThan(0);
  });

  it('uses singular "minute" for exactly 1 minute', () => {
    const date = msAgo(60 * SECOND + 500);
    expect(getRelativeTime(date)).toMatch(/^1 minute ago$/);
  });

  it('uses plural "minutes" for > 1 minute', () => {
    const date = msAgo(5 * MINUTE + SECOND);
    expect(getRelativeTime(date)).toMatch(/minutes ago/);
  });

  it('uses singular "hour" for exactly 1 hour', () => {
    const date = msAgo(HOUR + MINUTE);
    expect(getRelativeTime(date)).toMatch(/^1 hour ago$/);
  });

  it('uses plural "hours" for > 1 hour', () => {
    const date = msAgo(2 * HOUR + MINUTE);
    expect(getRelativeTime(date)).toMatch(/hours ago/);
  });

  it('uses singular "day" for exactly 1 day', () => {
    const date = msAgo(DAY + HOUR);
    expect(getRelativeTime(date)).toMatch(/^1 day ago$/);
  });

  it('uses plural "days" for > 1 day', () => {
    const date = msAgo(2 * DAY + HOUR);
    expect(getRelativeTime(date)).toMatch(/days ago/);
  });
});

// ---------------------------------------------------------------------------
// Locale-aware month name helper (matches what the implementation uses)
// ---------------------------------------------------------------------------
const localMonth = (monthIndex: number): string =>
  new Date(2024, monthIndex, 1).toLocaleString('default', { month: 'long' });

// ---------------------------------------------------------------------------
// formatJournalDate
// ---------------------------------------------------------------------------
describe('formatJournalDate', () => {
  it('formats a date with "st" suffix for the 1st', () => {
    const date = new Date(2024, 0, 1); // January 1
    expect(formatJournalDate(date)).toBe(`the 1st of ${localMonth(0)}`);
  });

  it('formats a date with "nd" suffix for the 2nd', () => {
    const date = new Date(2024, 0, 2);
    expect(formatJournalDate(date)).toBe(`the 2nd of ${localMonth(0)}`);
  });

  it('formats a date with "rd" suffix for the 3rd', () => {
    const date = new Date(2024, 0, 3);
    expect(formatJournalDate(date)).toBe(`the 3rd of ${localMonth(0)}`);
  });

  it('formats a date with "th" suffix for the 4th', () => {
    const date = new Date(2024, 0, 4);
    expect(formatJournalDate(date)).toBe(`the 4th of ${localMonth(0)}`);
  });

  it('uses "th" for 11th (exception to "st" rule)', () => {
    const date = new Date(2024, 0, 11);
    expect(formatJournalDate(date)).toBe(`the 11th of ${localMonth(0)}`);
  });

  it('uses "th" for 12th (exception to "nd" rule)', () => {
    const date = new Date(2024, 0, 12);
    expect(formatJournalDate(date)).toBe(`the 12th of ${localMonth(0)}`);
  });

  it('uses "th" for 13th (exception to "rd" rule)', () => {
    const date = new Date(2024, 0, 13);
    expect(formatJournalDate(date)).toBe(`the 13th of ${localMonth(0)}`);
  });

  it('formats the 21st with "st" suffix', () => {
    const date = new Date(2024, 0, 21);
    expect(formatJournalDate(date)).toBe(`the 21st of ${localMonth(0)}`);
  });

  it('formats the 22nd with "nd" suffix', () => {
    const date = new Date(2024, 0, 22);
    expect(formatJournalDate(date)).toBe(`the 22nd of ${localMonth(0)}`);
  });

  it('formats the 23rd with "rd" suffix', () => {
    const date = new Date(2024, 0, 23);
    expect(formatJournalDate(date)).toBe(`the 23rd of ${localMonth(0)}`);
  });

  it('includes the correct (locale-aware) month name', () => {
    const date = new Date(2024, 5, 15); // June (locale-dependent)
    const expected = localMonth(5);
    expect(formatJournalDate(date)).toMatch(expected);
  });

  it('produces a string starting with "the "', () => {
    const date = new Date(2024, 2, 10);
    expect(formatJournalDate(date)).toMatch(/^the /);
  });
});

// ---------------------------------------------------------------------------
// formatDisplayDate
// ---------------------------------------------------------------------------
describe('formatDisplayDate', () => {
  it('formats a Date object as a locale date string', () => {
    const date = new Date(2024, 0, 15); // January 15 2024
    const result = formatDisplayDate(date);
    // The result is locale-dependent but should include the date components
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('formats a date string input', () => {
    const result = formatDisplayDate('2024-06-01');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles a Date passed as a string that represents a valid ISO date', () => {
    const isoString = new Date(2024, 5, 1).toISOString();
    const result = formatDisplayDate(isoString);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('produces the same output for a Date and its equivalent ISO string', () => {
    const date = new Date(2024, 2, 20); // March 20 2024
    const fromDate = formatDisplayDate(date);
    const fromString = formatDisplayDate(date.toISOString());
    // Both should produce the same calendar date representation
    expect(fromDate).toBe(fromString);
  });
});
