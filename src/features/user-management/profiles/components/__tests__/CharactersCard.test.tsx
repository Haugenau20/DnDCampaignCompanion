// src/features/user-management/profiles/components/__tests__/CharactersCard.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  test("is subtitled with what 'posting as' means", () => {
    render(<CharactersCard />);
    expect(
      screen.getByText(
        "The one marked 'posting as' is used when you create content in this group."
      )
    ).toBeInTheDocument();
  });

  test("should display message when no active character", () => {
    render(<CharactersCard />);
    expect(screen.getByText(/no active character selected/i)).toBeInTheDocument();
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
    const charInput = screen.getByPlaceholderText(/add new character/i);
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

  test('should show "Set Active" button for non-active characters', () => {
    setupMocks({
      activeCharacterId: "char-1",
      characters: [
        { id: "char-1", name: "Gandalf" },
        { id: "char-2", name: "Frodo" },
      ],
    });
    render(<CharactersCard />);
    expect(screen.getByRole("button", { name: /set active/i })).toBeInTheDocument();
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

    await userEvent.click(screen.getByRole("button", { name: /set active/i }));
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
    const charInput = screen.getByPlaceholderText(/add new character/i);
    fireEvent.change(charInput, { target: { value: "NewChar" } });
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    await waitFor(() => {
      expect(screen.getByText(/save failed/i)).toBeInTheDocument();
    });
  });

  test("should enter edit mode for a character when edit button is clicked", async () => {
    setupMocks({
      activeCharacterId: null,
      characters: [{ id: "char-1", name: "Gandalf" }],
    });
    render(<CharactersCard />);
    expect(screen.getByText("Gandalf")).toBeInTheDocument();
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

    const charRow = screen.getByText("Gandalf").closest('div[class*="flex items-center justify-between"]');
    expect(charRow).toBeTruthy();
    const deleteBtn = Array.from(charRow!.querySelectorAll("button")).at(-1);
    expect(deleteBtn).toBeTruthy();
    await userEvent.click(deleteBtn!);
    await waitFor(() => {
      expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ characters: [] })
      );
    });
  });
});
