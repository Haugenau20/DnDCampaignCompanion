// src/features/user-management/profiles/components/__tests__/DeleteAccountDialog.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteAccountDialog from "../DeleteAccountDialog";

const mockSignOut = jest.fn();

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

const mockUser = { uid: "user-1" };

describe("DeleteAccountDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser, signOut: mockSignOut });
    mockDeleteAccount.mockResolvedValue(undefined);
  });

  test("should call the delete-account service when Delete My Account is confirmed", async () => {
    render(<DeleteAccountDialog open onClose={jest.fn()} />);
    const dialog = screen.getByRole("dialog", { name: /confirm account deletion/i });
    const deleteBtn = Array.from(dialog.querySelectorAll("button")).find((b) =>
      /delete my account/i.test(b.textContent || "")
    );
    expect(deleteBtn).toBeTruthy();
    await userEvent.click(deleteBtn!);

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith(mockUser.uid);
    });
  });

  test("should show error when account deletion fails", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("Deletion failed"));
    render(<DeleteAccountDialog open onClose={jest.fn()} />);
    const dialog = screen.getByRole("dialog", { name: /confirm account deletion/i });
    const deleteBtn = Array.from(dialog.querySelectorAll("button")).find((b) =>
      /delete my account/i.test(b.textContent || "")
    );
    await userEvent.click(deleteBtn!);

    await waitFor(() => {
      expect(screen.getByText(/deletion failed/i)).toBeInTheDocument();
    });
  });
});
