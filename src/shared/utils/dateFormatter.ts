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
/**
 * A note's date, rendered as a date.
 *
 * `NPCNote.date` and `LocationNote.date` are plain strings with no agreed
 * shape: the create forms write `YYYY-MM-DD`, the sample-data generator writes
 * a full ISO timestamp, and each consumer used to print whatever it was
 * handed. Two directories printed the raw value, so a row showed
 * `2025-05-31T19:27:30.387Z` while the NPC detail page rendered the same value
 * properly (T001).
 *
 * This is the display half of that entry, lifted from `NPCDetailPage`'s own
 * `formatNoteDate`. **The stored shape is not fixed here** -- T001 records that
 * agreeing it is the actual job, and doing that is a data change, not a
 * rendering one.
 *
 * A value that cannot be parsed is returned untouched: a date the reader
 * cannot read is not a date, and showing the raw string is more honest than
 * inventing one.
 */
export const formatNoteDate = (value: string): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().split('T')[0];
};
