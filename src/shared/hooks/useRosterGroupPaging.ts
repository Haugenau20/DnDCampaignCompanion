// src/shared/hooks/useRosterGroupPaging.ts
import { useCallback, useEffect, useState } from 'react';
import { ROSTER_PAGE_SIZE, limitReaching } from 'shared/utils/roster-paging';

/** What a status-grouped roster needs to page its groups and fold them. */
export interface RosterGroupPaging {
  /** Whether the group is folded. */
  isCollapsed: (key: string) => boolean;
  /** Fold or unfold the group. */
  setCollapsed: (key: string, collapsed: boolean) => void;
  /**
   * How many of the group's rows to mount: a page, more for each "Show more",
   * and always enough to reach the row at `index` (-1 for none).
   */
  limitFor: (key: string, index: number) => number;
  /** Add a page to the group, counting from the limit it is shown at. */
  showMore: (key: string, shownLimit: number) => void;
}

/**
 * Paging for a roster grouped by status, as the quest and rumour lists are
 * (T101). The NPC list pages across its groups (`pageGroups`), which leaves a
 * group past the limit out whole; these page each group on its own instead,
 * because a status group can be folded and must never vanish for lack of a
 * share of the page. Each group mounts at most `ROSTER_PAGE_SIZE` rows, and
 * a "Show more" once it is open. A folded group's rows stay mounted and
 * hidden, as they always were -- only no longer all of them.
 *
 * @param initiallyCollapsed The groups that start folded
 * @param reveal A group to open now -- the one a deep link points into
 */
export function useRosterGroupPaging(
  initiallyCollapsed: readonly string[],
  reveal?: string | null
): RosterGroupPaging {
  const [collapsed, setCollapsedKeys] = useState<ReadonlySet<string>>(
    () => new Set(initiallyCollapsed)
  );
  const [limits, setLimits] = useState<Readonly<Record<string, number>>>({});

  const setCollapsed = useCallback((key: string, value: boolean) => {
    setCollapsedKeys((previous) => {
      if (previous.has(key) === value) return previous;
      const next = new Set(previous);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  // A link to one record must find it, folded group or not.
  useEffect(() => {
    if (reveal) setCollapsed(reveal, false);
  }, [reveal, setCollapsed]);

  const isCollapsed = useCallback((key: string) => collapsed.has(key), [collapsed]);

  const limitFor = useCallback(
    (key: string, index: number) => limitReaching(limits[key] ?? ROSTER_PAGE_SIZE, index),
    [limits]
  );

  const showMore = useCallback((key: string, shownLimit: number) => {
    setLimits((previous) => ({ ...previous, [key]: shownLimit + ROSTER_PAGE_SIZE }));
  }, []);

  return { isCollapsed, setCollapsed, limitFor, showMore };
}
