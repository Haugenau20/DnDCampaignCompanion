// src/core/attribution/__tests__/attribution.test.ts

import { buildCreationAttribution, buildModificationAttribution, recordTimes, toTime } from "../attribution";

describe("attribution", () => {
  const uid = "user-123";

  const profileWithCharacter = {
    userId: uid,
    username: "alice",
    characters: [
      { id: "char-1", name: "Gandalf" },
      { id: "char-2", name: "Frodo" },
    ],
    activeCharacterId: "char-1",
  };

  describe("buildCreationAttribution", () => {
    test("maps all fields correctly from a realistic profile object", () => {
      const result = buildCreationAttribution({
        uid,
        activeGroupUserProfile: profileWithCharacter,
      });

      expect(result.createdBy).toBe(uid);
      expect(result.createdByUsername).toBe("alice");
      expect(result.createdByCharacterId).toBe("char-1");
      expect(result.createdByCharacterName).toBe("Gandalf");
      expect(result.modifiedBy).toBe(uid);
      expect(result.modifiedByUsername).toBe("alice");
      expect(result.modifiedByCharacterId).toBe("char-1");
      expect(result.modifiedByCharacterName).toBe("Gandalf");
      expect(typeof result.dateAdded).toBe("string");
      expect(typeof result.dateModified).toBe("string");
    });

    test("sets created* and modified* to identical values, with dateAdded === dateModified", () => {
      const result = buildCreationAttribution({
        uid,
        activeGroupUserProfile: profileWithCharacter,
      });

      expect(result.modifiedBy).toBe(result.createdBy);
      expect(result.modifiedByUsername).toBe(result.createdByUsername);
      expect(result.modifiedByCharacterId).toBe(result.createdByCharacterId);
      expect(result.modifiedByCharacterName).toBe(result.createdByCharacterName);
      expect(result.dateAdded).toBe(result.dateModified);
    });

    test("yields null for character id/name fields when activeCharacterId is absent", () => {
      const profileWithoutCharacter = { userId: uid, username: "bob" };

      const result = buildCreationAttribution({
        uid,
        activeGroupUserProfile: profileWithoutCharacter,
      });

      expect(result.createdByCharacterId).toBeNull();
      expect(result.createdByCharacterName).toBeNull();
      expect(result.modifiedByCharacterId).toBeNull();
      expect(result.modifiedByCharacterName).toBeNull();
    });

    test("yields null for character id/name fields when profile is null", () => {
      const result = buildCreationAttribution({
        uid,
        activeGroupUserProfile: null,
      });

      expect(result.createdBy).toBe(uid);
      expect(result.createdByUsername).toBe("");
      expect(result.createdByCharacterId).toBeNull();
      expect(result.createdByCharacterName).toBeNull();
    });

    test("produces valid ISO timestamps", () => {
      const result = buildCreationAttribution({
        uid,
        activeGroupUserProfile: profileWithCharacter,
      });

      expect(new Date(result.dateAdded).toISOString()).toBe(result.dateAdded);
      expect(new Date(result.dateModified as string).toISOString()).toBe(result.dateModified);
    });
  });

  describe("buildModificationAttribution", () => {
    test("returns only the modified* fields plus dateModified (no created* keys)", () => {
      const result = buildModificationAttribution({
        uid,
        activeGroupUserProfile: profileWithCharacter,
      });

      expect(Object.keys(result).sort()).toEqual(
        [
          "dateModified",
          "modifiedBy",
          "modifiedByCharacterId",
          "modifiedByCharacterName",
          "modifiedByUsername",
        ].sort()
      );
      expect(result).not.toHaveProperty("createdBy");
      expect(result).not.toHaveProperty("createdByUsername");
      expect(result).not.toHaveProperty("createdByCharacterId");
      expect(result).not.toHaveProperty("createdByCharacterName");
      expect(result).not.toHaveProperty("dateAdded");
    });

    test("maps fields correctly from a realistic profile object", () => {
      const result = buildModificationAttribution({
        uid,
        activeGroupUserProfile: profileWithCharacter,
      });

      expect(result.modifiedBy).toBe(uid);
      expect(result.modifiedByUsername).toBe("alice");
      expect(result.modifiedByCharacterId).toBe("char-1");
      expect(result.modifiedByCharacterName).toBe("Gandalf");
    });

    test("yields null for character id/name fields when activeCharacterId is absent", () => {
      const result = buildModificationAttribution({
        uid,
        activeGroupUserProfile: { userId: uid, username: "bob" },
      });

      expect(result.modifiedByCharacterId).toBeNull();
      expect(result.modifiedByCharacterName).toBeNull();
    });

    test("yields null for character id/name fields when profile is undefined", () => {
      const result = buildModificationAttribution({
        uid,
        activeGroupUserProfile: undefined,
      });

      expect(result.modifiedBy).toBe(uid);
      expect(result.modifiedByUsername).toBe("");
      expect(result.modifiedByCharacterId).toBeNull();
      expect(result.modifiedByCharacterName).toBeNull();
    });

    test("produces a valid ISO timestamp", () => {
      const result = buildModificationAttribution({
        uid,
        activeGroupUserProfile: profileWithCharacter,
      });

      expect(new Date(result.dateModified as string).toISOString()).toBe(result.dateModified);
    });
  });
});

// T132: records carry the server's times beside the old client-written
// strings; readers take the server's where they can.
describe("recordTimes", () => {
  const at = (iso: string) => ({ toDate: () => new Date(iso) });

  it("takes the server's times over the strings", () => {
    const times = recordTimes({
      createdAt: at("2026-10-01T10:00:00Z"),
      modifiedAt: at("2026-10-02T10:00:00Z"),
      dateAdded: "2020-01-01T00:00:00Z",
      dateModified: "2020-01-02T00:00:00Z",
    });
    expect(times.created?.toISOString()).toBe("2026-10-01T10:00:00.000Z");
    expect(times.modified?.toISOString()).toBe("2026-10-02T10:00:00.000Z");
  });

  it("falls back to the strings, and a never-edited record to its creation", () => {
    const times = recordTimes({ dateAdded: "2020-01-01T00:00:00Z" });
    expect(times.created?.toISOString()).toBe("2020-01-01T00:00:00.000Z");
    expect(times.modified).toEqual(times.created);
  });

  it("reads a pending server time, or an unreadable string, as none", () => {
    expect(toTime({ isEqual: () => false })).toBeNull();
    expect(toTime("not a date")).toBeNull();
    expect(recordTimes(null)).toEqual({ created: null, modified: null });
  });
});
