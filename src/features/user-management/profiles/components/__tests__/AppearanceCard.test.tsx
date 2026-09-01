// src/features/user-management/profiles/components/__tests__/AppearanceCard.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppearanceCard from "../AppearanceCard";

const mockUpdateGroupUserProfile = jest.fn();
const mockSetTheme = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useGroups", () => require("@/features/user-management"));
jest.mock("../../hooks/useUser", () => require("@/features/user-management"));

const { useAuth, useGroups, useUser } = require("@/features/user-management");

jest.mock("@/core/themes/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

const { useTheme } = require("@/core/themes/ThemeContext");

const mockUser = { uid: "user-1" };
const mockGroup = { id: "group-1", name: "Test Campaign" };
const mockProfile = { preferences: { theme: "light" } };

describe("AppearanceCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });
    useGroups.mockReturnValue({ activeGroup: mockGroup, activeGroupUserProfile: mockProfile });
    useUser.mockReturnValue({ updateGroupUserProfile: mockUpdateGroupUserProfile });
    useTheme.mockReturnValue({
      theme: { name: "light", colors: { primary: "#0000ff" } },
      setTheme: mockSetTheme,
    });
    mockUpdateGroupUserProfile.mockResolvedValue(undefined);
  });

  test("should display Theme Preference section", () => {
    render(<AppearanceCard />);
    expect(screen.getByText(/theme preference/i)).toBeInTheDocument();
  });

  test("should toggle theme dropdown on button click", async () => {
    render(<AppearanceCard />);
    const themeToggle = screen.getByText(/light theme/i).closest("button");
    expect(themeToggle).toBeInTheDocument();
    await userEvent.click(themeToggle!);
    expect(screen.getAllByText(/dark|medieval|light/i).length).toBeGreaterThan(1);
  });

  test("should call updateGroupUserProfile with new theme when a theme option is clicked", async () => {
    render(<AppearanceCard />);
    const themeToggle = screen.getByText(/light theme/i).closest("button");
    await userEvent.click(themeToggle!);
    const darkOption = screen.getAllByText(/dark/i).find((el) => el.tagName === "SPAN");
    expect(darkOption).toBeTruthy();
    await userEvent.click(darkOption!.closest("button")!);
    expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ preferences: expect.objectContaining({ theme: "dark" }) })
    );
  });
});
