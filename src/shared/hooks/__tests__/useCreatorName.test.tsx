// src/shared/hooks/__tests__/useCreatorName.test.tsx
//
// T132 (maintainer, 2026-10-08): an author is credited by the name they have
// now, looked up in the group's members; the name stored with the record is
// the fallback for someone who has left. Rewritten from the version that
// tested a per-uid profile fetch, which the member directory replaced.
import { renderHook } from "@testing-library/react";
import useCreatorName from "../useCreatorName";

let mockDirectory: Map<string, { username?: string; characters?: Array<{ id: string; name: string }> }> | undefined;
jest.mock("../useMemberDirectory", () => ({
  __esModule: true,
  useMemberDirectory: () => mockDirectory,
  default: () => mockDirectory,
}));

const name = (item: Parameters<typeof useCreatorName>[0]) => renderHook(() => useCreatorName(item)).result.current;

describe("useCreatorName", () => {
  beforeEach(() => {
    mockDirectory = new Map([
      ["uid-1", { username: "Wren", characters: [{ id: "c-1", name: "Ilse the Bold" }] }],
      ["uid-2", { username: "Corvin" }],
    ]);
  });

  it("names the character the record was written as, by the name it has now", () => {
    expect(name({ createdBy: "uid-1", createdByCharacterId: "c-1", createdByCharacterName: "Ilse Varn" })).toBe(
      "Ilse the Bold"
    );
  });

  it("names a member by their username now when no character was active", () => {
    expect(name({ createdBy: "uid-2", createdByUsername: "Old Name", createdByCharacterName: null })).toBe("Corvin");
  });

  it("keeps the stored character name for a character since retired", () => {
    expect(name({ createdBy: "uid-1", createdByCharacterId: "c-gone", createdByCharacterName: "Ilse Varn" })).toBe(
      "Ilse Varn"
    );
  });

  it("credits someone who has left the group by the name stored with the record", () => {
    expect(name({ createdBy: "uid-left", createdByUsername: "Mara" })).toBe("Mara");
  });

  it("uses the stored names while the directory loads", () => {
    mockDirectory = undefined;
    expect(name({ createdBy: "uid-1", createdByCharacterId: "c-1", createdByCharacterName: "Ilse Varn" })).toBe(
      "Ilse Varn"
    );
  });

  it("ignores who last edited the record: it credits the creator", () => {
    expect(name({ createdBy: "uid-2", modifiedBy: "uid-1", modifiedByCharacterName: "Ilse" } as never)).toBe("Corvin");
  });

  it("names nobody when nothing identifies the author", () => {
    expect(name({})).toBe("");
  });
});
