// src/features/campaign-entities/locations/utils/location-display.ts
import { Location } from '../types';

/**
 * Resolve a stored location reference to the name a user should see.
 *
 * Entities disagree about what their `location` field holds. NPCs and Quests
 * store the location's **id** — a slug like `mines-of-moria` — while Rumors
 * store its **display name**, "Rivendell". Both forms therefore arrive here, and
 * both are resolved: by id first, then by a case-insensitive name match. A value
 * matching neither is returned exactly as it came in.
 *
 * Returning the raw value untouched is the deliberate part (#1412). A reference
 * to a location that no longer exists — or never did, as with the sample data's
 * `lothlorien` — has to stay visible as itself rather than be dressed up as
 * something real. Title-casing the slug instead would invent "Lothlorien" for a
 * location that does not exist, and would silently diverge from the real name
 * the moment anyone renames a location: the same broken `id === slugify(name)`
 * assumption already catalogued in #303 and #009.
 *
 * Resolving by name as well as by id is what lets this be the single answer for
 * all three directories. It also canonicalises case, so an entity stored as
 * "rivendell" and one stored as "Rivendell" land in one group rather than two.
 */
export const resolveLocationName = (
  reference: string,
  locations: Location[]
): string => {
  const byId = locations.find(location => location.id === reference);
  if (byId) {
    return byId.name;
  }

  const byName = locations.find(
    location => location.name.toLowerCase() === reference.toLowerCase()
  );

  return byName ? byName.name : reference;
};
