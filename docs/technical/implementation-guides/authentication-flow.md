# Authentication Flow Implementation Guide

## Overview

This document outlines the implementation approach for the authentication system in the D&D Campaign Companion, with special focus on the username mapping mechanism that connects Firebase Authentication with player profiles.

## Architecture

### Core Components

1. **Firebase Authentication**
   - Handles player registration, login, and session management
   - Provides unique user IDs (UIDs) for each registered player
   - Manages email/password credentials and verification

2. **Firestore User Collections**
   - `users` collection: Stores player profile information
   - `usernames` collection: Ensures username uniqueness

3. **Authentication Context**
   - React context providing authentication state and methods
   - Manages player session information
   - Provides username and profile data to components

## Data Structure

### Firebase Collections

1. **`users` Collection**
   ```
   Collection: users
   Document ID: {uid} (Firebase Auth UID)
   Fields:
     email: string (from Firebase Auth)
     username: string (chosen by player)
     displayName: string (optional)
     characterNames: string[] (optional)
     photoURL: string (optional)
     dateCreated: timestamp
     lastLogin: timestamp
     isAdmin: boolean (optional)
     preferences: {
       theme: string
       ... other player preferences
     }
   ```

2. **`usernames` Collection**
   ```
   Collection: usernames
   Document ID: {lowercase_username}
   Fields:
     uid: string (reference to users collection)
     originalUsername: string (preserving case for display)
     createdAt: timestamp
   ```

### Implementation Details

The username mapping works by creating and maintaining two synchronized documents:

1. The player profile document in the `users` collection (keyed by Firebase UID)
2. A username reservation document in the `usernames` collection (keyed by lowercase username)

These documents are created in a transaction to ensure atomicity and prevent race conditions.

## Implementation Steps

### 1. Player Registration Flow

```typescript
/**
 * Registers a new player with email, password, and username
 */
async function registerPlayer(email: string, password: string, username: string): Promise<User> {
  // Validate username format
  if (!isValidUsername(username)) {
    throw new Error('Invalid username format');
  }
  
  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  try {
    // Add player profile and username in a transaction
    await createPlayerProfile(user.uid, email, username);
    return user;
  } catch (error) {
    // Roll back by deleting the auth user if profile creation fails
    await user.delete();
    throw error;
  }
}

/**
 * Creates player profile and reserves username in a transaction
 */
async function createPlayerProfile(uid: string, email: string, username: string): Promise<void> {
  const usernameLower = username.toLowerCase();
  const usernameDoc = doc(db, 'usernames', usernameLower);
  const userDoc = doc(db, 'users', uid);
  
  return runTransaction(db, async (transaction) => {
    // Check if username is already taken
    const usernameSnapshot = await transaction.get(usernameDoc);
    if (usernameSnapshot.exists()) {
      throw new Error('Username already taken');
    }
    
    const now = serverTimestamp();
    
    // Create username reservation
    transaction.set(usernameDoc, {
      uid: uid,
      originalUsername: username, // Preserve case for display
      createdAt: now
    });
    
    // Create player profile
    transaction.set(userDoc, {
      email: email,
      username: username,
      dateCreated: now,
      lastLogin: now,
      characterNames: [],
      isAdmin: false,
      preferences: {
        theme: 'default'
      }
    });
  });
}
```

### 2. Player Authentication Flow

```typescript
/**
 * Signs in a player and updates last login time
 */
async function signInPlayer(email: string, password: string): Promise<UserWithProfile> {
  // Sign in with Firebase Auth
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Update last login time
  await updateDoc(doc(db, 'users', user.uid), {
    lastLogin: serverTimestamp()
  });
  
  // Get player profile with username
  const playerProfile = await getPlayerProfile(user.uid);
  return {
    ...user,
    profile: playerProfile
  };
}

/**
 * Fetches player profile with username
 */
async function getPlayerProfile(uid: string): Promise<UserProfile> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  
  if (!userDoc.exists()) {
    throw new Error('Player profile not found');
  }
  
  return userDoc.data() as UserProfile;
}
```

### 3. Username Change Flow

```typescript
/**
 * Changes a player's username while maintaining the same account
 */
async function changeUsername(uid: string, newUsername: string): Promise<void> {
  // Validate new username format
  if (!isValidUsername(newUsername)) {
    throw new Error('Invalid username format');
  }
  
  const newUsernameLower = newUsername.toLowerCase();
  
  // Get current username to delete after successful change
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    throw new Error('Player profile not found');
  }
  
  const userData = userDoc.data();
  const currentUsername = userData.username;
  const currentUsernameLower = currentUsername.toLowerCase();
  
  // Don't proceed if username isn't actually changing (case-insensitive check)
  if (newUsernameLower === currentUsernameLower) {
    return;
  }
  
  const newUsernameDoc = doc(db, 'usernames', newUsernameLower);
  const currentUsernameDoc = doc(db, 'usernames', currentUsernameLower);
  const userDocRef = doc(db, 'users', uid);
  
  // Execute as a transaction to prevent race conditions
  return runTransaction(db, async (transaction) => {
    // Check if new username is already taken
    const newUsernameSnapshot = await transaction.get(newUsernameDoc);
    if (newUsernameSnapshot.exists()) {
      throw new Error('Username already taken');
    }
    
    // Create new username reservation
    transaction.set(newUsernameDoc, {
      uid: uid,
      originalUsername: newUsername,
      createdAt: serverTimestamp()
    });
    
    // Update player profile
    transaction.update(userDocRef, {
      username: newUsername
    });
    
    // Delete old username reservation
    transaction.delete(currentUsernameDoc);
  });
}
```

### 4. Username Validation

```typescript
/**
 * Validates username format
 */
function isValidUsername(username: string): boolean {
  // 3-20 characters, alphanumeric, underscores, hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Checks if username is available
 */
async function isUsernameAvailable(username: string): Promise<boolean> {
  const usernameLower = username.toLowerCase();
  const usernameDoc = await getDoc(doc(db, 'usernames', usernameLower));
  return !usernameDoc.exists();
}
```

## Security Rules

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Players can read all usernames (needed for availability checks)
    match /usernames/{username} {
      allow read: if true;
      // Only allow writes through server functions or secure client code
      allow write: if false;
    }
    
    // Players can read their own profile and campaign members can read all profiles
    match /users/{userId} {
      allow read: if request.auth != null && (
        request.auth.uid == userId || 
        exists(/databases/$(database)/documents/campaigns/$(resource.data.campaignId)/members/$(request.auth.uid))
      );
      // Players can only write to their own profile
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Error Handling

Implement comprehensive error handling for common username-related issues:

1. **Username Already Taken**
   - Clear error message: "This username is already taken. Please choose another."
   - Suggest alternatives by adding numbers or modifying the requested name

2. **Invalid Username Format**
   - Specific error messages for different validation failures:
     - "Username must be 3-20 characters long."
     - "Username can only contain letters, numbers, underscores, and hyphens."

3. **Transaction Failures**
   - Implement exponential backoff retry for transient errors
   - Provide player-friendly error message: "Unable to complete operation. Please try again."

4. **Network Failures**
   - Handle offline scenarios gracefully
   - Cache authentication state for offline access where appropriate

## Client Implementation

### Authentication Context

```tsx
// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, firestore } from '../services/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  currentPlayer: User | null;
  playerProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  logOut: () => Promise<void>;
  updateUsername: (newUsername: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentPlayer, setCurrentPlayer] = useState<User | null>(null);
  const [playerProfile, setPlayerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentPlayer(user);
      
      if (user) {
        try {
          // Fetch player profile with username
          const profileDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (profileDoc.exists()) {
            setPlayerProfile(profileDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching player profile:", error);
        }
      } else {
        setPlayerProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Auth methods implementation
  const signIn = async (email: string, password: string) => {
    // Implementation as outlined above
  };

  const signUp = async (email: string, password: string, username: string) => {
    // Implementation as outlined above
  };

  const logOut = () => {
    return signOut(auth);
  };

  const updateUsername = async (newUsername: string) => {
    // Implementation as outlined above
  };

  const value = {
    currentPlayer,
    playerProfile,
    loading,
    signIn,
    signUp,
    logOut,
    updateUsername
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## Testing Strategy

### Unit Tests

1. **Username Validation Tests**
   - Test valid and invalid username formats
   - Test edge cases (exactly 3 or 20 characters)
   - Test with various special characters

2. **Authentication Flow Tests**
   - Mock Firebase Auth responses
   - Test successful login/registration paths
   - Test error handling for common failures

### Integration Tests

1. **Username Registration Flow**
   - Test end-to-end registration with username creation
   - Verify both documents are created correctly
   - Test uniqueness enforcement

2. **Username Change Flow**
   - Test successful username changes
   - Verify proper deletion of old username document
   - Test conflict handling

### Security Tests

1. **Rule Testing**
   - Test Firestore security rules for proper access control
   - Verify players cannot modify other players' profiles
   - Ensure username uniqueness is enforced at the database level

## Migration Considerations

1. **Generate Initial Usernames**
   - Notify players of their assigned username and option to change
   - Allow a grace period for players to select a personalized username

2. **Data Migration**
   - Update all content in the database to include creator username
   - Backfill content attribution using email-to-username mapping
   - Update any UI components that display user information

3. **Feature Transition**
   - Update existing authentication flows to include username selection
   - Modify content creation forms to use username for attribution
   - Update display components to show username instead of email

## Deployment Steps

1. **Pre-Deployment**
   - Create a backup of the production database
   - Test migration scripts in a staging environment
   - Validate security rules with new collections

2. **Database Preparation**
   - Create the `usernames` collection in production
   - Add indexes for username lookups
   - Prepare initial username reservations for existing users

3. **Code Deployment**
   - Deploy updated authentication components
   - Deploy profile management components
   - Update security rules

4. **Post-Deployment**
   - Monitor for any username collision issues
   - Verify that all content attribution is displaying correctly
   - Check for any performance impacts from the new username lookups

## Common Issues and Solutions

### Username Collisions

If two existing users would generate the same username during migration:

```typescript
async function generateUniqueUsername(baseUsername: string): Promise<string> {
  let candidate = baseUsername;
  let counter = 1;
  
  while (!(await isUsernameAvailable(candidate))) {
    candidate = `${baseUsername}${counter}`;
    counter++;
  }
  
  return candidate;
}
```

### Handling Name Changes

When a player changes their username, update all references:

```typescript
async function updateUsernameReferences(uid: string, oldUsername: string, newUsername: string): Promise<void> {
  // Update in batches of 500 to avoid transaction limits
  const batch = writeBatch(db);
  let batchCount = 0;
  
  // Update content where this player is creator
  const contentQuery = query(
    collectionGroup(db, 'content'),
    where('createdBy', '==', uid)
  );
  
  const contentSnapshot = await getDocs(contentQuery);
  
  contentSnapshot.forEach(doc => {
    batch.update(doc.ref, { createdByUsername: newUsername });
    batchCount++;
    
    if (batchCount >= 500) {
      // Commit batch and create a new one
      batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  });
  
  // Commit any remaining updates
  if (batchCount > 0) {
    await batch.commit();
  }
  
  // Note: Also update notes, comments, and other user-generated content similarly
}
```

### Missing Username References

For content without username references:

```typescript
async function backfillMissingUsernames(): Promise<void> {
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const uidToUsername = new Map();
  
  // Build lookup map
  usersSnapshot.forEach(doc => {
    uidToUsername.set(doc.id, doc.data().username);
  });
  
  // Process content without username attribution
  const contentQuery = query(
    collectionGroup(db, 'content'),
    where('createdByUsername', '==', null)
  );
  
  const contentSnapshot = await getDocs(contentQuery);
  const batch = writeBatch(db);
  let batchCount = 0;
  
  contentSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.createdBy && uidToUsername.has(data.createdBy)) {
      batch.update(doc.ref, { 
        createdByUsername: uidToUsername.get(data.createdBy)
      });
      
      batchCount++;
      if (batchCount >= 500) {
        batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }
  });
  
  if (batchCount > 0) {
    await batch.commit();
  }
}
```

## Performance Considerations

1. **Username Lookup Caching**
   - Cache username lookups in localStorage
   - Keep a memory cache of recently accessed usernames
   - Invalidate cache when username changes are detected

2. **Batch Processing**
   - Process username-related updates in batches
   - Use Firebase batched writes for related updates
   - Implement pagination for large datasets

3. **Indexing Strategy**
   - Create appropriate indexes for username-based queries
   - Use compound indexes for filtering by username + other criteria
   - Monitor query performance in Firebase console

## User Experience Recommendations

1. **Username Selection Flow**
   - Show real-time feedback on username availability
   - Provide suggestions when preferred username is taken
   - Include clear criteria for valid usernames

2. **Profile Management**
   - Allow players to preview how username changes will appear
   - Provide confirmation before finalizing username changes
   - Show history of recent username changes (for accountability)

3. **Display Consistency**
   - Use consistent username display patterns throughout the app
   - Show username with optional character name in parentheses
   - Consider adding small player avatars alongside usernames

## Related Documentation

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [React Context API](https://reactjs.org/docs/context.html)
- [Firebase Batch Operations](https://firebase.google.com/docs/firestore/manage-data/transactions)