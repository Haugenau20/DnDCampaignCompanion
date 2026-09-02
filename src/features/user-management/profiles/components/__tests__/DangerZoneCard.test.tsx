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
  useCampaigns: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useGroups", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useCampaigns", () => require("@/features/user-management"));

const { useAuth, useGroups, useCampaigns } = require("@/features/user-management");

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
    // Two memberships and two campaigns by default: both sentences are
    // phrased from these counts, so the suite has to state them rather than
    // leave them undefined.
    useGroups.mockReturnValue({
      activeGroup: mockGroup,
      refreshGroups: mockRefreshGroups,
      groups: [mockGroup, { id: "group-2", name: "The Council of Elrond" }],
    });
    useCampaigns.mockReturnValue({
      campaigns: [{ id: "c1", name: "One" }, { id: "c2", name: "Two" }],
    });
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

  test("says what leaving costs, in access rather than destruction", () => {
    render(<DangerZoneCard />);
    expect(
      screen.getByText(
        "You'll lose access to 2 campaigns in this group. Your account stays as it is."
      )
    ).toBeInTheDocument();
  });

  test("names the group rather than a campaign count when campaigns are unknown", () => {
    useCampaigns.mockReturnValue({ campaigns: null });
    render(<DangerZoneCard />);
    expect(
      screen.getByText(
        "You'll lose access to this group. Your account stays as it is."
      )
    ).toBeInTheDocument();
  });

  test("quotes no chapter or note counts", () => {
    render(<DangerZoneCard />);
    expect(screen.queryByText(/chapter/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/notes/i)).not.toBeInTheDocument();
  });

  test("says deleting costs access to every group, permanently", () => {
    const { unmount } = render(<DangerZoneCard />);
    expect(
      screen.getByText(
        "You'll lose access to 2 groups and everything in them. This can't be undone."
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
        "You'll lose access to every group you're in and everything in them. This can't be undone."
      )
    ).toBeInTheDocument();
  });



  // Asserted on what actually renders, not on class names. The first version
  // of this test checked for the `delete-button` class and passed while the
  // button was transparent: every theme sets --delete-button-bg to
  // transparent, because that class is the app's QUIET delete affordance. The
  // delete action read as lighter than the outlined Leave button beside it --
  // the opposite of the intent -- and only the running app showed it.
  test("renders delete as the heavier of the two actions", () => {
    render(<DangerZoneCard />);
    const leaveBtn = screen.getByRole("button", { name: /^leave group$/i });
    const deleteBtn = screen.getByRole("button", { name: /^delete account$/i });

    expect(leaveBtn).toHaveAttribute("data-variant", "outline");
    expect(leaveBtn.className).not.toEqual(expect.stringContaining("button-danger"));

    // `.button-danger` is the filled error pair; `.delete-button` is the quiet
    // one this used to use, and is transparent in every theme.
    expect(deleteBtn.className).toEqual(expect.stringContaining("button-danger"));
    expect(deleteBtn.className).not.toEqual(expect.stringContaining("delete-button"));
  });
});
