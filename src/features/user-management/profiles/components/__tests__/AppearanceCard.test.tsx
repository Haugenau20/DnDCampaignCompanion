// src/features/user-management/profiles/components/__tests__/AppearanceCard.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppearanceCard from "../AppearanceCard";

const mockSetAccountTheme = jest.fn();
const mockUpdateGroupUserProfile = jest.fn();

jest.mock("@/core/themes/ThemeContext", () => ({
  useTheme: jest.fn(),
}));

const { useTheme } = require("@/core/themes/ThemeContext");

jest.mock("../../hooks/useAccountTheme", () => ({
  useAccountTheme: jest.fn(),
}));

const { useAccountTheme } = require("../../hooks/useAccountTheme");

// updateGroupUserProfile must never be reached by this component any more --
// mock the domain barrel so a regression that goes back to calling it would
// be visible as a mock invocation this suite explicitly asserts against.
jest.mock("@/features/user-management", () => ({
  useUser: jest.fn(),
}));

jest.mock("../../hooks/useUser", () => require("@/features/user-management"));

const { useUser } = require("@/features/user-management");
import { unnamedControlsIn } from "@/test-utils/accessible-names";
import { formAccentsIn } from "@/test-utils/accent-budget";

function setupMocks(currentThemeName: string = "light") {
  useTheme.mockReturnValue({
    theme: { name: currentThemeName, colors: { primary: "#0000ff" } },
    setTheme: jest.fn(),
  });
  useAccountTheme.mockReturnValue({
    setAccountTheme: mockSetAccountTheme,
    error: null,
    saving: false,
  });
  useUser.mockReturnValue({ updateGroupUserProfile: mockUpdateGroupUserProfile });
}

describe("AppearanceCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockSetAccountTheme.mockResolvedValue(undefined);
  });

  test("renders one option per theme, each with a swatch", () => {
    render(<AppearanceCard />);

    expect(screen.getByText(/^light$/i)).toBeInTheDocument();
    expect(screen.getByText(/^dark$/i)).toBeInTheDocument();

    // Two option buttons, one per theme. The list comes from `themes` itself,
    // so this count follows the theme registry rather than restating it.
    const options = screen.getAllByRole("button");
    expect(options).toHaveLength(2);
  });

  test("marks the current theme as selected", () => {
    setupMocks("dark");
    render(<AppearanceCard />);

    const darkOption = screen.getByText(/^dark$/i).closest("button")!;
    expect(darkOption).toHaveAttribute("aria-pressed", "true");

    const lightOption = screen.getByText(/^light$/i).closest("button")!;
    expect(lightOption).toHaveAttribute("aria-pressed", "false");
  });

  test("switching theme goes through the account writer, not updateGroupUserProfile", async () => {
    render(<AppearanceCard />);

    const darkOption = screen.getByText(/^dark$/i).closest("button")!;
    await userEvent.click(darkOption);

    expect(mockSetAccountTheme).toHaveBeenCalledWith("dark");
    expect(mockUpdateGroupUserProfile).not.toHaveBeenCalled();
  });

  test("renders no dropdown toggle", () => {
    render(<AppearanceCard />);

    // The old dropdown rendered a toggle button reading "<Theme> Theme"
    // (e.g. "Light Theme") with an aria-expanded state. Neither should
    // exist any more -- the toggle must be gone, not merely hidden.
    expect(screen.queryByText(/^light theme$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^dark theme$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { expanded: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { expanded: false })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// A5 gates (PR 10.2). Every control has a name; the surface spends its one
// accent on the control that writes, or none where nothing writes.
// ---------------------------------------------------------------------------
describe("AppearanceCard — names and accents", () => {
  it("names every control", () => {
    const { container } = render(<AppearanceCard />);

    // Paired with a positive assertion so an empty list cannot mean "this
    // rendered nothing at all" (R31).
    expect(container.querySelectorAll("input, select, textarea, button").length)
      .toBeGreaterThan(0);
    expect(unnamedControlsIn(container)).toEqual([]);
  });

  it("spends at most one accent, on the control that writes", () => {
    const { container } = render(<AppearanceCard />);

    expect(formAccentsIn(container)).toEqual([]);
  });
});
