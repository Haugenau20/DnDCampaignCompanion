// src/core/utils/__tests__/entity-id.test.ts

import { slugifyEntityName, generateUniqueEntityId } from '../entity-id';

describe('entity-id', () => {
  describe('slugifyEntityName', () => {
    test('lowercases and hyphenates a simple name', () => {
      expect(slugifyEntityName('Thorin Oakenshield')).toBe('thorin-oakenshield');
    });

    test('collapses whitespace variants onto the same slug', () => {
      expect(slugifyEntityName('Rescue the Princess')).toBe('rescue-the-princess');
      expect(slugifyEntityName('  Rescue   the   Princess  ')).toBe('rescue-the-princess');
    });

    test('collapses case variants onto the same slug', () => {
      expect(slugifyEntityName('Test Location')).toBe('test-location');
      expect(slugifyEntityName('TEST LOCATION')).toBe('test-location');
    });

    test('strips punctuation, including differing amounts of trailing punctuation', () => {
      expect(slugifyEntityName('Save the Village!')).toBe('save-the-village');
      expect(slugifyEntityName('Save the Village!!!')).toBe('save-the-village');
    });

    test('returns an empty string for a name with no alphanumeric characters', () => {
      expect(slugifyEntityName('!!!')).toBe('');
      expect(slugifyEntityName('   ')).toBe('');
    });
  });

  describe('generateUniqueEntityId', () => {
    test('returns the clean slug when it is free', () => {
      const isTaken = jest.fn().mockReturnValue(false);
      expect(generateUniqueEntityId('Test Location', isTaken)).toBe('test-location');
      expect(isTaken).toHaveBeenCalledWith('test-location');
    });

    test('does not rename an entity whose slug has no collision', () => {
      // Guards against a scheme that suffixes every id regardless of
      // collision -- several marker tests assert the *first* id created is
      // still the clean slug (e.g. 'test-location', 'dragon-sighting').
      const isTaken = () => false;
      expect(generateUniqueEntityId('Dragon Sighting', isTaken)).toBe('dragon-sighting');
    });

    test('appends -2 on the first collision', () => {
      const taken = new Set(['thorin-oakenshield']);
      const isTaken = (id: string) => taken.has(id);
      expect(generateUniqueEntityId('THORIN OAKENSHIELD', isTaken)).toBe('thorin-oakenshield-2');
    });

    test('appends -3 when -2 is also taken', () => {
      const taken = new Set(['thorin-oakenshield', 'thorin-oakenshield-2']);
      const isTaken = (id: string) => taken.has(id);
      expect(generateUniqueEntityId('Thorin Oakenshield', isTaken)).toBe('thorin-oakenshield-3');
    });

    test('keeps searching past several taken suffixes', () => {
      const taken = new Set([
        'save-the-village',
        'save-the-village-2',
        'save-the-village-3',
        'save-the-village-4',
      ]);
      const isTaken = (id: string) => taken.has(id);
      expect(generateUniqueEntityId('Save the Village', isTaken)).toBe('save-the-village-5');
    });

    test('case, whitespace and punctuation variants all collide onto the same base and disambiguate in sequence', () => {
      const issued = new Set<string>();
      const isTaken = (id: string) => issued.has(id);

      const names = [
        'Save the Village',
        'SAVE THE VILLAGE',
        '  Save   the   Village  ',
        'Save the Village!!!',
      ];

      const ids = names.map(name => {
        const id = generateUniqueEntityId(name, isTaken);
        issued.add(id);
        return id;
      });

      expect(ids).toEqual([
        'save-the-village',
        'save-the-village-2',
        'save-the-village-3',
        'save-the-village-4',
      ]);
      // All unique
      expect(new Set(ids).size).toBe(ids.length);
    });

    test('falls back to a random id when the name has no alphanumeric characters', () => {
      const isTaken = jest.fn().mockReturnValue(false);
      const id = generateUniqueEntityId('!!!', isTaken);

      // A UUID, not a slug -- and isTaken should never be consulted for an
      // empty base, since there's nothing meaningful to disambiguate.
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(isTaken).not.toHaveBeenCalled();
    });

    test('falls back to a random id when whitespace-only name slugifies to empty', () => {
      const isTaken = jest.fn().mockReturnValue(false);
      const id = generateUniqueEntityId('   ', isTaken);
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    });

    test('gives up and returns a random id if the numbered search is exhausted', () => {
      // Pathological isTaken that always reports a collision -- proves the
      // loop is bounded rather than spinning forever.
      const isTaken = () => true;
      const id = generateUniqueEntityId('Always Taken', isTaken);
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    });
  });
});
