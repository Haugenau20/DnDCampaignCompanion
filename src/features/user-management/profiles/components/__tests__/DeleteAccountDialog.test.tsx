// src/features/user-management/profiles/components/__tests__/DeleteAccountDialog.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteAccountDialog from "../DeleteAccountDialog";

const mockSignOut = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

const { useNavigate } = require("react-router-dom");

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));

const { useAuth } = require("@/features/user-management");

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

const mockDeleteAccount = jest.fn();

jest.mock("@/core/services/firebase", () => ({
  __esModule: true,
  default: {
    user: { deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args) },
  },
}));

const mockUser = { uid: "user-1", email: "player@example.com" };

function getConfirmButton(dialog: HTMLElement) {
  return Array.from(dialog.querySelectorAll("button")).find((b) =>
    /delete my account/i.test(b.textContent || "")
  ) as HTMLButtonElement;
}

describe("DeleteAccountDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser, signOut: mockSignOut });
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    mockDeleteAccount.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
  });

  test("keeps the confirm button disabled until the account email is typed", async () => {
    render(<DeleteAccountDialog open onClose={jest.fn()} />);
    const dialog = screen.getByRole("dialog", { name: /confirm account deletion/i });
    const confirmBtn = getConfirmButton(dialog);
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByLabelText(/type .* to confirm/i);
    await userEvent.type(input, mockUser.email);

    expect(confirmBtn).not.toBeDisabled();
  });

  test("accepts the email case-insensitively, ignoring surrounding spaces", async () => {
    render(<DeleteAccountDialog open onClose={jest.fn()} />);
    const dialog = screen.getByRole("dialog", { name: /confirm account deletion/i });
    const confirmBtn = getConfirmButton(dialog);
    const input = screen.getByLabelText(/type .* to confirm/i);

    await userEvent.type(input, "  PLAYER@EXAMPLE.COM  ");

    expect(confirmBtn).not.toBeDisabled();
  });

  test("should call the delete-account service when Delete My Account is confirmed", async () => {
    render(<DeleteAccountDialog open onClose={jest.fn()} />);
    const dialog = screen.getByRole("dialog", { name: /confirm account deletion/i });
    const input = screen.getByLabelText(/type .* to confirm/i);
    await userEvent.type(input, mockUser.email);
    const deleteBtn = getConfirmButton(dialog);
    expect(deleteBtn).toBeTruthy();
    await userEvent.click(deleteBtn!);

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith(mockUser.uid);
    });
  });

  test("signs out and navigates home on success", async () => {
    render(<DeleteAccountDialog open onClose={jest.fn()} />);
    const dialog = screen.getByRole("dialog", { name: /confirm account deletion/i });
    const input = screen.getByLabelText(/type .* to confirm/i);
    await userEvent.type(input, mockUser.email);
    const deleteBtn = getConfirmButton(dialog);
    await userEvent.click(deleteBtn!);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    const deleteOrder = mockDeleteAccount.mock.invocationCallOrder[0];
    const signOutOrder = mockSignOut.mock.invocationCallOrder[0];
    const navigateOrder = mockNavigate.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(signOutOrder);
    expect(signOutOrder).toBeLessThan(navigateOrder);
  });

  test("should show error when account deletion fails", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("Deletion failed"));
    render(<DeleteAccountDialog open onClose={jest.fn()} />);
    const dialog = screen.getByRole("dialog", { name: /confirm account deletion/i });
    const input = screen.getByLabelText(/type .* to confirm/i);
    await userEvent.type(input, mockUser.email);
    const deleteBtn = getConfirmButton(dialog);
    await userEvent.click(deleteBtn!);

    await waitFor(() => {
      expect(screen.getByText(/deletion failed/i)).toBeInTheDocument();
    });
  });

  test("does not navigate when deletion fails, and shows why", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("Deletion failed"));
    render(<DeleteAccountDialog open onClose={jest.fn()} />);
    const dialog = screen.getByRole("dialog", { name: /confirm account deletion/i });
    const input = screen.getByLabelText(/type .* to confirm/i);
    await userEvent.type(input, mockUser.email);
    const deleteBtn = getConfirmButton(dialog);
    await userEvent.click(deleteBtn!);

    await waitFor(() => {
      expect(screen.getByText(/deletion failed/i)).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
