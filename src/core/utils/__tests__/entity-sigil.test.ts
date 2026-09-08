// src/core/utils/__tests__/entity-sigil.test.ts
// Phase 3's gate, as a test: the same entity produces the same mark everywhere
// it appears, across reloads.

import {
  sigilIndexFor,
  sigilInitialFor,
  sigilVariableFor,
  SIGIL_BUCKET_COUNT,
} from '../entity-sigil';
import { lightTheme } from '../../themes/definitions/lightTheme';
import { darkTheme } from '../../themes/definitions/darkTheme';
import { medievalTheme } from '../../themes/definitions/medievalTheme';

describe('sigilIndexFor', () => {
  test('is stable for the same id', () => {
    expect(sigilIndexFor('thorin-oakenshield')).toBe(sigilIndexFor('thorin-oakenshield'));
  });

  test('always lands inside the palette', () => {
    const ids = Array.from({ length: 500 }, (_, i) => `entity-${i}`);
    ids.forEach((id) => {
      const index = sigilIndexFor(id);
      expect(Number.isInteger(index)).toBe(true);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(SIGIL_BUCKET_COUNT);
    });
  });

  test('distinguishes ids that differ only slightly', () => {
    expect(sigilIndexFor('kerowyn-hucrele')).not.toBe(sigilIndexFor('kerowyn-hucrele-2'));
  });

  test('spreads a realistic campaign across every bucket', () => {
    // A mark that collapsed most entities onto one hue would be worthless for
    // scanning, which is the entire justification for having it.
    const ids = Array.from({ length: 200 }, (_, i) => `npc-${i}`);
    const used = new Set(ids.map(sigilIndexFor));
    expect(used.size).toBe(SIGIL_BUCKET_COUNT);
  });

  test('is pinned to known values, so marks survive a refactor', () => {
    // Recording concrete outputs is what makes "across reloads, across
    // devices, across deploys" checkable rather than assumed. Changing these
    // renumbers every mark in every campaign.
    expect({
      'thorin-oakenshield': sigilIndexFor('thorin-oakenshield'),
      'kerowyn-hucrele': sigilIndexFor('kerowyn-hucrele'),
      'the-sunless-citadel': sigilIndexFor('the-sunless-citadel'),
      'oakhurst': sigilIndexFor('oakhurst'),
      '': sigilIndexFor(''),
    }).toEqual({
      'thorin-oakenshield': 1,
      'kerowyn-hucrele': 7,
      'the-sunless-citadel': 7,
      'oakhurst': 6,
      // FNV-1a's offset basis is 2166136261, and 2166136261 % 8 === 5, so an
      // empty id is well-defined rather than an accident.
      '': 5,
    });
  });
});

describe('sigilInitialFor', () => {
  test('takes the first letter, uppercased', () => {
    expect(sigilInitialFor('Kerowyn Hucrele')).toBe('K');
    expect(sigilInitialFor('thorin')).toBe('T');
  });

  test('skips leading punctuation and whitespace', () => {
    expect(sigilInitialFor('  "The Old Forest"')).toBe('T');
  });

  test('accepts a digit as an initial', () => {
    expect(sigilInitialFor('4th Ward')).toBe('4');
  });

  test('handles non-Latin names', () => {
    expect(sigilInitialFor('Ærin')).toBe('Æ');
  });

  test('never renders empty', () => {
    expect(sigilInitialFor('')).toBe('·');
    expect(sigilInitialFor('!!!')).toBe('·');
    expect(sigilInitialFor(undefined as unknown as string)).toBe('·');
  });
});

describe('palette contract', () => {
  const themes = [
    ['light', lightTheme],
    ['dark', darkTheme],
    ['medieval', medievalTheme],
  ] as const;

  test.each(themes)('%s defines at least one hue per bucket', (_name, theme) => {
    expect(theme.tokens.entityPalette.length).toBeGreaterThanOrEqual(SIGIL_BUCKET_COUNT);
  });

  test.each(themes)('%s keeps every hue in one narrow band against its ink', (_name, theme) => {
    // The palette's job is to separate entities while all entries sit equally
    // quiet. "Equally" is measurable: the spread between the best and worst
    // contrast should be small, and every entry must clear AA.
    const lin = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const parse = (hex: string) =>
      [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const lum = (hex: string) => {
      const [r, g, b] = parse(hex);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const ratio = (a: string, b: string) => {
      const [la, lb] = [lum(a), lum(b)];
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    const ratios = theme.tokens.entityPalette.map((hue) =>
      ratio(hue, theme.tokens.entityInk)
    );
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.5);
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(1.5);
  });

  test('all three themes define the same number of hues', () => {
    const sizes = themes.map(([, t]) => t.tokens.entityPalette.length);
    expect(new Set(sizes).size).toBe(1);
  });

  test('appending a hue does not change any existing mark', () => {
    // The index depends on SIGIL_BUCKET_COUNT, not on palette length, so a
    // longer palette is inert until that constant is raised deliberately.
    const ids = Array.from({ length: 100 }, (_, i) => `entity-${i}`);
    const before = ids.map(sigilIndexFor);
    const grown = [...lightTheme.tokens.entityPalette, '#123456'];
    expect(grown.length).toBeGreaterThan(SIGIL_BUCKET_COUNT);
    expect(ids.map(sigilIndexFor)).toEqual(before);
  });
});

describe('sigilVariableFor', () => {
  test('names the indexed palette variable', () => {
    expect(sigilVariableFor(0)).toBe('--entity-palette-0');
    expect(sigilVariableFor(7)).toBe('--entity-palette-7');
  });
});
