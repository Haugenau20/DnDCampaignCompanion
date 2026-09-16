// src/shared/components/user-menu/__tests__/UserMenuLinks.test.tsx
import React from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UserMenuLinks from "../UserMenuLinks";

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
}));

jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    group: { getGroupUsers: jest.fn().mockResolvedValue([]) },
  },
}));

const { useAuth, useGroups } = require("@/features/user-management");

function setGroups({ isAdmin = false } = {}) {
  useGroups.mockReturnValue({
    activeGroupId: "g1",
    activeGroupUserProfile: { role: isAdmin ? "admin" : "member" },
    isAdmin,
  });
}

/**
 * Renders and lets the member-count fetch settle.
 *
 * The count resolves in an effect, so without the flush every test here trails
 * an `act()` warning from a state update it never asked for.
 */
async function renderLinks() {
  const result = render(
    <MemoryRouter>
      <UserMenuLinks open onClose={jest.fn()} onOpenAdmin={jest.fn()} />
    </MemoryRouter>
  );
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

describe("UserMenuLinks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ signOut: jest.fn() });
    setGroups();
  });

  describe("the group administration entry", () => {
    // The route exists but nothing advertises it: this menu is its only
    // entrance, by design (design doc §4). No nav item, no badge, no entry on
    // the campaign switcher.
    test("is a real link to /admin/people for an admin", async () => {
      setGroups({ isAdmin: true });
      await renderLinks();
      expect(
        screen.getByRole("menuitem", { name: "Group administration" })
      ).toHaveAttribute("href", "/admin/people");
    });

    test("is absent for a member, not merely disabled", async () => {
      setGroups({ isAdmin: false });
      await renderLinks();
      expect(
        screen.queryByRole("menuitem", { name: "Group administration" })
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Group administration")).not.toBeInTheDocument();
    });

    test("reads whether you are an admin from useGroups, case and all", async () => {
      // `useGroups().isAdmin` compares case-insensitively; a local
      // `role === "admin"` does not, which is bug #702's shape. A profile
      // carrying "Admin" must still be an admin here.
      useGroups.mockReturnValue({
        activeGroupId: "g1",
        activeGroupUserProfile: { role: "Admin" },
        isAdmin: true,
      });
      await renderLinks();
      expect(
        screen.getByRole("menuitem", { name: "Group administration" })
      ).toBeInTheDocument();
    });
  });
});
