// src/types/user.ts
/**
 * Character name entry with optional campaign association
 */
export interface CharacterNameEntry {
  /**
   * Unique identifier for this character name entry
   */
  id: string;
  
  /**
   * The character's name
   */
  name: string;
  
  /**
   * Optional campaign ID for future campaign support
   */
  campaignId?: string;
}

/**
 * Player profile information stored in the users collection
 */
export interface UserProfile {
  /** User's email address from Firebase Authentication */
  email: string;
  /** User's chosen unique username */
  username: string;
  /** Optional display name (different from username) */
  displayName?: string;
  /** Optional character names associated with this player */
  characterNames?: (string | CharacterNameEntry)[];
  /** ID of the active character (if any) - can be null when no character is selected */
  activeCharacterId?: string | null;
  /** Timestamp when the account was created */
  dateCreated: Date | string;
  /** Timestamp of last login */
  lastLogin: Date | string;
  /** Whether user has admin privileges */
  isAdmin?: boolean;
  /** User preferences */
  preferences?: {
    /** UI theme preference */
    theme: string;
    [key: string]: any;
  };
}

/**
 * Username document stored in the usernames collection
 */
export interface UsernameDocument {
  /** Reference to the user's UID in users collection */
  uid: string;
  /** Original username with preserved case for display */
  originalUsername: string;
  /** When the username was created */
  createdAt: Date | string;
}

/**
 * Username validation result
 */
export interface UsernameValidationResult {
  /** Whether the username is valid */
  isValid: boolean;
  /** Error message if not valid */
  error?: string;
  /** Whether the username is available */
  isAvailable?: boolean;
}