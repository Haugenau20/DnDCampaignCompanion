// src/features/user-management/profiles/components/__tests__/DangerZoneCard.test.tsx
import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DangerZoneCard from "../DangerZoneCard";

const mockSignOut = jest.fn();
const mockRefreshGroups = jest.fn();
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));

const { useNavigate } = require("react-router-dom");

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useGroupFootprint: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useGroups", () => require("@/features/user-management"));
jest.mock("../../hooks/useGroupFootprint", () => require("@/features/user-management"));

const { useAuth, useGroups, useGroupFootprint } = require("@/features/user-management");

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

const mockUser = { uid: "user-1", email: "player@example.com" };
const mockGroup = { id: "group-1", name: "Test Campaign" };

describe("DangerZoneCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser, signOut: mockSignOut });
    // Two memberships by default, matching the design mock's user: the
    // reassurance half of the leave sentence is phrased from this count, so
    // the suite has to state it rather than leave it undefined.
    useGroups.mockReturnValue({
      activeGroup: mockGroup,
      refreshGroups: mockRefreshGroups,
      groups: [mockGroup, { id: "group-2", name: "The Council of Elrond" }],
    });
    useGroupFootprint.mockReturnValue({ campaigns: null, chapters: null, notes: null });
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
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

  test("states what leaving costs, with real counts", () => {
    useGroupFootprint.mockReturnValue({ campaigns: 2, chapters: 39, notes: 14 });
    render(<DangerZoneCard />);
    expect(
      screen.getByText(
        "You lose access to 2 campaigns, 39 chapters and 14 of your own notes in this group. Your account and your other group stay as they are."
      )
    ).toBeInTheDocument();
  });

  // The mock in the design shows a user with exactly two groups, and the
  // sentence was written for that user. It has to stay true for everyone else.
  test("phrases what survives leaving from the real number of memberships", () => {
    useGroupFootprint.mockReturnValue({ campaigns: 2, chapters: 39, notes: 14 });

    useGroups.mockReturnValue({
      activeGroup: mockGroup,
      refreshGroups: mockRefreshGroups,
      groups: [mockGroup],
    });
    const { unmount } = render(<DangerZoneCard />);
    expect(screen.getByText(/Your account stays as it is\./)).toBeInTheDocument();
    expect(screen.queryByText(/your other group/)).not.toBeInTheDocument();
    unmount();

    useGroups.mockReturnValue({
      activeGroup: mockGroup,
      refreshGroups: mockRefreshGroups,
      groups: [mockGroup, { id: "g2", name: "Two" }, { id: "g3", name: "Three" }],
    });
    render(<DangerZoneCard />);
    expect(
      screen.getByText(/Your account and your other groups stay as they are\./)
    ).toBeInTheDocument();
  });

  test("omits the chapter clause when that count is unavailable", () => {
    useGroupFootprint.mockReturnValue({ campaigns: 2, chapters: null, notes: 14 });
    render(<DangerZoneCard />);
    expect(
      screen.getByText(
        "You lose access to 2 campaigns and 14 of your own notes in this group. Your account and your other group stay as they are."
      )
    ).toBeInTheDocument();
  });

  test("keeps the sentence grammatical when only one count resolved", () => {
    useGroupFootprint.mockReturnValue({ campaigns: 2, chapters: null, notes: null });
    render(<DangerZoneCard />);
    expect(
      screen.getByText(
        "You lose access to 2 campaigns in this group. Your account and your other group stay as they are."
      )
    ).toBeInTheDocument();
  });

  test("states that deleting removes you from every group, permanently", () => {
    const { unmount } = render(<DangerZoneCard />);
    expect(
      screen.getByText(
        "Removes you from all 2 groups you're in and deletes every profile, character and note you own. Permanent. You'll be asked to type your email to confirm."
      )
    ).toBeInTheDocument();
    unmount();

    // With the membership list not yet loaded there is no number to quote, so
    // the sentence has to stay true without one.
    useGroups.mockReturnValue({
      activeGroup: mockGroup,
      refreshGroups: mockRefreshGroups,
    });
    render(<DangerZoneCard />);
    expect(
      screen.getByText(
        "Removes you from every group you're in and deletes every profile, character and note you own. Permanent. You'll be asked to type your email to confirm."
      )
    ).toBeInTheDocument();
  });

  test("renders leave as an outlined button and delete as a solid one", () => {
    render(<DangerZoneCard />);
    const leaveBtn = screen.getByRole("button", { name: /^leave group$/i });
    const deleteBtn = screen.getByRole("button", { name: /^delete account$/i });

    expect(leaveBtn).toHaveAttribute("data-variant", "outline");
    expect(deleteBtn).toHaveAttribute("data-variant", "ghost");
    expect(deleteBtn.className).toEqual(expect.stringContaining("delete-button"));
    expect(leaveBtn.className).not.toEqual(expect.stringContaining("delete-button"));
  });
});
