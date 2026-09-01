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

  test('should display role as "Member" for member role', () => {
    render(<GroupMembershipCard />);
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  test('should display "Administrator" for admin role', () => {
    setupMocks({ profile: { ...mockProfile, role: "admin" } });
    render(<GroupMembershipCard />);
    expect(screen.getByText("Administrator")).toBeInTheDocument();
  });

  test("hosts the username editor", () => {
    render(<GroupMembershipCard />);
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /change/i })).toBeInTheDocument();
  });
});
