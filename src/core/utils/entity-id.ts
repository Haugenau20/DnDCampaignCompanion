// src/core/utils/entity-id.ts

/**
 * Slug-based, collision-safe document id generation shared by the four
 * campaign-entity contexts (NPC, Quest, Rumor, Location).
 *
 * Document ids in this app are human-readable slugs derived from an entity's
 * name/title (e.g. "Thorin Oakenshield" -> "thorin-oakenshield"), chosen for
 * readability over Firestore's opaque auto-ids. That readability is exactly
 * why two entities with different names can collide: names that differ only
 * by case, whitespace or punctuation reduce to the same slug. The create path
 * for all four entity types is `addData` -> `DocumentService.createDocument`
 * -> `setDoc`, which is a full overwrite with no existence check, so a
 * collision silently destroys the document that was already at that id.
 *
 * See bugs #002 (NPC), #004 (Quest), #009 (Location) and #012 (Rumor).
 *
 * The fix is disambiguation on collision only: an entity whose slug is free
 * keeps the clean slug unchanged (several tests assert this directly, e.g.
 * `LocationContext.bugs.test.tsx` expecting `'test-location'` and
 * `RumorContext.bugs.test.tsx` expecting `'dragon-sighting'`); only a genuine
 * collision gets a numeric suffix.
 */

/**
 * Slugify a name/title into a document-id-safe string.
 *
 * Lowercases, trims, replaces every run of non-alphanumeric characters with a
 * single hyphen, then strips any leading/trailing hyphen left over. This is
 * the exact rule all four campaign-entity contexts used inline before this
 * helper existed (`generateNPCId`, `generateQuestId`, `generateRumorId`, and
 * the inline slug in `LocationContext.createLocation`) -- extracted verbatim,
 * not rewritten, so behaviour stays identical to what they already did.
 *
 * @param name - The raw entity name or title.
 * @returns The slugified id. May be the empty string if `name` contains no
 *   alphanumeric characters at all -- callers that need a guaranteed
 *   non-empty id should use {@link generateUniqueEntityId}, which handles
 *   that case.
 */
export function slugifyEntityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
}

/**
 * Generate a document id for an entity, disambiguating only on collision.
 *
 * Computes the base slug via {@link slugifyEntityName}. If the slug is
 * already free (per `isTaken`), it is returned unchanged -- this function
 * never renames an entity whose id doesn't collide with anything. Only when
 * the base is taken does it search for the first free `${base}-2`,
 * `${base}-3`, etc.
 *
 * @param name - The raw entity name or title to derive the id from.
 * @param isTaken - Synchronous predicate returning whether a candidate id is
 *   already in use. Callers must make this check both already-persisted
 *   entities (e.g. via `getXById`) *and* ids issued earlier in the same
 *   render/session that haven't reached persisted state yet -- see the
 *   `issuedIds` ref pattern used in NPCContext/QuestContext/RumorContext/
 *   LocationContext, which exists precisely because two entities can be
 *   created within a single `act()` before the first has round-tripped
 *   through loaded state.
 * @returns A document id: the clean slug if free, a numbered variant
 *   (`${base}-2`, `${base}-3`, ...) on collision, or a random UUID if the
 *   name slugifies to an empty string (e.g. a name made up entirely of
 *   punctuation/whitespace) or if the numbered search is exhausted.
 */
export function generateUniqueEntityId(
  name: string,
  isTaken: (id: string) => boolean
): string {
  const base = slugifyEntityName(name);

  // A name made up entirely of punctuation/whitespace slugifies to '' --
  // Firestore rejects an empty document id outright, and disambiguating an
  // empty base with '-2', '-3', etc. would be meaningless. Fall back to a
  // random id instead. This mirrors the precedent already in
  // RumorContext.convertToQuest, which has fallen back to
  // crypto.randomUUID() for a title-less quest since before this helper
  // existed.
  if (!base) {
    return crypto.randomUUID();
  }

  if (!isTaken(base)) {
    return base;
  }

  // Collision: keep the clean slug's shape and disambiguate with a numeric
  // suffix, taking the first one that isn't also taken. Bounded so a
  // pathological `isTaken` (e.g. one that always returns true) can't spin
  // forever.
  const MAX_ATTEMPTS = 1000;
  for (let suffix = 2; suffix <= MAX_ATTEMPTS; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!isTaken(candidate)) {
      return candidate;
    }
  }

  // Exhausted the bounded search (extremely unlikely in practice). Fall back
  // to a random id rather than returning a colliding one.
  return crypto.randomUUID();
}
