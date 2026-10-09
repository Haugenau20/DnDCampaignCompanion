// src/shared/hooks/__tests__/useMemberDirectory.test.tsx
//
// T132: the group's members, followed live by one listener however many
// components read them. Found by the recorded-by journey: a subscribe made
// anew on every render closed the listener before its first answer.
import { act, renderHook } from '@testing-library/react';
import { useMemberDirectory } from '../useMemberDirectory';

let mockActiveGroupId: string | null = 'g1';
jest.mock('features/user-management', () => ({
  useGroups: () => ({ activeGroupId: mockActiveGroupId }),
}));

type Push = (profiles: Array<Record<string, unknown> & { id: string }>) => void;
const mockPushes: Push[] = [];
const mockClose = jest.fn();
const mockSubscribe = jest.fn((_groupId: string, onNext: Push) => {
  mockPushes.push(onNext);
  return mockClose;
});
jest.mock('core/services/firebase', () => ({
  __esModule: true,
  default: { group: { subscribeToGroupProfiles: (...args: unknown[]) => (mockSubscribe as any)(...args) } },
}));

beforeEach(() => {
  mockPushes.length = 0;
  mockSubscribe.mockClear();
  mockClose.mockClear();
  mockActiveGroupId = 'g1';
});

describe('useMemberDirectory', () => {
  it('is undefined until the members arrive, then holds them by uid', () => {
    const { result } = renderHook(() => useMemberDirectory());
    expect(result.current).toBeUndefined();

    act(() => mockPushes[0]([{ id: 'wren', username: 'Wren', characters: [{ id: 'c', name: 'Ilse' }] }]));
    expect(result.current?.get('wren')).toEqual({ username: 'Wren', characters: [{ id: 'c', name: 'Ilse' }] });
  });

  it('keeps one listener across re-renders and readers, and closes it with the last', () => {
    const { rerender: rerenderFirst, unmount: unmountFirst } = renderHook(() => useMemberDirectory());
    const { rerender: rerenderSecond, unmount: unmountSecond, result } = renderHook(() => useMemberDirectory());
    rerenderFirst();
    rerenderSecond();
    act(() => mockPushes[0]([{ id: 'wren', username: 'Wren' }]));
    rerenderFirst();

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(result.current?.get('wren')?.username).toBe('Wren');

    unmountFirst();
    expect(mockClose).not.toHaveBeenCalled();
    unmountSecond();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('follows nothing without a group', () => {
    mockActiveGroupId = null;
    const { result } = renderHook(() => useMemberDirectory());
    expect(result.current).toBeUndefined();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });
});
