// src/features/user-management/profiles/components/__tests__/CharactersCard.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharactersCard from "../CharactersCard";

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

const mockUser = { uid: "user-1" };
const mockGroup = { id: "group-1", name: "Test Campaign" };

function setupMocks(profile: any) {
  useAuth.mockReturnValue({ user: mockUser });
  useGroups.mockReturnValue({ activeGroup: mockGroup, activeGroupUserProfile: profile });
  useUser.mockReturnValue({ updateGroupUserProfile: mockUpdateGroupUserProfile });
}

const emptyProfile = { activeCharacterId: null, characters: [] };

describe("CharactersCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks(emptyProfile);
    mockUpdateGroupUserProfile.mockResolvedValue(undefined);
  });

  // "No active character selected" now belongs to the group card's posting-as
  // row, and is asserted in GroupMembershipCard.test.tsx. This card must NOT
  // repeat it: the duplicate display is what the redesign removed.
  test("does not repeat the posting-as status the group card already states", () => {
    render(<CharactersCard />);
    expect(screen.queryByText(/no active character selected/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^active character$/i)).not.toBeInTheDocument();
  });

  test("should display active character name when set", () => {
    setupMocks({
      activeCharacterId: "char-1",
      characters: [{ id: "char-1", name: "Gandalf" }],
    });
    render(<CharactersCard />);
    expect(screen.getAllByText("Gandalf").length).toBeGreaterThanOrEqual(1);
  });

  test('should display "No character names added yet" when characters list is empty', () => {
    render(<CharactersCard />);
    expect(screen.getByText(/no character names added yet/i)).toBeInTheDocument();
  });

  test("should render Add button for new character", () => {
    render(<CharactersCard />);
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  test("should call updateGroupUserProfile when adding a character", async () => {
    render(<CharactersCard />);
    const charInput = screen.getByPlaceholderText(/add a character/i);
    fireEvent.change(charInput, { target: { value: "Frodo" } });
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          characters: expect.arrayContaining([expect.objectContaining({ name: "Frodo" })]),
        })
      );
    });
  });

  test("should display character list when characters exist", () => {
    setupMocks({
      activeCharacterId: "char-1",
      characters: [
        { id: "char-1", name: "Gandalf" },
        { id: "char-2", name: "Frodo" },
      ],
    });
    render(<CharactersCard />);
    expect(screen.getAllByText("Gandalf").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Frodo")).toBeInTheDocument();
  });

  test('should show "Post as this" button for non-active characters', () => {
    setupMocks({
      activeCharacterId: "char-1",
      characters: [
        { id: "char-1", name: "Gandalf" },
        { id: "char-2", name: "Frodo" },
      ],
    });
    render(<CharactersCard />);
    expect(screen.getByRole("button", { name: "Post as this" })).toBeInTheDocument();
  });

  test("should call updateGroupUserProfile when setting a character as active", async () => {
    setupMocks({
      activeCharacterId: "char-1",
      characters: [
        { id: "char-1", name: "Gandalf" },
        { id: "char-2", name: "Frodo" },
      ],
    });
    render(<CharactersCard />);

    await userEvent.click(screen.getByRole("button", { name: "Post as this" }));
    await waitFor(() => {
      expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ activeCharacterId: "char-2" })
      );
    });
  });

  test("should show error when adding a character fails", async () => {
    mockUpdateGroupUserProfile.mockRejectedValue(new Error("Save failed"));
    render(<CharactersCard />);
    const charInput = screen.getByPlaceholderText(/add a character/i);
    fireEvent.change(charInput, { target: { value: "NewChar" } });
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(screen.getByText(/save failed/i)).toBeInTheDocument();
    });
  });

  test("renames a character through the row's inline rename", async () => {
    setupMocks({
      activeCharacterId: null,
      characters: [{ id: "char-1", name: "Gandalf" }],
    });
    render(<CharactersCard />);

    await userEvent.click(screen.getByRole("button", { name: "Rename" }));
    const input = screen.getByLabelText(/rename gandalf/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Saruman");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          characters: expect.arrayContaining([expect.objectContaining({ name: "Saruman" })]),
        })
      );
    });
  });

  test("should call updateGroupUserProfile when deleting a character", async () => {
    setupMocks({
      activeCharacterId: null,
      characters: [{ id: "char-1", name: "Gandalf" }],
    });
    render(<CharactersCard />);

    await waitFor(() => {
      expect(screen.getByText("Gandalf")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ characters: [] })
      );
    });
  });

  test("a failure on one row does not show under another row", async () => {
    setupMocks({
      activeCharacterId: null,
      characters: [
        { id: "char-1", name: "Gandalf" },
        { id: "char-2", name: "Frodo" },
      ],
    });
    mockUpdateGroupUserProfile.mockRejectedValueOnce(new Error("Save failed"));
    render(<CharactersCard />);

    // Each row briefly unmounts and remounts around a failed mutation (the
    // optimistic update removes it from the list, then the rollback restores
    // it), so the row is re-queried fresh rather than held across the click.
    await userEvent.click(
      within(screen.getByTestId("character-row-char-1")).getByRole("button", { name: "Remove" })
    );
    await userEvent.click(
      within(screen.getByTestId("character-row-char-1")).getByRole("button", { name: "Remove" })
    );

    await waitFor(() => {
      expect(within(screen.getByTestId("character-row-char-1")).getByText(/save failed/i)).toBeInTheDocument();
    });

    expect(within(screen.getByTestId("character-row-char-2")).queryByText(/save failed/i)).not.toBeInTheDocument();
  });

  test("the add row keeps its own input and error while a row is being renamed", async () => {
    setupMocks({
      activeCharacterId: null,
      characters: [{ id: "char-1", name: "Gandalf" }],
    });
    mockUpdateGroupUserProfile.mockRejectedValueOnce(new Error("Add failed"));
    render(<CharactersCard />);

    await userEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(screen.getByLabelText(/rename gandalf/i)).toBeInTheDocument();

    const addInput = screen.getByPlaceholderText(/add a character/i);
    await userEvent.type(addInput, "Aragorn");
    expect(addInput).toHaveValue("Aragorn");

    await userEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(screen.getByText(/add failed/i)).toBeInTheDocument();
    });
    // The rename in progress is untouched by the add row's own failure.
    expect(screen.getByLabelText(/rename gandalf/i)).toBeInTheDocument();
  });
});
