// src/utils/dateFormatter.ts

/**
 * Converts a Firestore timestamp (or any timestamp-like value) to a JavaScript Date
 * @param firestoreTimestamp The timestamp from Firestore (can be timestamp object, string, or Date)
 * @returns JavaScript Date object or null if conversion fails
 */
export const convertFirestoreTimestamp = (firestoreTimestamp: any): Date | null => {
    if (!firestoreTimestamp) return null;
    
    try {
      // Case 1: Already a JavaScript Date
      if (firestoreTimestamp instanceof Date) {
        return firestoreTimestamp;
      }
      
      // Case 2: Firestore Timestamp object with seconds and nanoseconds
      if (firestoreTimestamp.seconds !== undefined && firestoreTimestamp.nanoseconds !== undefined) {
        return new Date(firestoreTimestamp.seconds * 1000 + Math.floor(firestoreTimestamp.nanoseconds / 1000000));
      }
      
      // Case 3: Firestore Timestamp with toDate() method (native Firestore SDK format)
      if (typeof firestoreTimestamp.toDate === 'function') {
        return firestoreTimestamp.toDate();
      }
      
      // Case 4: ISO string or any string format that JavaScript Date can parse
      if (typeof firestoreTimestamp === 'string') {
        const parsedDate = new Date(firestoreTimestamp);
        // Check if the date is valid
        return isNaN(parsedDate.getTime()) ? null : parsedDate;
      }
      
      // Case 5: Timestamp in milliseconds (number)
      if (typeof firestoreTimestamp === 'number') {
        return new Date(firestoreTimestamp);
      }
      
      return null;
    } catch (error) {
      console.error('Error converting Firestore timestamp:', error);
      return null;
    }
  };
  
  /**
   * Format a date to a relative time string (e.g., "2 hours ago")
   * Handles Firestore timestamps and other date formats
   * @param date The date to format (can be Date, Firestore timestamp, or string)
   * @returns Formatted relative time string or empty string if invalid
   */
  export const getRelativeTime = (date: any): string => {
    const convertedDate = convertFirestoreTimestamp(date);
    if (!convertedDate) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - convertedDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 7) return convertedDate.toLocaleDateString();
    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return 'Just now';
  };
  
  /**
   * Format a date in a journal style (e.g., "the 12th of June")
   * Handles Firestore timestamps and other date formats
   * @param date The date to format (can be Date, Firestore timestamp, or string)
   * @returns Formatted journal style date string or empty string if invalid
   */
  export const formatJournalDate = (date: any): string => {
    const convertedDate = convertFirestoreTimestamp(date);
    if (!convertedDate) return '';
    
    // Format like "the 12th of June"
    const day = convertedDate.getDate();
    const month = convertedDate.toLocaleString('default', { month: 'long' });
    
    // Add suffix to day
    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';
    
    return `the ${day}${suffix} of ${month}`;
  };
  
  /**
   * Format a date for standard display
   * Handles Firestore timestamps and other date formats
   * @param date The date to format (can be Date, Firestore timestamp, or string)
   * @param options Optional Intl.DateTimeFormatOptions for customizing the format
   * @returns Formatted date string or empty string if invalid
   */
  export const formatDisplayDate = (date: any, options?: Intl.DateTimeFormatOptions): string => {
    const convertedDate = convertFirestoreTimestamp(date);
    if (!convertedDate) return '';
    
    return convertedDate.toLocaleDateString(undefined, options);
  };
  
  /**
   * Format a date to show both date and time
   * Handles Firestore timestamps and other date formats
   * @param date The date to format (can be Date, Firestore timestamp, or string)
   * @returns Formatted date and time string or empty string if invalid
   */
  export const formatDateTime = (date: any): string => {
    const convertedDate = convertFirestoreTimestamp(date);
    if (!convertedDate) return '';
    
    return convertedDate.toLocaleString();
  };