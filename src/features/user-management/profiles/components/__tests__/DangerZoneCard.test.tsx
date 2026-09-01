// src/features/user-management/profiles/components/__tests__/DangerZoneCard.test.tsx
import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DangerZoneCard from "../DangerZoneCard";

const mockSignOut = jest.fn();
const mockRefreshGroups = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useGroups", () => require("@/features/user-management"));

const { useAuth, useGroups } = require("@/features/user-management");

jest.mock("@/core/components/Dialog", () => {
  const Dialog = ({ open, onClose, title, children }: any) => {
    if (!open) return null;
    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="close dialog">X</button>
        {children}
      </div>
    );
  };
  return Dialog;
});

const mockRemoveUserFromGroup = jest.fn();
const mockDeleteAccount = jest.fn();

jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    group: { removeUserFromGroup: (...args: unknown[]) => mockRemoveUserFromGroup(...args) },
    user: { deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args) },
  },
}));

const mockUser = { uid: "user-1" };
const mockGroup = { id: "group-1", name: "Test Campaign" };

describe("DangerZoneCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser, signOut: mockSignOut });
    useGroups.mockReturnValue({ activeGroup: mockGroup, refreshGroups: mockRefreshGroups });
    mockRemoveUserFromGroup.mockResolvedValue(undefined);
    mockDeleteAccount.mockResolvedValue(undefined);
  });

  test("should show Leave Group button", () => {
    render(<DangerZoneCard />);
    expect(screen.getByRole("button", { name: /leave group/i })).toBeInTheDocument();
  });

  test("should show Delete Account button", () => {
    render(<DangerZoneCard />);
    expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
  });

  test("should open Leave Group confirmation dialog when Leave Group is clicked", async () => {
    render(<DangerZoneCard />);
    await userEvent.click(screen.getByRole("button", { name: /leave group/i }));
    expect(screen.getByRole("dialog", { name: /confirm group leave/i })).toBeInTheDocument();
  });

  test("should open Delete Account confirmation dialog when Delete Account is clicked", async () => {
    render(<DangerZoneCard />);
    await userEvent.click(screen.getByRole("button", { name: /delete account/i }));
    expect(screen.getByRole("dialog", { name: /confirm account deletion/i })).toBeInTheDocument();
  });

  test("should close Leave Group dialog when Cancel is clicked inside it", async () => {
    render(<DangerZoneCard />);
    await userEvent.click(screen.getByRole("button", { name: /leave group/i }));
    const dialog = screen.getByRole("dialog", { name: /confirm group leave/i });
    const cancelBtn = within(dialog).getByRole("button", { name: /cancel/i });
    await userEvent.click(cancelBtn);
    expect(screen.queryByRole("dialog", { name: /confirm group leave/i })).not.toBeInTheDocument();
  });

  test("should call the leave-group service when confirmed", async () => {
    render(<DangerZoneCard />);
    await userEvent.click(screen.getByRole("button", { name: /leave group/i }));
    const dialog = screen.getByRole("dialog", { name: /confirm group leave/i });
    const leaveBtn = within(dialog).getByRole("button", { name: /leave group/i });
    await userEvent.click(leaveBtn);
    await waitFor(() => {
      expect(mockRemoveUserFromGroup).toHaveBeenCalledWith(mockGroup.id, mockUser.uid);
    });
  });

  test("renders no Close button", () => {
    render(<DangerZoneCard />);
    expect(screen.queryByRole("button", { name: /^close$/i })).not.toBeInTheDocument();
  });
});
