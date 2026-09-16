// src/features/user-management/profiles/hooks/useCharacterRoster.ts
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useGroups } from "../../groups/hooks/useGroups";
import { useUser } from "./useUser";
import { CharacterNameEntry } from "core/types/user";

/**
 * Generates a unique id for a new character name entry.
 */
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * What {@link useCharacterRoster} exposes to its components.
 */
export interface UseCharacterRosterResult {
  /** The character names on the active group membership. */
  characters: CharacterNameEntry[];
  /** The id of the character currently posting, or `null`. */
  activeCharacterId: string | null;
  /** Whether a mutation is in flight. */
  saving: boolean;
  /**
   * Failure message per character id, for a rename/remove/setActive that
   * failed on that row. Keyed even though nothing renders it per row yet --
   * that shape is what makes a later per-row error display a rendering
   * change rather than a rewrite.
   */
  rowErrors: Record<string, string>;
  /** Failure message for a failed add, kept separate from {@link rowErrors} because a new character has no id yet. */
  addError: string | null;
  /** Adds a character with the given name; the first character added becomes active automatically. */
  add: (name: string) => Promise<boolean>;
  /** Renames the character with the given id. */
  rename: (id: string, name: string) => Promise<boolean>;
  /** Removes the character with the given id, reassigning the active character if it was the one removed. */
  remove: (id: string) => Promise<boolean>;
  /** Sets the character with the given id as the active (posting-as) character. */
  setActive: (id: string) => Promise<boolean>;
}

/**
 * Character-roster state and its four mutations, extracted from
 * `UserProfile.tsx`. Every mutation writes to Firestore immediately and
 * rolls local state back on failure, exactly as the original component did.
 */
export function useCharacterRoster(): UseCharacterRosterResult {
  const { user } = useAuth();
  const { activeGroup, activeGroupUserProfile } = useGroups();
  const { updateGroupUserProfile } = useUser();

  const [characters, setCharacters] = useState<CharacterNameEntry[]>([]);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (activeGroupUserProfile) {
      setActiveCharacterId(activeGroupUserProfile.activeCharacterId || null);

      if (activeGroupUserProfile.characters && activeGroupUserProfile.characters.length > 0) {
        setCharacters(activeGroupUserProfile.characters);
      } else {
        setCharacters([]);
      }
    }
  }, [activeGroupUserProfile]);

  const clearRowError = (id: string) => {
    setRowErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const add = async (name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed || !user || saving || !activeGroup) return false;

    try {
      setSaving(true);
      setAddError(null);

      const newCharacter: CharacterNameEntry = { id: generateId(), name: trimmed };
      const updatedCharacters = [...characters, newCharacter];
      setCharacters(updatedCharacters);

      // If this is the first character, automatically set it as active.
      let newActiveId = activeCharacterId;
      if (characters.length === 0 && !activeCharacterId) {
        newActiveId = newCharacter.id;
        setActiveCharacterId(newActiveId);
      }

      await updateGroupUserProfile(user.uid, {
        characters: updatedCharacters,
        activeCharacterId: newActiveId,
      });

      return true;
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add character name");
      // Revert local state if the database update failed.
      setCharacters(characters);
      setActiveCharacterId(activeCharacterId);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const rename = async (id: string, name: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed || !user || saving || !activeGroup) return false;

    try {
      setSaving(true);
      clearRowError(id);

      const updatedCharacters = characters.map((char) =>
        char.id === id ? { ...char, name: trimmed } : char
      );
      setCharacters(updatedCharacters);

      await updateGroupUserProfile(user.uid, { characters: updatedCharacters });

      return true;
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Failed to update character name",
      }));
      setCharacters(characters);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (id: string): Promise<boolean> => {
    if (!user || saving || !activeGroup) return false;

    const previousActiveId = activeCharacterId;

    try {
      setSaving(true);
      clearRowError(id);

      setActiveCharacterId(id);

      await updateGroupUserProfile(user.uid, { activeCharacterId: id });

      return true;
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Failed to set active character",
      }));
      setActiveCharacterId(previousActiveId);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string): Promise<boolean> => {
    if (!user || saving || !activeGroup) return false;

    try {
      setSaving(true);
      clearRowError(id);

      const updatedCharacters = characters.filter((char) => char.id !== id);
      setCharacters(updatedCharacters);

      // If deleting the active character, reassign activeCharacterId.
      let newActiveId: string | null = activeCharacterId;
      if (activeCharacterId === id) {
        newActiveId = updatedCharacters.length > 0 ? updatedCharacters[0].id : null;
        setActiveCharacterId(newActiveId);
      }

      await updateGroupUserProfile(user.uid, {
        characters: updatedCharacters,
        activeCharacterId: newActiveId,
      });

      return true;
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Failed to delete character name",
      }));
      setCharacters(characters);
      setActiveCharacterId(activeCharacterId);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    characters,
    activeCharacterId,
    saving,
    rowErrors,
    addError,
    add,
    rename,
    remove,
    setActive,
  };
}
