// src/features/campaign-entities/locations/utils/location-presentation.ts
import type { RosterStatusTone } from 'core/components/Roster';
import { Location, LocationStatus, LocationType } from '../types';

/**
 * How a location says what it is, in one place.
 *
 * Shared by the directory tree and `/locations/:locationId` so the two cannot
 * disagree about what "poi" is called or which end of the knowledge ladder is
 * which. They already did once: the ladder shipped with `visited` above
 * `explored`, which reads backwards.
 */

/** Human-readable location type. `poi` is the one that is not just capitalised. */
export const formatLocationType = (type: LocationType): string => {
  if (type === 'poi') return 'Point of Interest';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

/**
 * Location state, ranked best to worst: explored, then visited, then known.
 *
 * That ordering is the maintainer's and it inverts what shipped -- you have
 * covered more ground in a place you explored than in one you merely passed
 * through.
 *
 * Locations take ramp stops 0, 1 and 2 and never reach the red. Every other
 * ranked scale ends there because a quest can fail, a rumour can be disproved
 * and an NPC can die; a place you have merely heard of is only the least of
 * three degrees of familiarity.
 */
export const STATUS_ORDER: { key: LocationStatus; colorClass: string }[] = [
  { key: 'explored', colorClass: 'bg-valence-0' },
  { key: 'visited', colorClass: 'bg-valence-1' },
  { key: 'known', colorClass: 'bg-valence-2' },
];

export const STATUS_TONE: Record<LocationStatus, RosterStatusTone> = {
  explored: 'valence-0',
  visited: 'valence-1',
  known: 'valence-2',
};

/**
 * The knowledge ladder: known -> explored -> visited. Never a verdict.
 *
 * No `selectedClassName`. `15-3` gave these steps `knowledge-0/1/2`, which no
 * stylesheet defines -- the ladder had *looked* right because
 * `chip-toggle-selected` was doing all the work and the extra class was inert.
 * The class manifest checks that every class the theme defines is applied; it
 * cannot check the other direction without flagging every Tailwind utility, so
 * nothing caught it. `ladder-classes.test.ts` now does.
 *
 * Nothing replaces them, because nothing should: §10 says knowledge is a
 * ladder, not a verdict, and the reference shows the selected step as the same
 * neutral chip every other ladder uses.
 */
export const KNOWLEDGE_OPTIONS: Array<{ value: LocationStatus; label: string }> = [
  { value: 'known', label: 'Known' },
  { value: 'explored', label: 'Explored' },
  { value: 'visited', label: 'Visited' },
];

/** Sentence-case a stored knowledge step for display. */
export const formatLocationStatus = (status: LocationStatus): string =>
  status.charAt(0).toUpperCase() + status.slice(1);

/**
 * The one line under a location's name on its page: what it is, where it sits,
 * what is inside it, and when it was last visited.
 *
 * Only what exists. A place with no parent and nothing inside says "City" and
 * stops, rather than "City in nowhere · 0 places inside".
 */
export function locationMetaLine(
  location: Location,
  parentName: string | undefined,
  insideCount: number,
  lastVisited?: string
): string {
  const what = parentName
    ? `${formatLocationType(location.type)} in ${parentName}`
    : formatLocationType(location.type);

  return [
    what,
    insideCount > 0
      ? `${insideCount} place${insideCount === 1 ? '' : 's'} inside`
      : undefined,
    lastVisited ? `last visited ${lastVisited}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}
