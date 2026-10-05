// src/shared/hooks/__tests__/useRosterGroupPaging.test.ts
import { renderHook, act } from '@testing-library/react';
import { useRosterGroupPaging } from '../useRosterGroupPaging';
import { ROSTER_PAGE_SIZE } from 'shared/utils/roster-paging';

/** T101: status-grouped rosters page each group on its own. */
describe('useRosterGroupPaging', () => {
  it('folds the groups it is told to, and only those', () => {
    const { result } = renderHook(() => useRosterGroupPaging(['completed', 'failed']));
    expect(result.current.isCollapsed('completed')).toBe(true);
    expect(result.current.isCollapsed('failed')).toBe(true);
    expect(result.current.isCollapsed('active')).toBe(false);
  });

  it('folds and unfolds a group', () => {
    const { result } = renderHook(() => useRosterGroupPaging(['completed']));
    act(() => result.current.setCollapsed('completed', false));
    expect(result.current.isCollapsed('completed')).toBe(false);
    act(() => result.current.setCollapsed('active', true));
    expect(result.current.isCollapsed('active')).toBe(true);
  });

  it('starts every group at one page, and adds a page to one group at a time', () => {
    const { result } = renderHook(() => useRosterGroupPaging([]));
    expect(result.current.limitFor('active', -1)).toBe(ROSTER_PAGE_SIZE);

    act(() => result.current.showMore('active', ROSTER_PAGE_SIZE));
    expect(result.current.limitFor('active', -1)).toBe(2 * ROSTER_PAGE_SIZE);
    expect(result.current.limitFor('completed', -1)).toBe(ROSTER_PAGE_SIZE);
  });

  it('always reaches a deep-linked row, however far down its group', () => {
    const { result } = renderHook(() => useRosterGroupPaging([]));
    expect(result.current.limitFor('active', 250)).toBe(251);
    expect(result.current.limitFor('active', 3)).toBe(ROSTER_PAGE_SIZE);
  });

  it('opens the group a deep link points into, even one that starts folded', () => {
    const { result, rerender } = renderHook(
      ({ reveal }: { reveal: string | null }) => useRosterGroupPaging(['completed'], reveal),
      { initialProps: { reveal: null as string | null } }
    );
    expect(result.current.isCollapsed('completed')).toBe(true);

    rerender({ reveal: 'completed' });
    expect(result.current.isCollapsed('completed')).toBe(false);
  });
});
