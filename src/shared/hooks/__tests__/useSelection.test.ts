// src/shared/hooks/__tests__/useSelection.test.ts
import { renderHook, act } from '@testing-library/react';
import useSelection from '../useSelection';

/** T017: the selection mechanics every directory's batch actions share. */
describe('useSelection', () => {
  it('starts out of selection mode with nothing ticked', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.active).toBe(false);
    expect(result.current.selected.size).toBe(0);
  });

  it('ticks and unticks ids', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.toggleActive());
    act(() => result.current.setSelected('a', true));
    act(() => result.current.setSelected('b', true));
    act(() => result.current.setSelected('a', false));
    expect(Array.from(result.current.selected)).toEqual(['b']);
  });

  it('hands out a new set on every change, so it is safe as a dependency', () => {
    const { result } = renderHook(() => useSelection());
    const before = result.current.selected;
    act(() => result.current.setSelected('a', true));
    expect(result.current.selected).not.toBe(before);
  });

  it('forgets the selection when selection mode is left', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.toggleActive());
    act(() => result.current.setSelected('a', true));
    act(() => result.current.toggleActive());
    expect(result.current.active).toBe(false);
    expect(result.current.selected.size).toBe(0);
  });

  it('clear leaves selection mode and forgets the selection, as a finished action does', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.toggleActive());
    act(() => result.current.setSelected('a', true));
    act(() => result.current.clear());
    expect(result.current.active).toBe(false);
    expect(result.current.selected.size).toBe(0);
  });
});
