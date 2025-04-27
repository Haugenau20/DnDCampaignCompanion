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
 * Determines the actor/attribution name with priority order
 * @param item Object containing potential attribution fields
 * @param usernameMap Optional map of UIDs to usernames for lookup
 * @returns The actor name based on priority order
 */
export const determineAttributionActor = (
  item: any, 
  usernameMap: Record<string, string> = {}
): string => {
  // Priority order: modifiedByUsername > modifiedBy > createdByUsername > createdBy
  if ('modifiedByUsername' in item && item.modifiedByUsername) {
    return item.modifiedByUsername;
  }
  if ('modifiedBy' in item && item.modifiedBy && usernameMap[item.modifiedBy]) {
    return usernameMap[item.modifiedBy];
  }
  if ('createdByUsername' in item && item.createdByUsername) {
    return item.createdByUsername;
  }
  if ('createdBy' in item && item.createdBy && usernameMap[item.createdBy]) {
    return usernameMap[item.createdBy];
  }
  return '';
};