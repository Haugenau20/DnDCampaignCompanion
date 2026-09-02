// src/features/user-management/profiles/components/__tests__/LeaveGroupDialog.test.tsx
import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeaveGroupDialog from "../LeaveGroupDialog";

const mockRefreshGroups = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

const { useNavigate } = require("react-router-dom");

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

jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    group: { removeUserFromGroup: (...args: unknown[]) => mockRemoveUserFromGroup(...args) },
  },
}));

const mockUser = { uid: "user-1" };
const mockGroup = { id: "group-1", name: "Test Campaign" };

describe("LeaveGroupDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });
    useGroups.mockReturnValue({ activeGroup: mockGroup, refreshGroups: mockRefreshGroups });
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    mockRemoveUserFromGroup.mockResolvedValue(undefined);
    mockRefreshGroups.mockResolvedValue(undefined);
  });

  test("calls the leave-group service with the group id and user id when confirmed", async () => {
    const onClose = jest.fn();
    render(<LeaveGroupDialog open onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: /confirm group leave/i });
    const leaveBtn = within(dialog).getByRole("button", { name: /leave group/i });
    await userEvent.click(leaveBtn);
    await waitFor(() => {
      expect(mockRemoveUserFromGroup).toHaveBeenCalledWith(mockGroup.id, mockUser.uid);
    });
  });

  test("leaves through the group service, refreshes, then navigates home", async () => {
    const onClose = jest.fn();
    render(<LeaveGroupDialog open onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: /confirm group leave/i });
    const leaveBtn = within(dialog).getByRole("button", { name: /leave group/i });
    await userEvent.click(leaveBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    expect(mockRemoveUserFromGroup).toHaveBeenCalledWith(mockGroup.id, mockUser.uid);
    expect(mockRefreshGroups).toHaveBeenCalledTimes(1);

    const removeOrder = mockRemoveUserFromGroup.mock.invocationCallOrder[0];
    const refreshOrder = mockRefreshGroups.mock.invocationCallOrder[0];
    const navigateOrder = mockNavigate.mock.invocationCallOrder[0];
    expect(removeOrder).toBeLessThan(refreshOrder);
    expect(refreshOrder).toBeLessThan(navigateOrder);
  });

  test("shows an error message and does not close when the service call fails", async () => {
    mockRemoveUserFromGroup.mockRejectedValue(new Error("Failed to leave group"));
    const onClose = jest.fn();
    render(<LeaveGroupDialog open onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: /confirm group leave/i });
    const leaveBtn = within(dialog).getByRole("button", { name: /leave group/i });
    await userEvent.click(leaveBtn);
    await waitFor(() => {
      expect(screen.getByText(/failed to leave group/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  test("does not navigate when leaving fails, and shows why", async () => {
    mockRemoveUserFromGroup.mockRejectedValue(new Error("Failed to leave group"));
    const onClose = jest.fn();
    render(<LeaveGroupDialog open onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: /confirm group leave/i });
    const leaveBtn = within(dialog).getByRole("button", { name: /leave group/i });
    await userEvent.click(leaveBtn);

    await waitFor(() => {
      expect(screen.getByText(/failed to leave group/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockRefreshGroups).not.toHaveBeenCalled();
  });

  test("never sets window.location.href", async () => {
    const before = window.location.href;
    const onClose = jest.fn();
    render(<LeaveGroupDialog open onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: /confirm group leave/i });
    const leaveBtn = within(dialog).getByRole("button", { name: /leave group/i });
    await userEvent.click(leaveBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    expect(window.location.href).toBe(before);
  });
});
