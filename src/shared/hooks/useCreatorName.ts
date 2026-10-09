// src/shared/hooks/useCreatorName.ts
import { authorName, creatorRef } from "../utils/author-name";
import { useMemberDirectory } from "./useMemberDirectory";

/** The creation half of a record's attribution. */
export interface CreatorFields {
  createdBy?: string;
  createdByUsername?: string;
  createdByCharacterId?: string | null;
  createdByCharacterName?: string | null;
}

/**
 * The name a record's creator is credited by, as the record's own page does
 * it (`AttributionInfo`): the name they have now (T132) -- the character they
 * wrote as, else their username -- and the name stored with the record only
 * for someone who has left the group.
 *
 * Only the creator fields are read, so a later edit never changes who is
 * credited with recording it (T124).
 *
 * @param item The record's creation attribution
 * @returns The creator's name, or `''` when nothing names them
 */
export const useCreatorName = (item: CreatorFields): string =>
  authorName(creatorRef(item), useMemberDirectory());

export default useCreatorName;
