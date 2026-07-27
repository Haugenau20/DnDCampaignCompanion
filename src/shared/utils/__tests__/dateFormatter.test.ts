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
