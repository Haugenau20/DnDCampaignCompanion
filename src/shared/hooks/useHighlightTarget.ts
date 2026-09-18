// src/shared/hooks/useHighlightTarget.ts
import { useEffect, useMemo, useRef } from "react";

/**
 * How far a parent walk may climb before it gives up.
 *
 * A visited set stops a *cycle*; this stops the other way a walk can hang, a
 * pathologically deep chain. No real campaign nests places this far.
 */
export const HIGHLIGHT_DEPTH_CAP = 64;

export interface HighlightAccessors<T> {
  idOf: (item: T) => string;
  /** Omitted for a flat collection, which has no ancestors to reveal. */
  parentIdOf?: (item: T) => string | undefined;
}

/**
 * Every ancestor of `id`, nearest first.
 *
 * Carries a visited set and a depth cap. `PERF-11`, tracked as T033, reports
 * that `LocationDirectory`'s parent walk had neither -- repeated
 * `locations.find` inside a `while (current?.parentId)` -- so a node inside a
 * parent cycle never terminated. Every traversal this phase adds or touches
 * goes through here.
 *
 * A parent that no longer exists ends the walk after being reported: the id is
 * what the record actually says, and swallowing it would hide the dangling
 * reference from the caller.
 */
export function ancestorIdsOf<T>(
  items: readonly T[],
  id: string,
  { idOf, parentIdOf }: HighlightAccessors<T>
): string[] {
  if (!parentIdOf) return [];

  const byId = new Map(items.map((item) => [idOf(item), item]));
  const ancestors: string[] = [];
  const visited = new Set<string>([id]);

  let current = byId.get(id);
  while (current && ancestors.length < HIGHLIGHT_DEPTH_CAP) {
    const parentId = parentIdOf(current);
    if (!parentId || visited.has(parentId)) {
      // Either the top of the tree, or an edge that leads somewhere already
      // walked -- a cycle. Both end the climb.
      if (parentId && visited.has(parentId)) ancestors.push(parentId);
      break;
    }
    ancestors.push(parentId);
    visited.add(parentId);
    current = byId.get(parentId);
  }

  return ancestors;
}

export interface HighlightTarget {
  /** What `?highlight=` named, if it resolves to a record. */
  highlightedId: string | null;
  /** The target plus every ancestor needed to reveal it, target first. */
  idsToReveal: string[];
}

/**
 * Resolve `?highlight=` against a collection.
 *
 * **Matches by id only.** Two of the four directories also matched the record's
 * *name*, which is why a renamed location stopped answering its own links. Ids
 * survive a rename; names do not. Dropping name-matching is a behavioural
 * change and is recorded on T014.
 */
export function resolveHighlightTarget<T>(
  items: readonly T[],
  highlight: string | null | undefined,
  accessors: HighlightAccessors<T>
): HighlightTarget {
  if (!highlight) return { highlightedId: null, idsToReveal: [] };

  const found = items.find((item) => accessors.idOf(item) === highlight);
  if (!found) return { highlightedId: null, idsToReveal: [] };

  return {
    highlightedId: highlight,
    // Deduplicated: when the walk closes a cycle it reports the edge that led
    // back, which can be the target itself. Revealing an id twice is harmless
    // but the list is handed to callers that build `Set`s and count things.
    idsToReveal: Array.from(
      new Set([highlight, ...ancestorIdsOf(items, highlight, accessors)])
    ),
  };
}

export interface UseHighlightTargetOptions<T> extends HighlightAccessors<T> {
  items: readonly T[];
  /**
   * The `?highlight=` value, read by the caller.
   *
   * Passed in rather than read here: every directory already holds a
   * navigation hook, and reaching for one of the two `useNavigation` modules
   * from inside this hook would make it depend on a path its callers do not
   * all use -- and would make every consuming suite mock it.
   */
  highlight: string | null | undefined;
  /**
   * The element id prefix a row renders, e.g. `"npc"` for `npc-<id>`. The
   * target is brought into view once it exists.
   */
  domIdPrefix: string;
  /** Called once per resolved target with everything that must be revealed. */
  onReveal?: (idsToReveal: string[]) => void;
}

/**
 * The one reading of `?highlight=`, shared by all four directories.
 *
 * T014 measured four different readings: two matched by id *or* name and
 * auto-expanded ancestors, one was id-only with no expansion, and one set a
 * prop and did nothing else, so a highlighted quest could sit off screen. The
 * contract, from `00-entity-authoring.md` §9, is one behaviour:
 *
 * - match by **id**;
 * - expand the target and every ancestor needed to reveal it;
 * - bring it into view;
 * - do not clear the parameter on unrelated state changes.
 *
 * `/story` still reads nothing at all, and stays that way -- noted on T014.
 */
export function useHighlightTarget<T>({
  items,
  highlight,
  idOf,
  parentIdOf,
  domIdPrefix,
  onReveal,
}: UseHighlightTargetOptions<T>): HighlightTarget {
  const target = useMemo(
    () => resolveHighlightTarget(items, highlight, { idOf, parentIdOf }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, highlight]
  );

  /**
   * Which target has already been revealed.
   *
   * The parameter is deliberately *not* cleared, so this effect must not fire
   * again every time the collection re-renders -- that would re-expand a row
   * the user had since collapsed, and fight them for the scroll position.
   */
  const revealedRef = useRef<string | null>(null);

  useEffect(() => {
    const { highlightedId, idsToReveal } = target;
    if (!highlightedId || revealedRef.current === highlightedId) return;
    revealedRef.current = highlightedId;

    onReveal?.(idsToReveal);

    // The row has to exist before it can be scrolled to, and it is rendered by
    // the same state change this effect just requested.
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`${domIdPrefix}-${highlightedId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, domIdPrefix]);

  return target;
}

export default useHighlightTarget;
