// src/utils/__tests__/dateFormatter.test.ts

import {
  convertFirestoreTimestamp,
  getRelativeTime,
  formatJournalDate,
  formatDisplayDate,
  formatDateTime,
} from '../dateFormatter';

describe('dateFormatter', () => {
  describe('convertFirestoreTimestamp', () => {
    test('should return null for null/undefined/empty inputs', () => {
      expect(convertFirestoreTimestamp(null)).toBe(null);
      expect(convertFirestoreTimestamp(undefined)).toBe(null);
      expect(convertFirestoreTimestamp(0)).toBe(null);
      expect(convertFirestoreTimestamp('')).toBe(null);
    });

    test('should return the same Date when passed a Date instance', () => {
      const d = new Date('2025-06-15T12:00:00Z');
      const result = convertFirestoreTimestamp(d);
      expect(result).toBe(d);
    });

    test('should convert a Firestore Timestamp-like object with seconds/nanoseconds', () => {
      // 2024-01-01T00:00:00Z = 1704067200 seconds
      const fakeTimestamp = { seconds: 1704067200, nanoseconds: 500_000_000 };
      const result = convertFirestoreTimestamp(fakeTimestamp);
      expect(result).toBeInstanceOf(Date);
      // 1704067200 * 1000 + 500 = 1704067200500
      expect(result!.getTime()).toBe(1704067200500);
    });

    test('should call toDate() when present (native Firestore SDK object)', () => {
      const expected = new Date('2025-01-01T00:00:00Z');
      const fakeTimestamp = { toDate: jest.fn(() => expected) };
      const result = convertFirestoreTimestamp(fakeTimestamp);
      expect(result).toBe(expected);
      expect(fakeTimestamp.toDate).toHaveBeenCalledTimes(1);
    });

    test('should parse a valid ISO string', () => {
      const iso = '2025-06-15T12:34:56Z';
      const result = convertFirestoreTimestamp(iso);
      expect(result).toBeInstanceOf(Date);
      expect(result!.toISOString()).toBe('2025-06-15T12:34:56.000Z');
    });

    test('should return null for an invalid date string', () => {
      const result = convertFirestoreTimestamp('not-a-real-date');
      expect(result).toBe(null);
    });

    test('should convert numeric milliseconds to a Date', () => {
      const ms = 1704067200000; // 2024-01-01T00:00:00Z
      const result = convertFirestoreTimestamp(ms);
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBe(ms);
    });

    test('should return null for unsupported types like booleans', () => {
      expect(convertFirestoreTimestamp(true)).toBe(null);
    });

    test('should return null and log error when toDate throws', () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const fakeTimestamp = {
        toDate: () => {
          throw new Error('boom');
        },
      };
      const result = convertFirestoreTimestamp(fakeTimestamp);
      expect(result).toBe(null);
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    test('should return null for plain object lacking timestamp fields', () => {
      expect(convertFirestoreTimestamp({})).toBe(null);
    });
  });

  describe('getRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should return empty string for null/undefined', () => {
      expect(getRelativeTime(null)).toBe('');
      expect(getRelativeTime(undefined)).toBe('');
    });

    test('should return "Just now" for very recent dates (under a minute)', () => {
      const d = new Date('2025-06-15T11:59:30Z'); // 30s ago
      expect(getRelativeTime(d)).toBe('Just now');
    });

    test('should return minutes-ago format for sub-hour differences', () => {
      const d = new Date('2025-06-15T11:55:00Z'); // 5 min ago
      expect(getRelativeTime(d)).toBe('5 minutes ago');
    });

    test('should pluralize correctly for 1 minute ago', () => {
      const d = new Date('2025-06-15T11:59:00Z'); // 1 min ago
      expect(getRelativeTime(d)).toBe('1 minute ago');
    });

    test('should return hours-ago format for sub-day differences', () => {
      const d = new Date('2025-06-15T09:00:00Z'); // 3 hours ago
      expect(getRelativeTime(d)).toBe('3 hours ago');
    });

    test('should pluralize correctly for 1 hour ago', () => {
      const d = new Date('2025-06-15T11:00:00Z'); // 1 hour ago
      expect(getRelativeTime(d)).toBe('1 hour ago');
    });

    test('should return days-ago format for under-a-week differences', () => {
      const d = new Date('2025-06-12T12:00:00Z'); // 3 days ago
      expect(getRelativeTime(d)).toBe('3 days ago');
    });

    test('should pluralize correctly for 1 day ago', () => {
      const d = new Date('2025-06-14T12:00:00Z'); // 1 day ago
      expect(getRelativeTime(d)).toBe('1 day ago');
    });

    test('should fall back to locale date string when more than 7 days ago', () => {
      const d = new Date('2025-05-01T12:00:00Z'); // way more than 7 days
      const result = getRelativeTime(d);
      // Locale formatting varies; just verify non-empty, non-"X days ago" string
      expect(result).not.toBe('');
      expect(result).not.toMatch(/ago$/);
      expect(result).not.toBe('Just now');
    });
  });

  describe('formatJournalDate', () => {
    // NOTE: formatJournalDate calls toLocaleString('default', { month: 'long' }),
    // which means the month-name is system-locale dependent. We test the
    // day/suffix portion structurally and accept any non-empty month name.
    const journalDateRe = (day: number, suffix: string) =>
      new RegExp(`^the ${day}${suffix} of \\S+`);

    test('should return empty string for null', () => {
      expect(formatJournalDate(null)).toBe('');
    });

    test('should format date with "st" suffix for 1', () => {
      const d = new Date(2025, 5, 1); // June 1
      expect(formatJournalDate(d)).toMatch(journalDateRe(1, 'st'));
    });

    test('should format date with "nd" suffix for 2', () => {
      const d = new Date(2025, 5, 2);
      expect(formatJournalDate(d)).toMatch(journalDateRe(2, 'nd'));
    });

    test('should format date with "rd" suffix for 3', () => {
      const d = new Date(2025, 5, 3);
      expect(formatJournalDate(d)).toMatch(journalDateRe(3, 'rd'));
    });

    test('should format date with "th" suffix for 4-10', () => {
      expect(formatJournalDate(new Date(2025, 5, 4))).toMatch(journalDateRe(4, 'th'));
      expect(formatJournalDate(new Date(2025, 5, 10))).toMatch(journalDateRe(10, 'th'));
    });

    test('should use "th" suffix for special cases 11, 12, 13', () => {
      expect(formatJournalDate(new Date(2025, 5, 11))).toMatch(journalDateRe(11, 'th'));
      expect(formatJournalDate(new Date(2025, 5, 12))).toMatch(journalDateRe(12, 'th'));
      expect(formatJournalDate(new Date(2025, 5, 13))).toMatch(journalDateRe(13, 'th'));
    });

    test('should use "st" suffix for 21 and 31', () => {
      expect(formatJournalDate(new Date(2025, 5, 21))).toMatch(journalDateRe(21, 'st'));
      expect(formatJournalDate(new Date(2025, 0, 31))).toMatch(journalDateRe(31, 'st'));
    });

    test('should use "nd" suffix for 22', () => {
      expect(formatJournalDate(new Date(2025, 5, 22))).toMatch(journalDateRe(22, 'nd'));
    });

    test('should use "rd" suffix for 23', () => {
      expect(formatJournalDate(new Date(2025, 5, 23))).toMatch(journalDateRe(23, 'rd'));
    });
  });

  describe('formatDisplayDate', () => {
    test('should return empty string for null', () => {
      expect(formatDisplayDate(null)).toBe('');
    });

    test('should return a non-empty locale date string for a valid Date', () => {
      const d = new Date('2025-06-15T12:00:00Z');
      const result = formatDisplayDate(d);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should accept custom options', () => {
      const d = new Date('2025-06-15T12:00:00Z');
      const result = formatDisplayDate(d, { year: 'numeric' });
      expect(typeof result).toBe('string');
      expect(result).toContain('2025');
    });

    test('should return empty string for invalid date strings', () => {
      expect(formatDisplayDate('not-a-date')).toBe('');
    });
  });

  describe('formatDateTime', () => {
    test('should return empty string for null', () => {
      expect(formatDateTime(null)).toBe('');
    });

    test('should return a non-empty locale string for a valid Date', () => {
      const d = new Date('2025-06-15T12:00:00Z');
      const result = formatDateTime(d);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should return empty string for invalid input', () => {
      expect(formatDateTime('garbage')).toBe('');
    });
  });
});

// ---------------------------------------------------------------------------
// Additional coverage merged in from the former
// src/pages/layouts/common/utils/dateFormatter.ts duplicate (originally
// src/components/features/layouts/common/utils/dateFormatter.ts), preserved
// verbatim during the shared/core consolidation pass. That copy's
// getRelativeTime/formatJournalDate/formatDisplayDate took a plain `Date`
// (no Firestore-timestamp/string/number handling), but produced identical
// output to the functions above for every Date input these tests exercise,
// since convertFirestoreTimestamp() passes a Date instance through
// unchanged. Kept as separate describe blocks (own module scope, no shared
// beforeEach/afterEach) so they still run under real timers exactly as
// originally written.
// ---------------------------------------------------------------------------

/** Returns a Date that is `ms` milliseconds before "now". */
const msAgo = (ms: number): Date => new Date(Date.now() - ms);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('getRelativeTime (additional cases merged from layouts copy)', () => {
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

// Locale-aware month name helper (matches what the implementation uses)
const localMonth = (monthIndex: number): string =>
  new Date(2024, monthIndex, 1).toLocaleString('default', { month: 'long' });

describe('formatJournalDate (additional cases merged from layouts copy)', () => {
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

describe('formatDisplayDate (additional cases merged from layouts copy)', () => {
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
