// src/features/user-management/profiles/hooks/__tests__/useUsernameEditor.test.ts
import { renderHook, act, waitFor } from "@testing-library/react";
import { useUsernameEditor } from "../useUsernameEditor";

// ---------------------------------------------------------------------------
// Mock the domain barrel, then re-point the direct sibling imports at it.
// ---------------------------------------------------------------------------
const mockValidateUsername = jest.fn();
const mockUpdateGroupUserProfile = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useGroups", () => require("@/features/user-management"));
jest.mock("../useUser", () => require("@/features/user-management"));

const { useAuth, useGroups, useUser } = require("@/features/user-management");

const mockUser = { uid: "user-1", email: "test@test.com" };
const mockGroup = { id: "group-1", name: "Test Campaign" };
const mockProfile = {
  userId: "user-1",
  username: "testuser",
  role: "member" as const,
  joinedAt: "2024-01-01T00:00:00.000Z",
};

function setupMocks(overrides: { user?: any; group?: any; profile?: any } = {}) {
  useAuth.mockReturnValue({ user: overrides.user !== undefined ? overrides.user : mockUser });
  useGroups.mockReturnValue({
    activeGroup: overrides.group !== undefined ? overrides.group : mockGroup,
    activeGroupUserProfile: overrides.profile !== undefined ? overrides.profile : mockProfile,
  });
  useUser.mockReturnValue({
    validateUsername: mockValidateUsername,
    updateGroupUserProfile: mockUpdateGroupUserProfile,
  });
}

describe("useUsernameEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
    mockUpdateGroupUserProfile.mockResolvedValue(undefined);
  });

  test("Save is disabled immediately after the editor opens", async () => {
    const { result } = renderHook(() => useUsernameEditor());

    act(() => result.current.open());
    act(() => result.current.setValue("validname1"));

    // Immediately after typing -- before the debounce fires -- valid/available
    // must still be null (not-yet-checked), which is what disables Save.
    expect(result.current.valid).toBeNull();
    expect(result.current.available).toBeNull();

    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("validname1"));
  });

  test("Save is disabled while a check is in flight", async () => {
    let resolveCheck: (v: { isValid: boolean; isAvailable: boolean }) => void = () => {};
    mockValidateUsername.mockImplementation(
      () => new Promise((resolve) => { resolveCheck = resolve; })
    );

    const { result } = renderHook(() => useUsernameEditor());
    act(() => result.current.open());
    act(() => result.current.setValue("validname1"));

    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("validname1"));
    expect(result.current.checking).toBe(true);
    expect(result.current.valid).toBeNull();

    await act(async () => {
      resolveCheck({ isValid: true, isAvailable: true });
    });

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.valid).toBe(true);
    expect(result.current.available).toBe(true);
  });

  test("valid/available become true only once a check has come back valid and available", async () => {
    const { result } = renderHook(() => useUsernameEditor());
    act(() => result.current.open());
    act(() => result.current.setValue("validname1"));

    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("validname1"));
    await waitFor(() => expect(result.current.valid).toBe(true));
    expect(result.current.available).toBe(true);
  });

  test("resets valid/available to null when the value is edited after a passing check", async () => {
    const { result } = renderHook(() => useUsernameEditor());
    act(() => result.current.open());
    act(() => result.current.setValue("validname1"));

    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("validname1"));
    await waitFor(() => expect(result.current.valid).toBe(true));

    act(() => result.current.setValue("validname2"));
    // Reset happens synchronously with the edit, not when the debounced
    // request eventually starts.
    expect(result.current.valid).toBeNull();
    expect(result.current.available).toBeNull();

    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("validname2"));
  });

  test("early-return branch (closed editor) also resets flags to null, not true", () => {
    const { result } = renderHook(() => useUsernameEditor());
    // Editor never opened -- guard branch runs.
    expect(result.current.valid).toBeNull();
    expect(result.current.available).toBeNull();
  });

  test("submit calls updateGroupUserProfile with the new username", async () => {
    const { result } = renderHook(() => useUsernameEditor());
    act(() => result.current.open());
    act(() => result.current.setValue("newusername"));

    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("newusername"));
    await waitFor(() => expect(result.current.valid).toBe(true));

    await act(async () => {
      await result.current.submit();
    });

    expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ username: "newusername" })
    );
    expect(result.current.isEditing).toBe(false);
  });

  test("submit surfaces a save error and keeps the editor open", async () => {
    mockUpdateGroupUserProfile.mockRejectedValue(new Error("Username update failed"));
    const { result } = renderHook(() => useUsernameEditor());
    act(() => result.current.open());
    act(() => result.current.setValue("newusername"));

    await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith("newusername"));
    await waitFor(() => expect(result.current.valid).toBe(true));

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.saveError).toMatch(/username update failed/i);
    expect(result.current.isEditing).toBe(true);
  });

  test("submit is a no-op for an unchanged username -- valid/available never leave null, same as the real Save button being disabled", async () => {
    const { result } = renderHook(() => useUsernameEditor());
    act(() => result.current.open());
    // value defaults to the current username -- unchanged, so the debounce
    // effect's early-return branch never sets valid/available to true, and
    // submit's own guard (`!valid || !available`) rejects the call, exactly
    // as the real Save button stays disabled in this case.

    await act(async () => {
      await result.current.submit();
    });

    expect(mockUpdateGroupUserProfile).not.toHaveBeenCalled();
    expect(result.current.isEditing).toBe(true);
  });

  test("cancel closes the editor and reverts the value to the current username", () => {
    const { result } = renderHook(() => useUsernameEditor());
    act(() => result.current.open());
    act(() => result.current.setValue("somethingelse"));

    act(() => result.current.cancel());

    expect(result.current.isEditing).toBe(false);
    expect(result.current.value).toBe("testuser");
  });
});
