// src/core/attribution/attribution.ts

// Bare baseUrl-style imports, not the "@/" alias: react-scripts' webpack config
// honours tsconfig `baseUrl` but ignores `paths`, so "@/..." resolves under tsc
// and jest yet fails the production build with "Module not found".
import type { ContentAttribution } from "../types/common";
import { getUserName, getActiveCharacterName } from "../utils/user-utils";

/**
 * Minimal shape the attribution helpers need.
 *
 * `activeGroupUserProfile` is typed `any` to match the parameter type already
 * accepted by `getUserName` / `getActiveCharacterName` in `user-utils.ts`. Those
 * utilities are not being refactored as part of this change, so the helper
 * accepts the same loose shape rather than introducing a stricter type that
 * would not actually be enforced end-to-end.
 */
export interface AttributionSource {
  /** UID of the acting user (the author of the create/update). */
  uid: string;
  /** The active group user profile for the acting user, if any. */
  activeGroupUserProfile: any;
}

/**
 * Builds the full attribution metadata for a newly created content item.
 *
 * Sets both the `created*` and `modified*` fields to the same actor and the
 * same timestamp, since creation and initial modification are the same event.
 *
 * @param src The acting user's uid and active group user profile.
 * @returns A complete {@link ContentAttribution} object.
 */
export function buildCreationAttribution(src: AttributionSource): ContentAttribution {
  const now = new Date().toISOString();
  const username = getUserName(src.activeGroupUserProfile);
  const characterId = src.activeGroupUserProfile?.activeCharacterId ?? null;
  const characterName = getActiveCharacterName(src.activeGroupUserProfile);

  return {
    createdBy: src.uid,
    createdByUsername: username,
    createdByCharacterId: characterId,
    createdByCharacterName: characterName,
    dateAdded: now,
    modifiedBy: src.uid,
    modifiedByUsername: username,
    modifiedByCharacterId: characterId,
    modifiedByCharacterName: characterName,
    dateModified: now,
  };
}

/**
 * Builds the attribution delta for a modification to an existing content item.
 *
 * Only returns the `modified*` fields (plus `dateModified`) so the caller can
 * spread it over the existing entity without disturbing the `created*` fields.
 *
 * @param src The acting user's uid and active group user profile.
 * @returns The subset of {@link ContentAttribution} fields touched by a modification.
 */
export function buildModificationAttribution(
  src: AttributionSource,
): Pick<
  ContentAttribution,
  | "modifiedBy"
  | "modifiedByUsername"
  | "modifiedByCharacterId"
  | "modifiedByCharacterName"
  | "dateModified"
> {
  return {
    modifiedBy: src.uid,
    modifiedByUsername: getUserName(src.activeGroupUserProfile),
    modifiedByCharacterId: src.activeGroupUserProfile?.activeCharacterId ?? null,
    modifiedByCharacterName: getActiveCharacterName(src.activeGroupUserProfile),
    dateModified: new Date().toISOString(),
  };
}
