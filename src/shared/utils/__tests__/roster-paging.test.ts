// src/shared/utils/__tests__/roster-paging.test.ts
import { pageGroups, limitReaching } from '../roster-paging';

const groups = [
  ['Bree', ['a', 'b', 'c']],
  ['Hobbiton', ['d', 'e']],
  ['Rivendell', ['f']],
] as const;

describe('pageGroups', () => {
  it('keeps every row under the limit', () => {
    const paged = pageGroups(groups, 10);
    expect(paged.groups.map((g) => g.rows)).toEqual([['a', 'b', 'c'], ['d', 'e'], ['f']]);
    expect(paged).toMatchObject({ shown: 6, total: 6 });
  });

  it('cuts across groups in display order, keeping the full count on the cut group', () => {
    const paged = pageGroups(groups, 4);
    expect(paged.groups).toEqual([
      { key: 'Bree', rows: ['a', 'b', 'c'], total: 3 },
      { key: 'Hobbiton', rows: ['d'], total: 2 },
    ]);
    expect(paged).toMatchObject({ shown: 4, total: 6 });
  });

  it('leaves out a group that starts past the limit', () => {
    expect(pageGroups(groups, 3).groups.map((g) => g.key)).toEqual(['Bree']);
  });

  it('handles an empty roster', () => {
    expect(pageGroups([], 100)).toEqual({ groups: [], shown: 0, total: 0 });
  });
});

describe('limitReaching', () => {
  it('keeps the limit when the row is already on the page', () => {
    expect(limitReaching(100, 40)).toBe(100);
  });

  it('raises the limit just enough to reach a row past it', () => {
    expect(limitReaching(100, 250)).toBe(251);
  });

  it('keeps the limit when there is no row to reach', () => {
    expect(limitReaching(100, -1)).toBe(100);
  });
});
