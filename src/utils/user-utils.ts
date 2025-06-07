// src/utils/user-utils.ts

/**
 * Gets the user's display name based on active character or username
 * @param userProfile The user profile object
 * @returns The user's display name (character name or username)
 */
export const getUserDisplayName = (userProfile: any): string => {
  if (!userProfile) return '';
  
  // Only use the dedicated activeCharacterId field
  if (userProfile.activeCharacterId && userProfile.characters) {
    // Only support the object array format
    const activeCharacter = userProfile.characters.find(
      (char: any) => typeof char !== 'string' && char.id === userProfile.activeCharacterId
    );
    
    if (activeCharacter && typeof activeCharacter !== 'string') {
      return activeCharacter.name;
    }
  }
  
  // Fallback to username if no active character or character not found
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
  if (!userProfile || !userProfile.characters || !userProfile.activeCharacterId) return null;
  
  const activeCharacter = userProfile.characters.find(
    (char: any) => typeof char !== 'string' && char.id === userProfile.activeCharacterId
  );
  
  return activeCharacter ? activeCharacter.name : null;
};