/**
 * Time-related constants for use throughout the application
 * All values are in milliseconds
 */

// Base time units
export const MILLISECOND = 1;
export const SECOND = 1000 * MILLISECOND;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

// Session durations
export const SESSION_DURATION = 1 * DAY;              // Standard session lasts 24 hours
export const REMEMBER_ME_DURATION = 30 * DAY;         // "Remember me" sessions last 30 days
export const INACTIVITY_TIMEOUT = 1 * DAY;            // Log out after 24 hours of inactivity
export const SESSION_WARNING_THRESHOLD = 5 * MINUTE;  // Warn when 5 minutes remain

// Activity tracking
export const ACTIVITY_UPDATE_THROTTLE = 1 * MINUTE;  // Only record activity max once per minute
export const SESSION_CHECK_INTERVAL = 5 * MINUTE;    // Check session validity every 5 minutes

// For explanatory UI text
export const SESSION_WARNING_TEXT = "5 minutes";
export const INACTIVITY_TIMEOUT_TEXT = "24 hours";
export const REMEMBER_ME_TEXT = "30 days";