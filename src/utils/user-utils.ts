// src/utils/user-utils.ts

/**
 * Gets the user's display name based on active character or username
 * @param userProfile The user profile object
 * @returns The user's display name (character name or username)
 */
export const getUserDisplayName = (userProfile: any): string => {
    if (!userProfile) return '';
    
    // If there's an active character, use its name
    if (userProfile.activeCharacterId && userProfile.characterNames) {
      // Handle both string array and object array formats
      if (typeof userProfile.characterNames[0] === 'string') {
        // Legacy format - can't match by ID, just use username
        return userProfile.username;
      } else {
        // New format - can find by ID
        const activeCharacter = userProfile.characterNames.find(
          (char: any) => typeof char !== 'string' && char.id === userProfile.activeCharacterId
        );
        if (activeCharacter && typeof activeCharacter !== 'string') {
          return activeCharacter.name;
        }
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
  
  // More utility functions can be added as needed, ensuring they work with the actual UserProfile structure