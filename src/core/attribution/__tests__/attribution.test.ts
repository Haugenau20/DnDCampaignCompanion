// src/core/attribution/__tests__/attribution.test.ts

import { buildCreationAttribution, buildModificationAttribution } from "../attribution";

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
