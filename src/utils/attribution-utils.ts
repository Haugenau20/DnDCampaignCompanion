// src/utils/attribution-utils.ts

/**
 * Interface for objects that have attribution data
 */
export interface AttributionData {
  createdBy?: string;
  createdByUsername?: string;
  dateAdded?: string;
  modifiedBy?: string;
  modifiedByUsername?: string;
  dateModified?: string;
}

/**
 * Formats a date string for display in attribution information
 * @param dateString - ISO date string or undefined
 * @returns Formatted date string in localized format or empty string if date is invalid
 */
export const formatAttributionDate = (dateString?: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    
    // Format date in localized format
    return date.toLocaleDateString('en-uk', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Checks if modification information should be displayed
 * @param data - Object containing attribution data
 * @returns Boolean indicating whether modification info should be shown
 */
export const shouldShowModification = (data: AttributionData): boolean => {
  if (!data.modifiedByUsername || !data.dateModified) return false;
  
  // Show if modifier is different from creator
  if (data.modifiedByUsername !== data.createdByUsername) return true;
  
  // Show if modification date is meaningfully later than creation date
  // (Adding small buffer to account for simultaneous operations)
  try {
    const modifiedTime = new Date(data.dateModified).getTime();
    const createdTime = new Date(data.dateAdded || '').getTime();
    return modifiedTime > createdTime + 1000; // 1 second buffer
  } catch (error) {
    return false;
  }
};

/**
 * Gets attribution text for an item's creation
 * @param data - Object containing attribution data
 * @returns String with creator and date information or empty string if data is incomplete
 */
export const getCreationAttributionText = (data: AttributionData): string => {
  if (!data.createdByUsername) return '';
  
  const dateText = formatAttributionDate(data.dateAdded);
  return dateText ? `Added by ${data.createdByUsername} on ${dateText}` : `Added by ${data.createdByUsername}`;
};

/**
 * Gets attribution text for an item's modification
 * @param data - Object containing attribution data
 * @returns String with modifier and date information or empty string if data is incomplete
 */
export const getModificationAttributionText = (data: AttributionData): string => {
  if (!data.modifiedByUsername || !data.dateModified) return '';
  
  const dateText = formatAttributionDate(data.dateModified);
  return dateText ? `Modified by ${data.modifiedByUsername} on ${dateText}` : `Modified by ${data.modifiedByUsername}`;
};

/**
 * Determines the attribution actor name based on the prioritization order:
 * 1. modifiedByCharacterName (character active during modification)
 * 2. modifiedByUsername
 * 3. modifiedBy -> profile name (looked up)
 * 4. createdByCharacterName (character active during creation)
 * 5. createdByUsername
 * 6. createdBy -> profile name (looked up)
 * 
 * @param item Content item with attribution fields
 * @param usernameMap Optional mapping of user IDs to usernames (for lookup)
 * @returns The determined actor name based on priority or empty string
 */
export const determineAttributionActor = (
  item: any, 
  usernameMap: Record<string, string> = {}
): string => {
  // First priority: modifiedByCharacterName (character active during modification)
  if (item.modifiedByCharacterName) {
    return item.modifiedByCharacterName;
  }
  
  // Second priority: modifiedByUsername
  if (item.modifiedByUsername) {
    return item.modifiedByUsername;
  }
  
  // Third priority: modifiedBy -> profile name (fallback)
  if (item.modifiedBy && usernameMap[item.modifiedBy]) {
    return usernameMap[item.modifiedBy];
  }
  
  // Fourth priority: createdByCharacterName (character active during creation)
  if (item.createdByCharacterName) {
    return item.createdByCharacterName;
  }
  
  // Fifth priority: createdByUsername
  if (item.createdByUsername) {
    return item.createdByUsername;
  }
  
  // Sixth priority: createdBy -> profile name (fallback)
  if (item.createdBy && usernameMap[item.createdBy]) {
    return usernameMap[item.createdBy];
  }
  
  return '';
};

/**
 * Fetches basic usernames for users as a fallback
 * Only used if the character names stored with content are not available
 * 
 * @param groupId Current group ID
 * @param userIds Array of user IDs to fetch information for
 * @param firebaseServices Firebase services object
 * @returns A mapping of user IDs to usernames
 */
export const fetchAttributionUsernames = async (
  groupId: string,
  userIds: string[],
  firebaseServices: any
): Promise<Record<string, string>> => {
  if (!groupId || !userIds.length) return {};
  
  const usernameMap: Record<string, string> = {};
  
  // Deduplicate user IDs
  const uniqueUserIds = [...new Set(userIds)];
  
  // Fetch user profiles in parallel - only basic usernames as fallback
  await Promise.all(
    uniqueUserIds.map(async (uid) => {
      try {
        // Get the user's group profile
        const userProfile = await firebaseServices.user.getGroupUserProfile(groupId, uid);
        
        if (userProfile?.username) {
          // Store basic username
          usernameMap[uid] = userProfile.username;
        }
      } catch (error) {
        console.error(`Error loading attribution info for ${uid}:`, error);
      }
    })
  );
  
  return usernameMap;
};