// src/features/user-management/profiles/hooks/__tests__/useCharacterRoster.test.ts
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCharacterRoster } from "../useCharacterRoster";

const mockUpdateGroupUserProfile = jest.fn();

jest.mock("@/features/user-management", () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock("../../../auth/hooks/useAuth", () => require("@/features/user-management"));
jest.mock("../../../groups/hooks/useGroups", () => require("@/features/user-management"));
jest.mock("../useUser", () => require("@/features/user-management"));

const { useAuth, useGroups, useUser } = require("@/features/user-management");

const mockUser = { uid: "user-1" };
const mockGroup = { id: "group-1", name: "Test Campaign" };

function setupMocks(profile: any) {
  useAuth.mockReturnValue({ user: mockUser });
  useGroups.mockReturnValue({ activeGroup: mockGroup, activeGroupUserProfile: profile });
  useUser.mockReturnValue({ updateGroupUserProfile: mockUpdateGroupUserProfile });
}

describe("useCharacterRoster", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks({ activeCharacterId: null, characters: [] });
    mockUpdateGroupUserProfile.mockResolvedValue(undefined);
  });

  test("initializes characters and activeCharacterId from the active group profile", () => {
    setupMocks({
      activeCharacterId: "char-1",
      characters: [{ id: "char-1", name: "Gandalf" }],
    });

    const { result } = renderHook(() => useCharacterRoster());

    expect(result.current.characters).toEqual([{ id: "char-1", name: "Gandalf" }]);
    expect(result.current.activeCharacterId).toBe("char-1");
  });

  test("add() creates a character and persists it", async () => {
    const { result } = renderHook(() => useCharacterRoster());

    await act(async () => {
      await result.current.add("Frodo");
    });

    expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        characters: expect.arrayContaining([expect.objectContaining({ name: "Frodo" })]),
      })
    );
    expect(result.current.characters.map((c) => c.name)).toContain("Frodo");
  });

  test("add() sets the first character as active automatically", async () => {
    const { result } = renderHook(() => useCharacterRoster());

    await act(async () => {
      await result.current.add("Frodo");
    });

    expect(result.current.activeCharacterId).toBe(result.current.characters[0].id);
    expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ activeCharacterId: result.current.characters[0].id })
    );
  });

  test("keys errors by character id", async () => {
    setupMocks({
      activeCharacterId: "char-1",
      characters: [
        { id: "char-1", name: "Gandalf" },
        { id: "char-2", name: "Frodo" },
      ],
    });
    mockUpdateGroupUserProfile.mockRejectedValueOnce(new Error("Save failed"));

    const { result } = renderHook(() => useCharacterRoster());

    await act(async () => {
      await result.current.rename("char-1", "Saruman");
    });

    expect(result.current.rowErrors["char-1"]).toMatch(/save failed/i);
    expect(result.current.rowErrors["char-2"]).toBeUndefined();
  });

  test("rolls local state back when a mutation fails, keyed by character id", async () => {
    setupMocks({
      activeCharacterId: "char-1",
      characters: [{ id: "char-1", name: "Gandalf" }],
    });
    mockUpdateGroupUserProfile.mockRejectedValue(new Error("Save failed"));

    const { result } = renderHook(() => useCharacterRoster());

    await act(async () => {
      await result.current.rename("char-1", "Saruman");
    });

    // Local state rolled back to what it was before the failed mutation.
    expect(result.current.characters).toEqual([{ id: "char-1", name: "Gandalf" }]);
    expect(result.current.rowErrors["char-1"]).toMatch(/save failed/i);
  });

  test("clears a row's error when that row's next mutation succeeds", async () => {
    setupMocks({
      activeCharacterId: "char-1",
      characters: [{ id: "char-1", name: "Gandalf" }],
    });
    mockUpdateGroupUserProfile.mockRejectedValueOnce(new Error("Save failed"));

    const { result } = renderHook(() => useCharacterRoster());

    await act(async () => {
      await result.current.rename("char-1", "Saruman");
    });
    expect(result.current.rowErrors["char-1"]).toBeTruthy();

    mockUpdateGroupUserProfile.mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.rename("char-1", "Saruman the White");
    });

    expect(result.current.rowErrors["char-1"]).toBeUndefined();
  });

  test("keeps a single addError slot for a failed add, distinct from rowErrors", async () => {
    mockUpdateGroupUserProfile.mockRejectedValue(new Error("Add failed"));
    const { result } = renderHook(() => useCharacterRoster());

    await act(async () => {
      await result.current.add("NewChar");
    });

    expect(result.current.addError).toMatch(/add failed/i);
    expect(result.current.rowErrors).toEqual({});
    // Local state reverted -- the character never actually got added.
    expect(result.current.characters).toEqual([]);
  });

  test("setActive updates activeCharacterId and persists it", async () => {
    setupMocks({
      activeCharacterId: "char-1",
      characters: [
        { id: "char-1", name: "Gandalf" },
        { id: "char-2", name: "Frodo" },
      ],
    });
    const { result } = renderHook(() => useCharacterRoster());

    await act(async () => {
      await result.current.setActive("char-2");
    });

    expect(result.current.activeCharacterId).toBe("char-2");
    expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ activeCharacterId: "char-2" })
    );
  });

  test("remove deletes the character and reassigns activeCharacterId when it was active", async () => {
    setupMocks({
      activeCharacterId: "char-1",
      characters: [{ id: "char-1", name: "Gandalf" }],
    });
    const { result } = renderHook(() => useCharacterRoster());

    await act(async () => {
      await result.current.remove("char-1");
    });

    await waitFor(() => expect(result.current.characters).toEqual([]));
    expect(result.current.activeCharacterId).toBeNull();
    expect(mockUpdateGroupUserProfile).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ characters: [] })
    );
  });
});
