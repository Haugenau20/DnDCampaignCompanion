// src/shared/hooks/__tests__/useCreatorName.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import useCreatorName from "../useCreatorName";

const mockGetProfile = jest.fn();

jest.mock("features/user-management", () => ({
  useFirebase: jest.fn(() => ({ activeGroupId: "group-1" })),
}));

jest.mock("core/services/firebase", () => ({
  __esModule: true,
  default: {
    user: { getCachedGroupUserProfile: (...args: unknown[]) => mockGetProfile(...args) },
  },
}));

const { useFirebase } = jest.requireMock("features/user-management");

describe("useCreatorName", () => {
  beforeEach(() => {
    mockGetProfile.mockReset();
    (useFirebase as jest.Mock).mockReturnValue({ activeGroupId: "group-1" });
  });

  it("names the character who was active when the record was written, over the username", () => {
    const { result } = renderHook(() =>
      useCreatorName({
        createdBy: "uid-1",
        createdByUsername: "Wren",
        createdByCharacterName: "Ilse Varn",
      })
    );
    expect(result.current).toBe("Ilse Varn");
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it("falls back to the stored username when no character was active", () => {
    const { result } = renderHook(() =>
      useCreatorName({ createdBy: "uid-1", createdByUsername: "Wren", createdByCharacterName: null })
    );
    expect(result.current).toBe("Wren");
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it("looks the author up by uid when the record stores no name", async () => {
    mockGetProfile.mockResolvedValue({ username: "Wren" });
    const { result } = renderHook(() => useCreatorName({ createdBy: "uid-1" }));

    await waitFor(() => expect(result.current).toBe("Wren"));
    expect(mockGetProfile).toHaveBeenCalledWith("group-1", "uid-1");
  });

  it("ignores who last edited the record: it credits the creator", () => {
    const record = {
      createdBy: "uid-1",
      createdByUsername: "Wren",
      modifiedBy: "uid-2",
      modifiedByUsername: "Corvin",
      modifiedByCharacterName: "Sable",
    };
    const { result } = renderHook(() => useCreatorName(record));
    expect(result.current).toBe("Wren");
  });

  it("names nobody when nothing identifies the author", () => {
    const { result } = renderHook(() => useCreatorName({}));
    expect(result.current).toBe("");
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it("names nobody when the author's profile has no username", async () => {
    mockGetProfile.mockResolvedValue({ username: "" });
    const { result } = renderHook(() => useCreatorName({ createdBy: "uid-1" }));

    await waitFor(() => expect(mockGetProfile).toHaveBeenCalled());
    expect(result.current).toBe("");
  });

  it("does not look anyone up outside a group", () => {
    (useFirebase as jest.Mock).mockReturnValue({ activeGroupId: null });
    const { result } = renderHook(() => useCreatorName({ createdBy: "uid-1" }));
    expect(result.current).toBe("");
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it("does not show one record's looked-up author on another", async () => {
    mockGetProfile.mockImplementation(async (_group: string, uid: string) =>
      uid === "uid-1" ? { username: "Wren" } : new Promise(() => {})
    );
    const { result, rerender } = renderHook(
      ({ createdBy }) => useCreatorName({ createdBy }),
      { initialProps: { createdBy: "uid-1" } }
    );
    await waitFor(() => expect(result.current).toBe("Wren"));

    rerender({ createdBy: "uid-2" });
    expect(result.current).toBe("");
  });
});
