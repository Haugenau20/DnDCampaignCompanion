// src/features/campaign-entities/locations/utils/location-display.ts
import { Location } from '../types';

/**
 * The pair of fields every entity that can be located carries. See the
 * `location`/`locationId` contract documented on `NPC.location` in
 * `features/campaign-entities/npcs/types.ts` (shared verbatim by `Quest` and
 * `Rumor`) for the full explanation of what each field means and when it is
 * authoritative.
 */
export interface LocationReference {
  locationId?: string;
  location?: string;
}

/**
 * Resolve a stored location reference to the name a user should see.
 *
 * Entities disagree about what they store, and about which field is
 * authoritative when both are present:
 * - NPCs and Quests historically stored the location's **id** — a slug like
 *   `mines-of-moria` — in `location` when created by the sample-data
 *   generators, but the **display name** when created through their forms.
 * - Rumors stored the display name, e.g. "Rivendell".
 * - `locationId` is now the canonical reference (see `LocationReference`
 *   above): when it is set and resolves, it wins outright, so a Location
 *   rename propagates to every entity that references it. `location` is kept
 *   as a free-text fallback for entities with no selected Location record,
 *   and as a human-readable convenience alongside `locationId` -- but it is
 *   never authoritative once `locationId` resolves.
 *
 * Resolution order:
 * 1. `locationId` set and resolves to a Location -> that Location's current
 *    `name`. This is the whole point of `locationId`: renames propagate
 *    everywhere the Location is referenced, instead of every entity needing
 *    its own copy of the name kept in sync.
 * 2. `locationId` set but resolves to nothing (the Location was deleted, or
 *    the id was never valid) -> fall through to step 3's free-text
 *    resolution; only once `location` is also empty do we surface the
 *    dangling id itself, verbatim.
 * 3. No usable `locationId` -- either never set, or dangling with `location`
 *    the only thing left to try. This is the pre-`locationId` behaviour,
 *    unchanged: both the id form and the name form are resolved here, by id
 *    first, then by a case-insensitive name match. A value matching neither
 *    is returned exactly as it came in. This branch is what keeps documents
 *    written before this contract existed working, and must not be removed.
 * 4. Neither field set -> `undefined`, so callers keep their own
 *    "Location unknown" / "--" fallback rather than this function inventing
 *    one.
 *
 * Returning an unresolved reference untouched (steps 2 and 3's tail) is the
 * deliberate part (#1412). A reference to a location that no longer exists —
 * or never did, as with the sample data's `lothlorien` — has to stay visible
 * as itself rather than be dressed up as something real. Title-casing the
 * slug instead would invent "Lothlorien" for a location that does not exist,
 * and would silently diverge from the real name the moment anyone renames a
 * location: the same broken `id === slugify(name)` assumption already
 * catalogued in #303 and #009. A dangling `locationId` gets the same
 * treatment for the same reason -- it must stay visible rather than vanish
 * or be prettified.
 *
 * Resolving by name as well as by id is what lets this be the single answer
 * for all three directories. It also canonicalises case, so an entity stored
 * as "rivendell" and one stored as "Rivendell" land in one group rather than
 * two.
 */
export const resolveLocationName = (
  reference: LocationReference,
  locations: Location[]
): string | undefined => {
  const { locationId, location } = reference;

  // Step 1 & 2: the canonical reference, and its dangling case.
  if (locationId) {
    const byId = locations.find(loc => loc.id === locationId);
    if (byId) {
      return byId.name;
    }

    if (!location) {
      return locationId;
    }
  }

  // Step 3: the free-text fallback, exactly as this function behaved before
  // `locationId` existed.
  if (location) {
    const byId = locations.find(loc => loc.id === location);
    if (byId) {
      return byId.name;
    }

    const byName = locations.find(
      loc => loc.name.toLowerCase() === location.toLowerCase()
    );

    return byName ? byName.name : location;
  }

  // Step 4: nothing to resolve.
  return undefined;
};

/**
 * Whether a location reference points at `location`, canonically or via the
 * legacy free-text fallback.
 *
 * Shared by `NPCContext.getNPCsByLocation` and `QuestContext.getQuestsByLocation`
 * so the id/legacy fallback logic exists in exactly one place rather than
 * being hand-rolled twice. Matches `reference.locationId` first when set --
 * against `location.id` only, nothing else, since a canonical reference
 * either names that Location or it doesn't. Otherwise falls back to a
 * case-insensitive comparison of the legacy `location` text against
 * *either* `location.id` or `location.name`.
 *
 * The fallback checks both because `resolveLocationName`'s step 3 -- the
 * behaviour this preserves for un-migrated documents -- accepts both: NPCs
 * and Quests wrote the location's id into `location` when created by the
 * sample-data generators, but its display name when created through their
 * forms. A caller here has only the id form of "which location", so this
 * takes the whole `Location` record (not a bare id) precisely so it can
 * check the legacy field against both of that Location's identifying
 * strings -- resolving a name back to an id would need the full locations
 * array to search, which not every caller has (`NPCContext` is one: it is
 * mounted outside `LocationProvider`, so `useLocations()` isn't available to
 * it).
 *
 * This is a narrower question than `resolveLocationName` answers -- "does
 * this reference identify this location?" rather than "what should I print
 * for this reference?" -- so it does not reuse that function directly, but
 * shares its two-field input shape and its id-first-then-legacy-text
 * priority.
 */
export const referencesLocation = (
  reference: LocationReference,
  location: Location
): boolean => {
  if (reference.locationId) {
    return reference.locationId === location.id;
  }

  if (!reference.location) {
    return false;
  }

  const legacy = reference.location.toLowerCase();
  return legacy === location.id.toLowerCase() || legacy === location.name.toLowerCase();
};
