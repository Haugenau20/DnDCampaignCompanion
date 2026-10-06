// src/features/campaign-entities/locations/utils/batch-delete.ts
import { Location, LocationChildStrategy } from '../types';
import { ancestorIdsIn, buildLocationIndex, childrenOf, descendantIdsOf } from './location-tree';

/** What deleting a selection of places does, under each answer to "what about what's inside?". */
export interface BatchDeletePlan {
  /** Places inside a ticked place, at any depth, that are not ticked themselves. */
  inside: number;
  /** Places not ticked whose parent is: what moving up moves. Their own contents travel with them. */
  movedUp: number;
  /** How many places each answer removes in all. */
  removed: Record<LocationChildStrategy, number>;
  /** The order to delete the ticked places in, for each answer. */
  order: Record<LocationChildStrategy, string[]>;
}

/**
 * Plans deleting several places at once (T017): one answer for the whole
 * selection, applied place by place.
 *
 * Each ticked place then goes through `deleteLocation`, which marks it and asks
 * the server what is inside it, so the counts here are what the confirmation
 * says, not what decides the writes.
 *
 * - **Delete everything inside**: outer places first. A ticked place inside
 *   another is then already gone with its ancestor when its own turn comes.
 * - **Move it up**: inner places first. Deleting one moves what it holds to its
 *   parent, so each place climbs until it reaches one that is not being
 *   deleted, or the top level.
 *
 * An id the list does not hold counts for nothing here but keeps its place in
 * the order (as outermost), so the server decides whether it still exists.
 *
 * @param locations The campaign's places, as this client has them
 * @param selectedIds The ticked places
 */
export function planBatchDelete(
  locations: readonly Location[],
  selectedIds: readonly string[]
): BatchDeletePlan {
  const index = buildLocationIndex(locations);
  const selected = new Set(selectedIds);
  const known = selectedIds.filter((id) => index.byId.has(id));

  const below = new Set<string>();
  known.forEach((id) => descendantIdsOf(locations, id, index).forEach((d) => below.add(d)));
  const inside = [...below].filter((id) => !selected.has(id)).length;

  const movedUp = known.reduce(
    (sum, id) => sum + childrenOf(index, id).filter((child) => !selected.has(child.id)).length,
    0
  );

  const depth = new Map(selectedIds.map((id) => [id, index.byId.has(id) ? ancestorIdsIn(index, id).length : 0]));
  const outerFirst = [...selectedIds].sort((a, b) => depth.get(a)! - depth.get(b)!);

  return {
    inside,
    movedUp,
    removed: {
      'delete-subtree': new Set([...known, ...below]).size,
      'promote-to-grandparent': known.length,
    },
    order: {
      'delete-subtree': outerFirst,
      'promote-to-grandparent': [...outerFirst].reverse(),
    },
  };
}
