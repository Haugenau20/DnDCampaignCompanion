// src/features/user-management/profiles/hooks/__tests__/useAccountTheme.test.ts
import { renderHook, act } from "@testing-library/react";
import { useAccountTheme } from "../useAccountTheme";

// ---------------------------------------------------------------------------
// Mock the domain barrel, then re-point the direct sibling imports at it --
// same pattern as useUsernameEditor.test.ts.
// ---------------------------------------------------------------------------
const mockUpdateUserProfile = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../useUser", () => require("@/features/user-management"));

const { useAuth, useUser } = require("@/features/user-management");

// ---------------------------------------------------------------------------
// Mock ThemeContext -- not part of the user-management barrel.
// ---------------------------------------------------------------------------
const mockSetTheme = jest.fn();

jest.mock("@/core/themes/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

const { useTheme } = require("@/core/themes/ThemeContext");

const mockUser = { uid: "user-1", email: "test@test.com" };

function setupMocks(overrides: { userProfile?: any } = {}) {
  useAuth.mockReturnValue({ user: mockUser });
  useUser.mockReturnValue({
    userProfile: overrides.userProfile !== undefined
      ? overrides.userProfile
      : { id: "user-1", preferences: { theme: "light" } },
    updateUserProfile: mockUpdateUserProfile,
  });
  useTheme.mockReturnValue({
    theme: { name: "light", colors: { primary: "#0000ff" } },
    setTheme: mockSetTheme,
  });
}

describe("useAccountTheme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockUpdateUserProfile.mockResolvedValue(undefined);
  });

  test("writes the theme to users/{uid}.preferences.theme", async () => {
    const { result } = renderHook(() => useAccountTheme());

    await act(async () => {
      await result.current.setAccountTheme("dark");
    });

    expect(mockUpdateUserProfile).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ preferences: expect.objectContaining({ theme: "dark" }) })
    );
  });

  test("applies the theme to context before the write resolves", async () => {
    // Make the write hang so we can observe ordering.
    let resolveWrite!: () => void;
    mockUpdateUserProfile.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveWrite = resolve;
      })
    );

    const { result } = renderHook(() => useAccountTheme());

    let settled = false;
    act(() => {
      result.current.setAccountTheme("dark").then(() => {
        settled = true;
      });
    });

    // setTheme must already have been called even though the write has not
    // resolved yet.
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    expect(settled).toBe(false);

    await act(async () => {
      resolveWrite();
      await Promise.resolve();
    });
  });

  test("surfaces a write failure without reverting the applied theme", async () => {
    mockUpdateUserProfile.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useAccountTheme());

    await act(async () => {
      await result.current.setAccountTheme("dark");
    });

    expect(result.current.error).toBe("network down");
    // The theme was applied and is never rolled back on a failed write.
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    expect(mockSetTheme).toHaveBeenCalledTimes(1);
  });
});
