// src/features/collaboration/notes/utils/__tests__/note-title.test.ts

import { deriveTitle, displayTitle, MAX_DERIVED_TITLE_LENGTH } from '../note-title';

describe('deriveTitle', () => {
  test('should return the first line of content', () => {
    expect(deriveTitle('Wave Echo Cave\n\nThe party met Gundren.')).toBe('Wave Echo Cave');
  });

  test('should skip leading blank and whitespace-only lines', () => {
    expect(deriveTitle('\n   \n\nSession 32\nmore text')).toBe('Session 32');
  });

  test('should trim surrounding whitespace from the derived line', () => {
    expect(deriveTitle('   Redbrand hideout   \nrest')).toBe('Redbrand hideout');
  });

  test('should return empty string for empty content', () => {
    expect(deriveTitle('')).toBe('');
  });

  test('should return empty string for whitespace-only content', () => {
    expect(deriveTitle('   \n\t\n  ')).toBe('');
  });

  test('should keep a line that is exactly the maximum length', () => {
    const line = 'a'.repeat(MAX_DERIVED_TITLE_LENGTH);
    expect(deriveTitle(line)).toBe(line);
    expect(deriveTitle(line)).toHaveLength(80);
  });

  test('should cut a long line on a word boundary without an ellipsis', () => {
    // 17 words of 4 chars + spaces runs past 80 chars mid-word.
    const line = 'word '.repeat(20).trim();
    const result = deriveTitle(line);
    expect(result.length).toBeLessThanOrEqual(MAX_DERIVED_TITLE_LENGTH);
    expect(result).not.toContain('...');
    expect(result).not.toContain('…');
    expect(result.endsWith('word')).toBe(true);
    // Cutting on a boundary means no partial trailing token.
    expect(result.split(' ').every(token => token === 'word')).toBe(true);
  });

  test('should hard-cut a single word longer than the maximum', () => {
    const result = deriveTitle('b'.repeat(120));
    expect(result).toBe('b'.repeat(MAX_DERIVED_TITLE_LENGTH));
  });

  test('should not leave trailing whitespace after a boundary cut', () => {
    const line = `${'x'.repeat(78)} tail`;
    const result = deriveTitle(line);
    expect(result).toBe('x'.repeat(78));
  });
});

describe('displayTitle', () => {
  test('should prefer an explicit title', () => {
    expect(displayTitle({ title: 'My title', content: 'First line' })).toBe('My title');
  });

  test('should fall back to the derived title when the title is empty', () => {
    expect(displayTitle({ title: '', content: 'First line\nsecond' })).toBe('First line');
  });

  test('should treat a whitespace-only title as absent', () => {
    expect(displayTitle({ title: '   ', content: 'Derived line' })).toBe('Derived line');
  });

  test('should return null when there is no title and no content', () => {
    expect(displayTitle({ title: '', content: '' })).toBeNull();
  });
});
