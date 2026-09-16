// src/features/user-management/profiles/components/__tests__/AccountCard.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AccountCard from "../AccountCard";

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useGroups", () => require("@/features/user-management"));

// The `JoinGroupDialog` stub that used to live here is gone with the dialog.
// "Join another" is a link to `/join` now, and the completion behaviour it
// shared with the header -- `useJoinGroupCompletion` -- belongs to that route.

const { useAuth, useGroups } = require("@/features/user-management");
import { unnamedControlsIn } from "@/test-utils/accessible-names";
import { formAccentsIn } from "@/test-utils/accent-budget";

function setupMocks(overrides: { groups?: Array<{ id: string; name: string }> } = {}) {
  useAuth.mockReturnValue({ user: { uid: "user-1", email: "test@test.com" } });
  useGroups.mockReturnValue({
    groups: overrides.groups ?? [{ id: "group-1", name: "Test Campaign" }],
  });
}

describe("AccountCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  test("displays the user's email", () => {
    render(<AccountCard />, { wrapper: MemoryRouter });
    expect(screen.getByText("test@test.com")).toBeInTheDocument();
  });

  test("shows the email with a 'used to sign in' note", () => {
    render(<AccountCard />, { wrapper: MemoryRouter });
    expect(screen.getByText("test@test.com")).toBeInTheDocument();
    expect(screen.getByText(/used to sign in/i)).toBeInTheDocument();
  });

  test("lists every group the user is in", () => {
    setupMocks({
      groups: [
        { id: "group-1", name: "Test Campaign" },
        { id: "group-2", name: "The Council of Elrond" },
      ],
    });
    render(<AccountCard />, { wrapper: MemoryRouter });
    expect(screen.getByText("Test Campaign, The Council of Elrond")).toBeInTheDocument();
  });

  // 14.5: the dialog is gone, so this is a link like any other -- openable in
  // a new tab, and with a URL an admin's invitation can point straight at.
  test("'Join another' links to /join and opens no overlay", () => {
    render(<AccountCard />, { wrapper: MemoryRouter });
    expect(screen.getByRole("link", { name: /join another/i })).toHaveAttribute(
      "href",
      "/join"
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// A5 gates (PR 10.2). Every control has a name; the surface spends its one
// accent on the control that writes, or none where nothing writes.
// ---------------------------------------------------------------------------
describe("AccountCard — names and accents", () => {
  it("names every control", () => {
    const { container } = render(<AccountCard />, { wrapper: MemoryRouter });

    // Paired with a positive assertion so an empty list cannot mean "this
    // rendered nothing at all" (R31). `a[href]` joined the list in 14.5: the
    // card's one control is a link to `/join` now, so a button-only count
    // would be zero and the guard would stop guarding.
    expect(
      container.querySelectorAll("input, select, textarea, button, a[href]").length
    ).toBeGreaterThan(0);
    expect(unnamedControlsIn(container)).toEqual([]);
  });

  it("spends at most one accent, on the control that writes", () => {
    const { container } = render(<AccountCard />, { wrapper: MemoryRouter });

    expect(formAccentsIn(container)).toEqual([]);
  });
});
