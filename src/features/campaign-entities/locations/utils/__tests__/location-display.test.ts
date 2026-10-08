// src/features/campaign-entities/locations/utils/__tests__/location-display.test.ts
import {
  resolveLocation,
  resolveLocationName,
  referencesLocation,
  indexLocationNames,
  resolveKeyPlace,
  keyPlaceIsLocation,
} from '../location-display';
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
  // T079: the free text is what a player wrote, shown as written. It used to
  // be looked up as an id and then a name, for documents written before
  // `locationId`; production has none left.
  test('shows free text as written, even when it reads like the id of a place', () => {
    expect(resolveLocationName({ location: 'mines-of-moria' }, locations)).toBe('mines-of-moria');
  });

  test('shows free text as written, even in another case than the name of a place', () => {
    expect(resolveLocationName({ location: 'rivendell' }, locations)).toBe('rivendell');
    expect(resolveLocationName({ location: 'Somewhere in Mirkwood' }, locations)).toBe(
      'Somewhere in Mirkwood'
    );
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

// T101: a roster resolves one reference per row; an index turns each from a
// search of every place into a lookup. It must give the same answer.
describe('resolveLocationName with an index', () => {
  const collidingName = makeLocation({ id: 'bree', name: 'rivendell' });
  const duplicateName = makeLocation({ id: 'rivendell-2', name: 'RIVENDELL' });
  const sets: Location[][] = [
    [],
    locations,
    [moria, rivendell, collidingName],
    [rivendell, duplicateName, moria],
    [duplicateName, rivendell],
  ];
  const references = [
    {},
    { location: 'mines-of-moria' },
    { location: 'Rivendell' },
    { location: 'rivendell' },
    { location: 'RIVENDELL' },
    { location: 'bree' },
    { location: 'Lothlorien' },
    { locationId: 'rivendell' },
    { locationId: 'rivendell', location: 'Mines of Moria' },
    { locationId: 'gone', location: 'rivendell' },
    { locationId: 'gone' },
  ];

  test.each(sets.map((set, i) => [i, set] as const))(
    'answers as the array does (set %i)',
    (_i, set) => {
      const index = indexLocationNames(set);
      for (const reference of references) {
        expect(resolveLocationName(reference, index)).toBe(resolveLocationName(reference, set));
      }
    }
  );
});

// #1421: a page that links to the place needs the record, not just its name.
describe('resolveLocation', () => {
  test('returns the record a resolving locationId names, whatever the free text says', () => {
    expect(resolveLocation({ locationId: 'rivendell', location: 'Mines of Moria' }, locations)).toBe(
      rivendell
    );
  });

  test('follows a rename: the id still finds the record under its new name', () => {
    const renamed = makeLocation({ id: 'rivendell', name: 'Imladris' });
    expect(resolveLocation({ locationId: 'rivendell', location: 'Rivendell' }, [renamed])).toBe(
      renamed
    );
  });

  // T079: free text names no record, even when it reads like one.
  test('never finds a record from the free text', () => {
    expect(resolveLocation({ location: 'mines-of-moria' }, locations)).toBeUndefined();
    expect(resolveLocation({ location: 'Rivendell' }, locations)).toBeUndefined();
  });

  test('a locationId that no longer resolves is not rescued by the free text', () => {
    expect(resolveLocation({ locationId: 'gone', location: 'Rivendell' }, locations)).toBeUndefined();
  });

  test('returns nothing for a reference that names no record', () => {
    expect(resolveLocation({ location: 'Lothlorien' }, locations)).toBeUndefined();
    expect(resolveLocation({ locationId: 'gone' }, locations)).toBeUndefined();
    expect(resolveLocation({}, locations)).toBeUndefined();
  });

  test('answers the same from an index as from the array', () => {
    const index = indexLocationNames(locations);
    for (const reference of [
      { locationId: 'rivendell' },
      { location: 'rivendell' },
      { locationId: 'gone', location: 'mines-of-moria' },
      { location: 'Lothlorien' },
    ]) {
      expect(resolveLocation(reference, index)).toBe(resolveLocation(reference, locations));
    }
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

  // T079: free text never places a record anywhere, whatever it reads like.
  test('free text matching the id or name of the location does not reference it', () => {
    expect(referencesLocation({ location: 'mines-of-moria' }, moria)).toBe(false);
    expect(referencesLocation({ location: 'Mines of Moria' }, moria)).toBe(false);
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

// #1421: a place inside a quest is still looked up by name. Places added
// before then stored no id, and T079's audit did not read them.
describe('resolveKeyPlace', () => {
  test('finds the location its stored id names, whatever it is called', () => {
    expect(resolveKeyPlace({ name: 'The old mine', locationId: 'mines-of-moria' }, locations)).toBe(moria);
  });

  test('finds a location by the name of the place, case-insensitively, when no id was stored', () => {
    expect(resolveKeyPlace({ name: 'RIVENDELL' }, locations)).toBe(rivendell);
  });

  test('finds a location by id before by name', () => {
    const confusing = [makeLocation({ id: 'Rivendell', name: 'The Last Homely House' }), rivendell];
    expect(resolveKeyPlace({ name: 'Rivendell' }, confusing)).toBe(confusing[0]);
  });

  test('falls back to the name when the stored id names no location', () => {
    expect(resolveKeyPlace({ name: 'Rivendell', locationId: 'gone' }, locations)).toBe(rivendell);
  });

  test('finds nothing for a place that is no location', () => {
    expect(resolveKeyPlace({ name: 'Secret door' }, locations)).toBeUndefined();
  });
});

describe('keyPlaceIsLocation', () => {
  test('by the stored id, and only by it when there is one', () => {
    expect(keyPlaceIsLocation({ name: 'Anything', locationId: 'mines-of-moria' }, moria)).toBe(true);
    expect(keyPlaceIsLocation({ name: 'Mines of Moria', locationId: 'rivendell' }, moria)).toBe(false);
  });

  test('by name or id, case-insensitively, when no id was stored', () => {
    expect(keyPlaceIsLocation({ name: 'MINES OF MORIA' }, moria)).toBe(true);
    expect(keyPlaceIsLocation({ name: 'mines-of-moria' }, moria)).toBe(true);
    expect(keyPlaceIsLocation({ name: 'Rivendell' }, moria)).toBe(false);
  });
});
