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
 * The stored shape of a note's date: `YYYY-MM-DD`.
 *
 * `NPCNote.date` and `LocationNote.date` used to have no agreed shape -- the
 * NPC page wrote `YYYY-MM-DD`, the location page and the sample-data generator
 * wrote a full ISO timestamp. Every writer now goes through this, so a new
 * note is always a calendar date (T001).
 *
 * The day is the UTC one, as it always was on the NPC page. Records already
 * stored as a full timestamp are left as they are: `formatNoteDate` reads both.
 */
export const toNoteDate = (value: Date = new Date()): string =>
  value.toISOString().slice(0, 10);

/**
 * A note's date, rendered as a date.
 *
 * Takes the stored `YYYY-MM-DD` that `toNoteDate` writes, and also the full
 * ISO timestamp that older records carry. Two directories once printed the raw
 * value, so a row showed `2025-05-31T19:27:30.387Z` while the NPC detail page
 * rendered the same value properly.
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
  return formatCalendarDate(parsed);
};

/**
 * One calendar date, in the one shape this product writes dates.
 *
 * `15-6` found the NPC page printing `2025-05-31` for a note three cards above
 * a record line reading `31/05/2025` — two formats for the same kind of fact,
 * on one screen. This is the shape both now use: `formatAttributionDate`
 * delegates here, so the record line and the notes under it cannot drift apart
 * again.
 *
 * It is deliberately *not* what `formatNoteDate` used to return. `YYYY-MM-DD`
 * is the shape the data is stored in, and printing a stored shape is how a
 * page ends up showing its database to a reader (T001).
 */
export const formatCalendarDate = (value: Date): string =>
  value.toLocaleDateString('en-uk', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
