// src/features/user-management/auth/components/__tests__/SessionManager.theme-switch.test.tsx
//
// Regression test for a defect the main SessionManager suite structurally
// cannot see: it mocks `useTheme`, so its `setTheme` is one stable jest.fn().
// The REAL ThemeContext builds `setTheme` and its context value inline on
// every render, so both change identity whenever the theme changes.
//
// SessionManager's account-theme effect depends on `setTheme`. With an
// unstable one, every theme change re-runs that effect and re-applies the
// theme stored on the account -- overwriting the theme the user just picked
// and snapping the UI back.
//
// So this suite renders the real provider and drives it the way the header
// menu and the appearance card do.

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "core/themes/ThemeContext";
import SessionManager from "../SessionManager";

jest.mock("../../hooks/useSessionManager", () => {
  const mockFn = jest.fn().mockReturnValue({ checkSession: jest.fn() });
  return { __esModule: true, default: mockFn, useSessionManager: mockFn };
});

const mockUpdateUserProfile = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock("../../hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useGroups", () => require("@/features/user-management"));
jest.mock("../../../profiles/hooks/useUser", () => require("@/features/user-management"));

const { useAuth, useGroups, useUser } = require("@/features/user-management");

/** Switches theme the way the appearance card and the header menu do. */
const ThemeProbe: React.FC = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme.name}</span>
      <button type="button" onClick={() => setTheme("dark")}>
        pick dark
      </button>
    </div>
  );
};

describe("SessionManager theme switching, against the real ThemeContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    useAuth.mockReturnValue({ user: { uid: "user-1" } });
    useGroups.mockReturnValue({ activeGroupUserProfile: null });
    useUser.mockReturnValue({
      // The account already stores "light" -- the state the user is switching away from.
      userProfile: { id: "user-1", preferences: { theme: "light" } },
      updateUserProfile: mockUpdateUserProfile,
    });
  });

  test("a theme the user picks survives; the stored one does not overwrite it", async () => {
    render(
      <ThemeProvider>
        <SessionManager>
          <ThemeProbe />
        </SessionManager>
      </ThemeProvider>
    );

    // The stored account theme is applied on mount.
    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");

    await act(async () => {
      screen.getByRole("button", { name: /pick dark/i }).click();
    });

    // Without a guard, SessionManager's effect re-runs here -- `setTheme` is a
    // new function after the provider re-renders -- and puts "light" back.
    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
  });

  test("the account theme is still applied on mount", () => {
    render(
      <ThemeProvider>
        <SessionManager>
          <ThemeProbe />
        </SessionManager>
      </ThemeProvider>
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
  });
});
