// src/features/collaboration/notes/utils/__tests__/save-status.test.ts

import { formatLastSaved } from '../save-status';

/** Fixed reference point so every case is deterministic. */
const NOW = new Date('2026-06-10T12:00:00.000Z');

function agoMs(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatLastSaved', () => {
  test('should read "just now" under a minute', () => {
    expect(formatLastSaved(agoMs(5_000), NOW)).toBe('Saved just now');
  });

  test('should report whole minutes under an hour', () => {
    expect(formatLastSaved(agoMs(2 * MINUTE), NOW)).toBe('Saved 2 minutes ago');
    expect(formatLastSaved(agoMs(59 * MINUTE), NOW)).toBe('Saved 59 minutes ago');
  });

  test('should report hours under a day', () => {
    expect(formatLastSaved(agoMs(3 * HOUR), NOW)).toBe('Saved 3 hours ago');
  });

  test('should report days rather than accumulating hours', () => {
    // The bug: the old implementation rendered this as "Saved 72h ago".
    expect(formatLastSaved(agoMs(3 * DAY), NOW)).toBe('Saved 3 days ago');
  });

  test('should not render an hour count above 24 for any input', () => {
    // Regression guard for "Saved 10870h ago".
    const veryOld = formatLastSaved(agoMs(453 * DAY), NOW);
    expect(veryOld).not.toMatch(/\d{3,}\s*(h|hours)/);
  });

  test('should fall back to an absolute date past seven days', () => {
    const result = formatLastSaved(new Date('2026-06-02T09:00:00.000Z'), NOW);
    expect(result).toMatch(/^Saved on /);
    expect(result).toContain('2');
  });

  test('should use the absolute form for a note saved a year ago', () => {
    const result = formatLastSaved(new Date('2025-06-02T09:00:00.000Z'), NOW);
    expect(result).toMatch(/^Saved on /);
  });

  test('should still report days at exactly seven days', () => {
    expect(formatLastSaved(agoMs(7 * DAY), NOW)).toBe('Saved 7 days ago');
  });
});
