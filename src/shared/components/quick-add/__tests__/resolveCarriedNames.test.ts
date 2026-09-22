// src/shared/components/quick-add/__tests__/resolveCarriedNames.test.ts
import {
  resolveCarriedNames,
  resolveLocationRef,
} from '../useQuickAddCreate';

/**
 * The step that decides whether a converted record links to anything.
 *
 * Everything relational the extractor returns is prose — it has never seen the
 * NPC directory or the location tree — and it was being written into id-shaped
 * fields verbatim: `parentLocation` into `Location.parentId`, names into
 * `Quest.relatedNPCIds`. The first wrote a dangling reference the product
 * files under "Unplaced"; the second produced a people list where every entry
 * rendered as "Someone no longer in the directory".
 *
 * The rule, decided 2026-09-22: a single exact match wins, and anything else
 * leaves the id empty. Nothing the session said is lost — the name stays in
 * the prose field it came from — only the false claim of a link.
 */
const locations = [
  { id: 'loc-shire', name: 'The Shire' },
  { id: 'loc-bree', name: 'Bree' },
];
const npcs = [
  { id: 'npc-frodo', name: 'Frodo' },
  { id: 'npc-sam', name: 'Sam' },
];

describe('resolveCarriedNames', () => {
  test('carries nothing through when there is nothing to carry', () => {
    expect(resolveCarriedNames('npc', undefined, npcs, locations)).toBeUndefined();
  });

  describe('a location', () => {
    test("turns the model's parent name into an id", () => {
      const carry = resolveCarriedNames(
        'location',
        { parentId: 'The Shire' },
        npcs,
        locations
      );

      expect(carry?.parentId).toBe('loc-shire');
    });

    test('leaves the parent empty when the name matches nothing', () => {
      // Empty is what `buildDocument` already writes for a top-level place.
      // The place shows under "Unplaced" honestly, rather than holding a
      // reference to a location that does not exist.
      const carry = resolveCarriedNames(
        'location',
        { parentId: 'Gondolin' },
        npcs,
        locations
      );

      expect(carry?.parentId).toBe('');
    });

    test('keeps a real id, which is what Add a place inside passes', () => {
      const carry = resolveCarriedNames(
        'location',
        { parentId: 'loc-bree' },
        npcs,
        locations
      );

      expect(carry?.parentId).toBe('loc-bree');
    });
  });

  describe('a quest', () => {
    test('resolves the extracted names into the ids the document stores', () => {
      const carry = resolveCarriedNames(
        'quest',
        { relatedNPCNames: ['Frodo', 'Sam'] },
        npcs,
        locations
      );

      expect(carry?.relatedNPCIds).toEqual(['npc-frodo', 'npc-sam']);
    });

    test('drops a name that matches no NPC rather than storing it as an id', () => {
      const carry = resolveCarriedNames(
        'quest',
        { relatedNPCNames: ['Frodo', 'Tom Bombadil'] },
        npcs,
        locations
      );

      expect(carry?.relatedNPCIds).toEqual(['npc-frodo']);
    });

    test('does not leave the schema field on the document', () => {
      // `relatedNPCNames` is the extractor's key. A quest stores
      // `relatedNPCIds`, and the carry is spread straight into the document.
      const carry = resolveCarriedNames(
        'quest',
        { relatedNPCNames: ['Frodo'] },
        npcs,
        locations
      );

      expect(carry).not.toHaveProperty('relatedNPCNames');
    });

    test('yields an empty list when the model named nobody', () => {
      const carry = resolveCarriedNames('quest', { title: 'A quest' }, npcs, locations);
      expect(carry?.relatedNPCIds).toEqual([]);
    });
  });

  describe('the place an NPC or quest was said to be in', () => {
    test('links it when the name resolves, keeping the prose', () => {
      const carry = resolveCarriedNames(
        'npc',
        { location: 'Bree' },
        npcs,
        locations
      );

      // `NPC.location` describes; `locationId` is what resolves. Both.
      expect(carry?.locationId).toBe('loc-bree');
      expect(carry?.location).toBe('Bree');
    });

    test('leaves no id when the place is not a record, and keeps the text', () => {
      const carry = resolveCarriedNames(
        'npc',
        { location: 'Some roadside inn' },
        npcs,
        locations
      );

      expect(carry?.locationId).toBeUndefined();
      expect(carry?.location).toBe('Some roadside inn');
    });

    test('applies to a quest as well', () => {
      const carry = resolveCarriedNames(
        'quest',
        { location: 'The Shire' },
        npcs,
        locations
      );

      expect(carry?.locationId).toBe('loc-shire');
    });
  });

  test('leaves fields it does not own alone', () => {
    const carry = resolveCarriedNames(
      'npc',
      { race: 'Hobbit', occupation: 'Gardener', relationship: 'friendly' },
      npcs,
      locations
    );

    expect(carry).toMatchObject({
      race: 'Hobbit',
      occupation: 'Gardener',
      relationship: 'friendly',
    });
  });
});

describe('resolveLocationRef', () => {
  test('recognises a value that is already an id', () => {
    expect(resolveLocationRef('loc-shire', locations)).toBe('loc-shire');
  });

  test('falls back to matching it as a name', () => {
    expect(resolveLocationRef('The Shire', locations)).toBe('loc-shire');
  });

  test('prefers the id reading when a value could be either', () => {
    // Contrived, but the precedence has to be stated: an exact id match is
    // never overridden by a name that happens to be spelled the same way.
    const odd = [
      { id: 'The Shire', name: 'Somewhere else' },
      { id: 'loc-2', name: 'The Shire' },
    ];
    expect(resolveLocationRef('The Shire', odd)).toBe('The Shire');
  });

  test.each([
    ['undefined', undefined],
    ['an empty string', ''],
    ['whitespace', '  '],
    ['a number', 7],
  ])('%s yields no reference', (_label, input) => {
    expect(resolveLocationRef(input as never, locations)).toBe('');
  });
});
