// src/shared/utils/author-name.ts

/** One member, as the directory holds them. */
export interface DirectoryMember {
  username?: string;
  characters?: Array<{ id: string; name: string }>;
}

/** The group's members by uid; undefined while it loads. */
export type MemberDirectory = ReadonlyMap<string, DirectoryMember> | undefined;

/** Who wrote something, as a record stores it. */
export interface AuthorRef {
  uid?: string | null;
  characterId?: string | null;
  /** The character's name when it was written; the fallback. */
  storedCharacterName?: string | null;
  /** The username when it was written; the fallback. */
  storedUsername?: string | null;
}

/**
 * The name to credit an author by (T132; maintainer, 2026-10-08): **the name
 * they have now**, so a renamed character or member is renamed everywhere.
 *
 * - A member who wrote as a character they still have: that character's name.
 * - A member otherwise: their username -- or, for a character since retired
 *   or a record written before characters had ids, the name stored with it.
 * - Someone who has left the group, or while the directory loads: the name
 *   stored at writing time, which is what it is kept for.
 *
 * @param author Who wrote it
 * @param directory The group's members
 * @returns The name, or `''` when nothing names them
 */
export function authorName(author: AuthorRef, directory: MemberDirectory): string {
  const stored = author.storedCharacterName || author.storedUsername || '';
  const member = author.uid ? directory?.get(author.uid) : undefined;
  if (!member) return stored;

  if (author.characterId) {
    const character = member.characters?.find((candidate) => candidate.id === author.characterId);
    if (character?.name) return character.name;
  }
  return author.storedCharacterName || member.username || author.storedUsername || '';
}

/** The creator of a record, as {@link authorName} reads them. */
export const creatorRef = (item: {
  createdBy?: string | null;
  createdByCharacterId?: string | null;
  createdByCharacterName?: string | null;
  createdByUsername?: string | null;
}): AuthorRef => ({
  uid: item.createdBy,
  characterId: item.createdByCharacterId,
  storedCharacterName: item.createdByCharacterName,
  storedUsername: item.createdByUsername,
});

/** The last editor of a record, as {@link authorName} reads them. */
export const modifierRef = (item: {
  modifiedBy?: string | null;
  modifiedByCharacterId?: string | null;
  modifiedByCharacterName?: string | null;
  modifiedByUsername?: string | null;
}): AuthorRef => ({
  uid: item.modifiedBy,
  characterId: item.modifiedByCharacterId,
  storedCharacterName: item.modifiedByCharacterName,
  storedUsername: item.modifiedByUsername,
});

/**
 * Who touched a record last: its last editor, else its creator -- each by the
 * name they have now. The activity feed's "by" line.
 *
 * @param item The record's attribution
 * @param directory The group's members
 * @returns The name, or `''`
 */
export function lastActorName(
  item: Parameters<typeof creatorRef>[0] & Parameters<typeof modifierRef>[0],
  directory: MemberDirectory
): string {
  return authorName(modifierRef(item), directory) || authorName(creatorRef(item), directory);
}
