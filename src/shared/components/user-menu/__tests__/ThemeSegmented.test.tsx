// src/shared/components/user-menu/__tests__/ThemeSegmented.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeSegmented from "../ThemeSegmented";

const mockSetAccountTheme = jest.fn();

jest.mock("@/core/themes/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

const { useTheme } = require("@/core/themes/ThemeContext");

jest.mock("@/features/user-management", () => ({
  useAccountTheme: jest.fn(),
}));

const { useAccountTheme } = require("@/features/user-management");

function setupMocks(currentThemeName: string = "light") {
  useTheme.mockReturnValue({ theme: { name: currentThemeName } });
  useAccountTheme.mockReturnValue({
    setAccountTheme: mockSetAccountTheme,
    error: null,
    saving: false,
  });
}

describe("ThemeSegmented", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockSetAccountTheme.mockResolvedValue(undefined);
  });

  test("marks the current theme", () => {
    setupMocks("dark");

    render(<ThemeSegmented />);

    expect(screen.getByRole("menuitem", { name: "Dark" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("menuitem", { name: "Light" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  test("offers exactly the themes that exist", () => {
    render(<ThemeSegmented />);

    // Asserted as the whole set rather than one name at a time, so a theme
    // added to the control without being added to the registry -- or a retired
    // one left behind, which is what this replaced -- fails here.
    expect(
      screen.getAllByRole("menuitem").map((option) => option.textContent)
    ).toEqual(["Light", "Dark"]);
  });

  test("switching goes through the account theme writer", async () => {
    render(<ThemeSegmented />);

    await userEvent.click(screen.getByRole("menuitem", { name: "Dark" }));

    expect(mockSetAccountTheme).toHaveBeenCalledWith("dark");
  });
});
