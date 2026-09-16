// src/features/user-management/groups/hooks/__tests__/useJoinGroupCompletion.test.tsx
import { renderHook } from "@testing-library/react";
import { useJoinGroupCompletion } from "../useJoinGroupCompletion";

const mockRefreshGroups = jest.fn();
const mockSetActiveGroup = jest.fn();
const mockUseGroups = jest.fn();

jest.mock("../useGroups", () => ({
  useGroups: (...args: any[]) => mockUseGroups(...args),
}));

/**
 * useJoinGroupCompletion Behavioral Testing
 *
 * This hook is `Header.handleJoinedGroup` moved verbatim: refresh, find the
 * group that appeared, switch to it, and log (never throw) if the switch
 * fails. These tests pin exactly that behaviour so a second caller
 * (AccountCard) can share it without drifting from Header's original.
 */
describe("useJoinGroupCompletion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGroups.mockReturnValue({
      groups: [{ id: "g1", name: "The Fellowship" }],
      refreshGroups: mockRefreshGroups,
      setActiveGroup: mockSetActiveGroup,
    });
  });

  test("switches to the group that appeared after the refresh", async () => {
    mockRefreshGroups.mockResolvedValue([
      { id: "g1", name: "The Fellowship" },
      { id: "g2", name: "The Council of Elrond" },
    ]);
    mockSetActiveGroup.mockResolvedValue(undefined);

    const { result } = renderHook(() => useJoinGroupCompletion());
    await result.current();

    expect(mockRefreshGroups).toHaveBeenCalled();
    expect(mockSetActiveGroup).toHaveBeenCalledWith("g2");
  });

  test("refreshes and stays put when no new group appears", async () => {
    mockRefreshGroups.mockResolvedValue([{ id: "g1", name: "The Fellowship" }]);

    const { result } = renderHook(() => useJoinGroupCompletion());
    await result.current();

    expect(mockRefreshGroups).toHaveBeenCalled();
    expect(mockSetActiveGroup).not.toHaveBeenCalled();
  });

  test("logs rather than throwing when the switch fails", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockRefreshGroups.mockResolvedValue([
      { id: "g1", name: "The Fellowship" },
      { id: "g2", name: "The Council of Elrond" },
    ]);
    mockSetActiveGroup.mockRejectedValue(new Error("Switch failed"));

    const { result } = renderHook(() => useJoinGroupCompletion());
    await expect(result.current()).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
