// src/features/user-management/profiles/components/__tests__/GroupMembershipCard.test.tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import GroupMembershipCard from "../GroupMembershipCard";

const mockValidateUsername = jest.fn();
const mockUpdateGroupUserProfile = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useGroups", () => require("@/features/user-management"));
jest.mock("../../hooks/useUser", () => require("@/features/user-management"));

const { useAuth, useGroups, useUser } = require("@/features/user-management");

const mockUser = { uid: "user-1", email: "test@test.com" };
const mockGroup = { id: "group-1", name: "Test Campaign" };
const mockProfile = {
  userId: "user-1",
  username: "testuser",
  role: "member" as const,
  joinedAt: "2024-01-01T00:00:00.000Z",
  characters: [],
  activeCharacterId: null,
};

function setupMocks(overrides: { profile?: any } = {}) {
  useAuth.mockReturnValue({ user: mockUser });
  useGroups.mockReturnValue({
    activeGroup: mockGroup,
    activeGroupUserProfile: overrides.profile !== undefined ? overrides.profile : mockProfile,
  });
  useUser.mockReturnValue({
    validateUsername: mockValidateUsername,
    updateGroupUserProfile: mockUpdateGroupUserProfile,
  });
}

describe("GroupMembershipCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
    mockUpdateGroupUserProfile.mockResolvedValue(undefined);
  });

  test("should display current group name", () => {
    render(<GroupMembershipCard />);
    expect(screen.getByText("Test Campaign")).toBeInTheDocument();
  });

  test("is titled with the group's own name", () => {
    render(<GroupMembershipCard />);
    const heading = screen.getByRole("heading", { name: "Test Campaign" });
    expect(heading).toHaveAttribute("id", "group-heading");
  });

  test('should display role as "Member" for member role', () => {
    render(<GroupMembershipCard />);
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  test('should display "Administrator" for admin role', () => {
    setupMocks({ profile: { ...mockProfile, role: "admin" } });
    render(<GroupMembershipCard />);
    expect(screen.getByText("Administrator")).toBeInTheDocument();
  });

  test("shows an Administrator pill for an admin and a Member pill for a member", () => {
    render(<GroupMembershipCard />);
    expect(screen.getByText("Member")).toHaveClass("tag");

    setupMocks({ profile: { ...mockProfile, role: "admin" } });
    render(<GroupMembershipCard />);
    expect(screen.getByText("Administrator")).toHaveClass("tag");
  });

  test("is subtitled with the other-group caveat", () => {
    render(<GroupMembershipCard />);
    expect(
      screen.getByText("Only for this group. Your other group keeps its own name and characters.")
    ).toBeInTheDocument();
  });

  test("hosts the username editor", () => {
    render(<GroupMembershipCard />);
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change/i })).toBeInTheDocument();
  });

  test("shows the posting-as character with the attribution explanation", () => {
    setupMocks({
      profile: {
        ...mockProfile,
        activeCharacterId: "char-1",
        characters: [{ id: "char-1", name: "Gandalf" }],
      },
    });
    render(<GroupMembershipCard />);

    expect(screen.getByText("Gandalf")).toBeInTheDocument();
    expect(
      screen.getByText(/new chapters, quests and rumours are credited to this name/i)
    ).toBeInTheDocument();
  });

  test("says no character is active when none is", () => {
    render(<GroupMembershipCard />);
    expect(
      screen.getByText(/no active character selected\. actions will use your username\./i)
    ).toBeInTheDocument();
  });

  test("offers no control to change the posting-as character", () => {
    setupMocks({
      profile: {
        ...mockProfile,
        activeCharacterId: "char-1",
        characters: [{ id: "char-1", name: "Gandalf" }],
      },
    });
    render(<GroupMembershipCard />);

    // The only button on the card is the username editor's own "Change" --
    // posting-as is display-only here; changing it happens in the
    // Characters card or the header menu.
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName(/change/i);
  });
});
