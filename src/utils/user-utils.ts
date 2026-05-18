// src/utils/user-utils.ts

/**
 * Gets the user's display name based on active character or username
 * @param userProfile The user profile object
 * @returns The user's display name (character name or username)
 */
export const getUserDisplayName = (userProfile: any): string => {
  if (!userProfile) return '';

  if (userProfile.activeCharacterId && Array.isArray(userProfile.characters)) {
    const activeCharacter = userProfile.characters.find(
      (char: any) => char && typeof char === 'object' && char.id === userProfile.activeCharacterId
    );

    if (activeCharacter) {
      return activeCharacter.name;
    }
  }

  return userProfile.username || '';
};

/**
 * Gets the user's username
 * @param userProfile The user profile object
 * @returns The user's username or empty string if not available
 */
export const getUserName = (userProfile: any): string => {
  return userProfile?.username || '';
};

/**
 * Gets the user's active character ID
 * @param userProfile The user profile object
 * @returns The active character ID or null if not available
 */
export const getActiveCharacterId = (userProfile: any): string | null => {
  return userProfile?.activeCharacterId || null;
};

/**
 * Gets the active character name
 * @param userProfile The user profile object
 * @returns The active character name or null if not found
 */
export const getActiveCharacterName = (userProfile: any): string | null => {
  if (!userProfile || !Array.isArray(userProfile.characters) || !userProfile.activeCharacterId) return null;

  const activeCharacter = userProfile.characters.find(
    (char: any) => char && typeof char === 'object' && char.id === userProfile.activeCharacterId
  );

  return activeCharacter ? activeCharacter.name : null;
};