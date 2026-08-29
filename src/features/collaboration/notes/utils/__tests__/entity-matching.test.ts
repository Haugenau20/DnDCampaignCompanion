// src/features/collaboration/notes/utils/__tests__/entity-matching.test.ts

import { matchesInText } from '../entity-matching';

describe('matchesInText', () => {
  test('should match a plain occurrence', () => {
    expect(matchesInText('The party met Gundren Rockseeker today.', 'Gundren Rockseeker')).toBe(true);
  });

  test('should match case-insensitively', () => {
    expect(matchesInText('we went to phandalin', 'Phandalin')).toBe(true);
  });

  test('should NOT match across a sentence boundary', () => {
    // The bug this function exists for: normalizeTextForComparison turns this
    // note into "...cave-wave-echo-starts..." and false-matches the entity.
    const note = 'We camped in the cave. Wave Echo starts tomorrow.';
    expect(matchesInText(note, 'Cave Wave Echo')).toBe(false);
  });

  test('should NOT match a substring inside a longer word', () => {
    expect(matchesInText('The caverns were flooded.', 'cave')).toBe(false);
    expect(matchesInText('Phandalinesque architecture', 'Phandalin')).toBe(false);
  });

  test('should match a name adjacent to punctuation', () => {
    expect(matchesInText('We reached Phandalin, at last.', 'Phandalin')).toBe(true);
    expect(matchesInText('Who is Gundren?', 'Gundren')).toBe(true);
    expect(matchesInText('"Phandalin"', 'Phandalin')).toBe(true);
  });

  test('should match at the very start and very end of the text', () => {
    expect(matchesInText('Phandalin is quiet', 'Phandalin')).toBe(true);
    expect(matchesInText('we rode to Phandalin', 'Phandalin')).toBe(true);
  });

  test('should ignore a leading article on the candidate', () => {
    expect(matchesInText('They entered Stonehill Inn.', 'The Stonehill Inn')).toBe(true);
  });

  test('should tolerate any whitespace run between candidate words', () => {
    expect(matchesInText('the  Stonehill\n  Inn was full', 'Stonehill Inn')).toBe(true);
  });

  test('should treat regex metacharacters in the candidate literally', () => {
    expect(matchesInText('We visited the Inn (Old).', 'Inn (Old)')).toBe(true);
    expect(matchesInText('We visited the Inn XOld.', 'Inn (Old)')).toBe(false);
  });

  test('should return false for empty inputs', () => {
    expect(matchesInText('', 'Phandalin')).toBe(false);
    expect(matchesInText('Phandalin', '')).toBe(false);
    expect(matchesInText('Phandalin', '   ')).toBe(false);
    expect(matchesInText('Phandalin', 'the')).toBe(false);
  });
});
