// src/features/campaign-entities/locations/utils/__tests__/location-display.test.ts
import { resolveLocationName, referencesLocation } from '../location-display';
import { Location } from '../../types';

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'mines-of-moria',
    name: 'Mines of Moria',
    type: 'dungeon',
    status: 'explored',
    description: 'A dwarven realm beneath the Misty Mountains',
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

const moria = makeLocation();
const rivendell = makeLocation({ id: 'rivendell', name: 'Rivendell', type: 'city' });
const locations = [moria, rivendell];

describe('resolveLocationName', () => {
  // NPCs and Quests store the id in `location` for un-migrated documents.
  test('resolves an id to its display name', () => {
    expect(resolveLocationName({ location: 'mines-of-moria' }, locations)).toBe('Mines of Moria');
  });

  // Rumors store the name in `location` for un-migrated documents.
  test('passes a name that already matches straight through', () => {
    expect(resolveLocationName({ location: 'Rivendell' }, locations)).toBe('Rivendell');
  });

  test('canonicalises the case of a name match, so one place is one group', () => {
    expect(resolveLocationName({ location: 'rivendell' }, locations)).toBe('Rivendell');
    expect(resolveLocationName({ location: 'RIVENDELL' }, locations)).toBe('Rivendell');
  });

  test('prefers an id match over a name match, within `location` alone', () => {
    // A record whose id collides with another's name must resolve by id.
    const confusing = [
      makeLocation({ id: 'Rivendell', name: 'The Last Homely House' }),
      rivendell,
    ];
    expect(resolveLocationName({ location: 'Rivendell' }, confusing)).toBe('The Last Homely House');
  });

  // The point of #1412's "do not prettify" note: an unresolvable reference has
  // to stay visible as itself rather than be dressed up as something real.
  test('returns an unresolvable `location` verbatim, never title-cased', () => {
    expect(resolveLocationName({ location: 'lothlorien' }, locations)).toBe('lothlorien');
    expect(resolveLocationName({ location: 'lothlorien' }, locations)).not.toBe('Lothlorien');
  });

  test('returns `location` verbatim when there are no locations at all', () => {
    expect(resolveLocationName({ location: 'mines-of-moria' }, [])).toBe('mines-of-moria');
  });

  // --- locationId: the canonical reference introduced by this contract ---

  test('a resolving `locationId` wins over a conflicting `location`', () => {
    expect(
      resolveLocationName({ locationId: 'rivendell', location: 'Mines of Moria' }, locations)
    ).toBe('Rivendell');
  });

  test('a resolving `locationId` alone (no `location`) resolves normally', () => {
    expect(resolveLocationName({ locationId: 'mines-of-moria' }, locations)).toBe('Mines of Moria');
  });

  test('a dangling `locationId` falls back to a usable `location`', () => {
    expect(
      resolveLocationName({ locationId: 'does-not-exist', location: 'Rivendell' }, locations)
    ).toBe('Rivendell');
  });

  test('a dangling `locationId` with no usable `location` shows the raw id, verbatim', () => {
    expect(resolveLocationName({ locationId: 'does-not-exist' }, locations)).toBe('does-not-exist');
    expect(
      resolveLocationName({ locationId: 'does-not-exist', location: '' }, locations)
    ).toBe('does-not-exist');
  });

  test('neither field set returns undefined, leaving the caller\'s own fallback in place', () => {
    expect(resolveLocationName({}, locations)).toBeUndefined();
    expect(resolveLocationName({ location: '' }, locations)).toBeUndefined();
  });
});

describe('referencesLocation', () => {
  test('matches by locationId, canonically', () => {
    expect(referencesLocation({ locationId: 'mines-of-moria' }, moria)).toBe(true);
  });

  test('a locationId set does not fall back to `location` even if it would have matched', () => {
    // A canonical reference is the whole answer -- it is not merged with
    // `location`, even when `location` disagrees or would also have matched.
    expect(referencesLocation({ locationId: 'rivendell', location: 'Mines of Moria' }, moria)).toBe(false);
  });

  test('legacy document storing the id matches (the sample-data generator shape)', () => {
    expect(referencesLocation({ location: 'mines-of-moria' }, moria)).toBe(true);
  });

  test('legacy document storing the display name matches (the form-created shape)', () => {
    expect(referencesLocation({ location: 'Mines of Moria' }, moria)).toBe(true);
    expect(referencesLocation({ location: 'MINES OF MORIA' }, moria)).toBe(true);
  });

  test('does not match an unrelated location', () => {
    expect(referencesLocation({ locationId: 'mines-of-moria' }, rivendell)).toBe(false);
    expect(referencesLocation({ location: 'mines-of-moria' }, rivendell)).toBe(false);
    expect(referencesLocation({ location: 'Mines of Moria' }, rivendell)).toBe(false);
  });

  test('neither field set does not match', () => {
    expect(referencesLocation({}, moria)).toBe(false);
  });
});
