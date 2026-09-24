// functions/src/partyCharacters.ts
//
// Keeping the party's own characters out of smart detection (T019).
//
// Extraction used to be told "every named person is an NPC", with no notion
// of who the players are, so a note about the party suggested each of them
// as an NPC to create. The roster already exists -- every group profile at
// `groups/{g}/users/{uid}` carries `characters[]` -- so nobody has to type it
// in; the callable reads it from the group the note was written in.
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";

/**
 * The names of every character in the group, for the caller's own group only.
 *
 * Read on the server rather than sent by the client, so the list is the
 * group's real roster and not whatever a caller put in the payload. The
 * caller must be a member: this is the whole group's roster, and a
 * non-member has no business reading it.
 *
 * @param {admin.firestore.Firestore} db Firestore
 * @param {string} groupId The group the note belongs to
 * @param {string} uid The caller
 * @return {Promise<string[]>} Distinct, trimmed, non-empty names
 */
export async function readPartyCharacterNames(
  db: admin.firestore.Firestore,
  groupId: string,
  uid: string
): Promise<string[]> {
  const members = db.collection(`groups/${groupId}/users`);
  const self = await members.doc(uid).get();
  if (!self.exists) {
    throw new HttpsError("permission-denied", "Not a member of this group");
  }

  const names = new Set<string>();
  (await members.get()).forEach((profile) => {
    const characters = profile.data().characters;
    if (!Array.isArray(characters)) return;
    for (const character of characters) {
      const name = typeof character?.name === "string" ? character.name.trim() : "";
      if (name) names.add(name);
    }
  });
  return [...names];
}

/**
 * The prompt's paragraph naming the party, or nothing when there is none.
 *
 * Each name is JSON-quoted: a character name is user text, and quoting keeps
 * it a name inside the instruction rather than part of it.
 *
 * @param {string[]} names The party's character names
 * @return {string} The paragraph, or the empty string
 */
export function partyPrompt(names: string[]): string {
  if (names.length === 0) return "";
  return `
The party's own player characters are: ${names.map((n) => JSON.stringify(n)).join(", ")}.
They are the players, not NPCs. Never return any of them as an entity -- not by
name, and not by a nickname, title or short form that clearly means one of them.
`;
}

const normalise = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Drops every NPC whose name is exactly a party character's.
 *
 * The prompt already asks for this; this is the net under it, for the run
 * where the model ignores the instruction. Exact (case- and
 * whitespace-insensitive) only -- a nickname is the prompt's job, because a
 * fuzzy match here would throw away real NPCs who share a first name.
 *
 * @param {T[]} entities What the model returned
 * @param {string[]} names The party's character names
 * @return {T[]} The entities, less the party
 */
export function dropPartyCharacters<T extends {type?: unknown; name?: unknown}>(
  entities: T[],
  names: string[]
): T[] {
  if (names.length === 0 || !Array.isArray(entities)) return entities;
  const party = new Set(names.map(normalise));
  return entities.filter((entity) =>
    !(entity?.type === "npc" && typeof entity.name === "string" && party.has(normalise(entity.name)))
  );
}
