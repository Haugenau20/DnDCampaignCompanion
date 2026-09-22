// src/shared/utils/__tests__/resolve-name-to-id.test.ts
import { resolveNameToId, resolveNamesToIds } from '../resolve-name-to-id';

/**
 * The extractor returns prose where the product stores ids. A model has never
 * seen the NPC directory or the location tree, so `parentLocation` is "The
 * Shire" and the quest's people are names — and both were being written into
 * id-shaped fields, where they resolved to nothing and, in the location case,
 * left a dangling `parentId` that filed the place under "Unplaced".
 *
 * The rule, decided 2026-09-22: **a single exact match wins; anything else
 * yields no id.** No match and two matches both fail closed, because a wrong
 * link is worse than an absent one — an absent one is visible and fixable, and
 * a wrong one silently claims something the session never said.
 */
const records = [
  { id: 'loc-1', name: 'The Shire' },
  { id: 'loc-2', name: 'Rivendell' },
  { id: 'loc-3', name: 'Bree' },
];

describe('resolveNameToId', () => {
  describe('a single match', () => {
    test('resolves an exact name to its id', () => {
      expect(resolveNameToId('Rivendell', records)).toBe('loc-2');
    });

    test('ignores surrounding whitespace', () => {
      expect(resolveNameToId('  The Shire  ', records)).toBe('loc-1');
    });

    test('ignores case, which a model varies freely', () => {
      expect(resolveNameToId('the shire', records)).toBe('loc-1');
      expect(resolveNameToId('RIVENDELL', records)).toBe('loc-2');
    });
  });

  describe('no usable answer', () => {
    test('a name matching nothing yields no id', () => {
      expect(resolveNameToId('Gondolin', records)).toBe('');
    });

    test('a partial name is not a match', () => {
      // "Shire" is not "The Shire". Substring matching would link a place to
      // whichever record happened to contain the word.
      expect(resolveNameToId('Shire', records)).toBe('');
    });

    test('an ambiguous name yields no id rather than guessing', () => {
      const twoBrees = [
        { id: 'loc-3', name: 'Bree' },
        { id: 'loc-9', name: 'bree' },
      ];
      expect(resolveNameToId('Bree', twoBrees)).toBe('');
    });

    test.each([
      ['undefined', undefined],
      ['null', null],
      ['an empty string', ''],
      ['whitespace', '   '],
      ['a number', 42],
      ['an object', { name: 'The Shire' }],
    ])('%s yields no id', (_label, input) => {
      expect(resolveNameToId(input as never, records)).toBe('');
    });

    test('an empty collection yields no id', () => {
      expect(resolveNameToId('The Shire', [])).toBe('');
    });

    test('records without a usable name are skipped, not matched', () => {
      const messy = [
        { id: 'a', name: '' },
        { id: 'b', name: 'Bree' },
      ] as never;
      expect(resolveNameToId('', messy)).toBe('');
      expect(resolveNameToId('Bree', messy)).toBe('b');
    });
  });

  test('an id is never invented for a record that has none', () => {
    const noId = [{ id: '', name: 'The Shire' }];
    expect(resolveNameToId('The Shire', noId)).toBe('');
  });
});

describe('resolveNamesToIds', () => {
  test('resolves each name it can', () => {
    expect(resolveNamesToIds(['Rivendell', 'Bree'], records)).toEqual(['loc-2', 'loc-3']);
  });

  test('drops the names it cannot resolve rather than keeping them as ids', () => {
    // This is the defect being closed: unresolved names used to be stored in
    // `relatedNPCIds` verbatim, where every consumer looked them up and found
    // nothing.
    expect(resolveNamesToIds(['Rivendell', 'Gondolin'], records)).toEqual(['loc-2']);
  });

  test('yields an empty list when nothing resolves', () => {
    expect(resolveNamesToIds(['Gondolin', 'Numenor'], records)).toEqual([]);
  });

  test('does not repeat an id when two names resolve to the same record', () => {
    expect(resolveNamesToIds(['Bree', 'bree'], records)).toEqual(['loc-3']);
  });

  test.each([
    ['undefined', undefined],
    ['null', null],
    ['a bare string', 'Rivendell'],
    ['an object', { names: [] }],
  ])('%s yields an empty list rather than throwing', (_label, input) => {
    expect(resolveNamesToIds(input as never, records)).toEqual([]);
  });
});
