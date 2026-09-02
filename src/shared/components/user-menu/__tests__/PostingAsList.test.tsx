// src/shared/components/user-menu/__tests__/PostingAsList.test.tsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostingAsList from "../PostingAsList";

const mockUpdateGroupUserProfile = jest.fn();
const mockOnSwitched = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useUser: jest.fn(),
}));

const { useAuth, useGroups, useUser } = require("@/features/user-management");

function setupMocks({
  characters = [] as Array<{ id: string; name: string }>,
  activeCharacterId = null as string | null,
} = {}) {
  useAuth.mockReturnValue({ user: { uid: "user-1" } });
  useGroups.mockReturnValue({
    activeGroupUserProfile: { characters, activeCharacterId },
  });
  useUser.mockReturnValue({ updateGroupUserProfile: mockUpdateGroupUserProfile });
}

describe("PostingAsList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("checks the character currently posting", () => {
    setupMocks({
      characters: [
        { id: "c1", name: "Elandra" },
        { id: "c2", name: "Boros" },
      ],
      activeCharacterId: "c2",
    });

    render(<PostingAsList onSwitched={mockOnSwitched} />);

    const activeRow = screen.getByRole("menuitem", { name: /boros/i });
    expect(activeRow.querySelector("svg")).toBeInTheDocument();

    const inactiveRow = screen.getByRole("menuitem", { name: /elandra/i });
    expect(inactiveRow.querySelector("svg")).not.toBeInTheDocument();
  });

  test("switching writes activeCharacterId and closes the popover", async () => {
    mockUpdateGroupUserProfile.mockResolvedValue(undefined);
    setupMocks({
      characters: [
        { id: "c1", name: "Elandra" },
        { id: "c2", name: "Boros" },
      ],
      activeCharacterId: "c1",
    });

    render(<PostingAsList onSwitched={mockOnSwitched} />);

    await userEvent.click(screen.getByRole("menuitem", { name: /boros/i }));

    await waitFor(() => {
      expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith("user-1", {
        activeCharacterId: "c2",
      });
    });
    expect(mockOnSwitched).toHaveBeenCalled();
  });

  test("a failed switch keeps the popover open and shows why", async () => {
    mockUpdateGroupUserProfile.mockRejectedValue(
      new Error("Could not reach the server")
    );
    setupMocks({
      characters: [
        { id: "c1", name: "Elandra" },
        { id: "c2", name: "Boros" },
      ],
      activeCharacterId: "c1",
    });

    render(<PostingAsList onSwitched={mockOnSwitched} />);

    await userEvent.click(screen.getByRole("menuitem", { name: /boros/i }));

    expect(
      await screen.findByText("Could not reach the server")
    ).toBeInTheDocument();
    // The popover stays open -- the caller is only told to close it on success.
    expect(mockOnSwitched).not.toHaveBeenCalled();
  });

  test("renders nothing when the membership has no characters", () => {
    setupMocks({ characters: [], activeCharacterId: null });

    const { container } = render(<PostingAsList onSwitched={mockOnSwitched} />);

    expect(container).toBeEmptyDOMElement();
  });
});
