// src/features/campaign-entities/locations/utils/location-tree.ts
import { ancestorIdsOf, HIGHLIGHT_DEPTH_CAP } from 'shared/hooks/useHighlightTarget';
import { Location } from '../types';

/**
 * Every walk over the location tree, in one place and guarded.
 *
 * `PERF-11` (T033) reports that `LocationDirectory`'s parent walk had no
 * visited set, so a node inside a parent cycle never terminated. `15-4` makes
 * cycles *reachable* -- until now nothing in the product could choose a
 * parent, so a cycle could only arrive through hand-edited data -- which is
 * why `15-4` item 5 makes the guard a gate rather than a nicety.
 *
 * The rule this module exists to enforce: **no traversal here recurses
 * without a visited set, and none climbs or descends past
 * `HIGHLIGHT_DEPTH_CAP`.** The cap is `15-3`'s, imported rather than
 * redeclared -- two caps that could drift apart would be the same defect in a
 * quieter form.
 *
 * `parentId` is stored as `''` by both the form and quick add (Firestore
 * rejects `undefined`), so "no parent" has two spellings and every function
 * here treats them alike. A `parentId` naming a location that is not loaded is
 * a *dangling* reference, not a root: `rootsOf` leaves those out so the
 * directory can show them under "Unplaced" rather than silently promoting them
 * to the top level.
 */

/** A location's parent id, with `''` and `undefined` normalised to `undefined`. */
export const parentIdOf = (location: Location): string | undefined =>
  location.parentId ? location.parentId : undefined;

export interface LocationIndex {
  byId: Map<string, Location>;
  /** Direct children, keyed by parent id. Roots are not in here. */
  children: Map<string, Location[]>;
  /** Locations with no parent at all. */
  roots: Location[];
  /** Locations whose `parentId` names something that is not loaded. */
  orphans: Location[];
}

/**
 * Index a collection once, so the walks below are map lookups rather than
 * repeated `locations.find` -- which is the other half of what `PERF-11`
 * measured.
 *
 * Deliberately keyed by a `Map` rather than a plain object with a `'root'`
 * sentinel, which is what the directory did before. A campaign containing a
 * location whose id is literally `root` collided with that sentinel and had
 * its children silently adopted by the top level.
 */
export function buildLocationIndex(locations: readonly Location[]): LocationIndex {
  const byId = new Map<string, Location>();
  locations.forEach((location) => byId.set(location.id, location));

  const children = new Map<string, Location[]>();
  const roots: Location[] = [];
  const orphans: Location[] = [];

  locations.forEach((location) => {
    const parent = parentIdOf(location);
    if (!parent) {
      roots.push(location);
      return;
    }
    if (!byId.has(parent)) {
      orphans.push(location);
      return;
    }
    const bucket = children.get(parent);
    if (bucket) bucket.push(location);
    else children.set(parent, [location]);
  });

  return { byId, children, roots, orphans };
}

/** The direct children of `id`, in the order the collection holds them. */
export const childrenOf = (index: LocationIndex, id: string): Location[] =>
  index.children.get(id) ?? [];

/**
 * The chain from the outermost ancestor down to `id`'s parent.
 *
 * Built on `15-3`'s `ancestorIdsOf`, which carries the visited set and the cap;
 * this only resolves the ids and reverses them, because a breadcrumb reads
 * outermost-first while a parent walk produces nearest-first.
 *
 * An id the walk reports but the collection does not hold -- a dangling
 * `parentId` -- contributes nothing to the path rather than a placeholder. The
 * breadcrumb is a list of places you can open, and that is not one.
 *
 * The walk deliberately *reports* the edge that closes a cycle, so its caller
 * can see the reference the record holds. A breadcrumb is not that caller: a
 * path reading "A > B > A > here" states a containment that cannot be true and
 * offers the reader the place they are already in. Repeats, and the location
 * itself, are dropped here rather than in the walk.
 */
export function ancestorPathOf(
  locations: readonly Location[],
  id: string
): Location[] {
  const byId = new Map(locations.map((location) => [location.id, location]));
  const seen = new Set<string>([id]);

  return ancestorIdsOf(locations, id, {
    idOf: (location) => location.id,
    parentIdOf,
  })
    .filter((ancestorId) => {
      if (seen.has(ancestorId)) return false;
      seen.add(ancestorId);
      return true;
    })
    .map((ancestorId) => byId.get(ancestorId))
    .filter((location): location is Location => Boolean(location))
    .reverse();
}

/**
 * Every location below `id`, at any depth.
 *
 * Breadth-first with its own visited set: a cycle reached through the
 * *children* map hangs quite independently of the parent walk, and this is the
 * traversal the descendant exclusion in `Move elsewhere` depends on. If it
 * hangs, so does the tray that is supposed to be preventing the cycle.
 */
export function descendantIdsOf(
  locations: readonly Location[],
  id: string,
  index: LocationIndex = buildLocationIndex(locations)
): string[] {
  const out: string[] = [];
  const visited = new Set<string>([id]);
  let frontier = childrenOf(index, id);
  let depth = 0;

  while (frontier.length && depth < HIGHLIGHT_DEPTH_CAP) {
    const next: Location[] = [];
    frontier.forEach((child) => {
      if (visited.has(child.id)) return;
      visited.add(child.id);
      out.push(child.id);
      next.push(...childrenOf(index, child.id));
    });
    frontier = next;
    depth += 1;
  }

  return out;
}

/**
 * Every location below `id`, deepest first: for each direct child, its own
 * descendants and then the child itself.
 *
 * The ordering `deleteLocation` needs, and the ordering bug #010 was filed
 * about -- a parent must never be removed from the database before any of its
 * descendants. Depth-first post-order rather than a reversed breadth-first
 * walk, because both satisfy that guarantee but only this one preserves the
 * sequence the fix for #010 established, and its suite asserts the sequence.
 *
 * Guarded like every other walk here: the recursion this replaces had neither
 * a visited set nor a cap, so a parent cycle never terminated.
 */
export function descendantIdsDeepestFirst(
  locations: readonly Location[],
  id: string,
  index: LocationIndex = buildLocationIndex(locations)
): string[] {
  const visited = new Set<string>([id]);

  const walk = (parentId: string, depth: number): string[] => {
    if (depth > HIGHLIGHT_DEPTH_CAP) return [];
    return childrenOf(index, parentId).flatMap((child) => {
      if (visited.has(child.id)) return [];
      visited.add(child.id);
      return [...walk(child.id, depth + 1), child.id];
    });
  };

  return walk(id, 0);
}

/** The locations sharing `id`'s parent, `id` itself excluded. */
export function siblingsOf(
  locations: readonly Location[],
  id: string,
  index: LocationIndex = buildLocationIndex(locations)
): Location[] {
  const self = index.byId.get(id);
  if (!self) return [];

  const parent = parentIdOf(self);
  const family = parent ? childrenOf(index, parent) : index.roots;
  return family.filter((location) => location.id !== id);
}

/**
 * The parents `id` may never be given: itself, and everything inside it.
 *
 * `15-4` item 3: an invalid choice must be **unofferable**, not quietly
 * discarded. `LocationCombobox` accepts any value and `LocationEditForm` then
 * blanks a parent that fails validation, so a user who picks a descendant is
 * told nothing and loses the parent the record already had.
 */
export function invalidParentIdsFor(
  locations: readonly Location[],
  id: string,
  index: LocationIndex = buildLocationIndex(locations)
): string[] {
  return [id, ...descendantIdsOf(locations, id, index)];
}

/**
 * Whether making `nextParentId` the parent of `id` would close a cycle.
 *
 * The belt to the tray's braces. The tray cannot offer an invalid parent, but
 * the write is also reachable from anywhere holding the context, and a cycle
 * written once poisons every walk over that campaign's data for everyone.
 */
export function wouldCreateCycle(
  locations: readonly Location[],
  id: string,
  nextParentId: string | undefined
): boolean {
  if (!nextParentId) return false;
  if (nextParentId === id) return true;
  return descendantIdsOf(locations, id).includes(nextParentId);
}

/** How many places sit directly inside `id`. */
export const insideCountOf = (index: LocationIndex, id: string): number =>
  childrenOf(index, id).length;

/**
 * The path shown beside a search hit, outermost first: "in Beleriand ·
 * Gondolin".
 *
 * §6.1: search flattens the tree, because a filtered tree with orphaned
 * parents is unreadable -- so each hit has to say where it sits, or the flat
 * list is a list of names with no context.
 */
export function pathLabelOf(
  locations: readonly Location[],
  id: string
): string {
  return ancestorPathOf(locations, id)
    .map((ancestor) => ancestor.name)
    .join(' · ');
}
