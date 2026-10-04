// src/shared/utils/roster-paging.ts

/** How many rows a long roster mounts at first, and adds per "Show more". */
export const ROSTER_PAGE_SIZE = 100;

/** A roster group, cut to the rows that are on the page. */
export interface PagedGroup<T> {
  key: string;
  /** The rows to mount. */
  rows: T[];
  /** How many rows the whole group holds, for its heading. */
  total: number;
}

/** A grouped roster, cut to a row limit. */
export interface PagedRoster<T> {
  groups: PagedGroup<T>[];
  /** Rows mounted. */
  shown: number;
  /** Rows the roster holds. */
  total: number;
}

/**
 * Cut a grouped roster to its first `limit` rows, in display order.
 *
 * A campaign's roster mounted every row it held: 1,200 NPCs were 19,000 DOM
 * elements and half a second to redraw after a filter was cleared (T101). The
 * cut runs across groups, so a group past the limit is left out whole and the
 * group straddling it keeps its heading, with its full count, over the rows
 * that fit.
 *
 * @param groups The roster's groups, each with its rows, in display order
 * @param limit How many rows to keep
 */
export function pageGroups<T>(groups: ReadonlyArray<readonly [string, readonly T[]]>, limit: number): PagedRoster<T> {
  const paged: PagedGroup<T>[] = [];
  let shown = 0;
  let total = 0;

  for (const [key, rows] of groups) {
    total += rows.length;
    const room = limit - shown;
    if (room <= 0) continue;
    const kept = rows.slice(0, room);
    paged.push({ key, rows: kept, total: rows.length });
    shown += kept.length;
  }

  return { groups: paged, shown, total };
}

/**
 * The limit that keeps a row on the page: the requested limit, raised just
 * enough to reach the row at `index` when it lies past it. A link to one
 * record must find it however far down the roster it sits.
 *
 * @param limit The limit the reader has reached
 * @param index The row's position in display order, or -1 for none
 */
export const limitReaching = (limit: number, index: number): number =>
  Math.max(limit, index + 1);
