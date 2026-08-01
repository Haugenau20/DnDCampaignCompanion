// src/features/campaign-entities/locations/utils/__tests__/location-display.test.ts
import { resolveLocationName } from '../location-display';
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
  // NPCs and Quests store the id.
  test('resolves an id to its display name', () => {
    expect(resolveLocationName('mines-of-moria', locations)).toBe('Mines of Moria');
  });

  // Rumors store the name.
  test('passes a name that already matches straight through', () => {
    expect(resolveLocationName('Rivendell', locations)).toBe('Rivendell');
  });

  test('canonicalises the case of a name match, so one place is one group', () => {
    expect(resolveLocationName('rivendell', locations)).toBe('Rivendell');
    expect(resolveLocationName('RIVENDELL', locations)).toBe('Rivendell');
  });

  test('prefers an id match over a name match', () => {
    // A record whose id collides with another's name must resolve by id.
    const confusing = [
      makeLocation({ id: 'Rivendell', name: 'The Last Homely House' }),
      rivendell,
    ];
    expect(resolveLocationName('Rivendell', confusing)).toBe('The Last Homely House');
  });

  // The point of #1412's "do not prettify" note: an unresolvable reference has
  // to stay visible as itself rather than be dressed up as something real.
  test('returns an unresolvable reference verbatim, never title-cased', () => {
    expect(resolveLocationName('lothlorien', locations)).toBe('lothlorien');
    expect(resolveLocationName('lothlorien', locations)).not.toBe('Lothlorien');
  });

  test('returns the reference verbatim when there are no locations at all', () => {
    expect(resolveLocationName('mines-of-moria', [])).toBe('mines-of-moria');
  });
});
