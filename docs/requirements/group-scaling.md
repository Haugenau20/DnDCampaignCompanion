# Multi-Group Campaign Management Implementation Plan

## Overview

This document outlines the implementation plan for extending the D&D Campaign Companion to support multiple groups with multiple campaigns. The architecture allows complete isolation between different play groups, while enabling users to participate in multiple groups with a single authentication profile.

## 1. Database Structure

### 1.1 Collections Structure

```
/groups/{groupId}/  (Group metadata)
  ├─ name: string
  ├─ description: string
  ├─ createdAt: timestamp
  ├─ createdBy: userId
  
/groups/{groupId}/campaigns/{campaignId}/  (Campaign metadata)
  ├─ name: string
  ├─ description: string
  ├─ createdAt: timestamp
  ├─ createdBy: userId
  ├─ isActive: boolean
  
/groups/{groupId}/campaigns/{campaignId}/chapters/{chapterId}
/groups/{groupId}/campaigns/{campaignId}/locations/{locationId}
/groups/{groupId}/campaigns/{campaignId}/npcs/{npcId}
/groups/{groupId}/campaigns/{campaignId}/quests/{questId}
/groups/{groupId}/campaigns/{campaignId}/rumors/{rumorId}
/groups/{groupId}/campaigns/{campaignId}/saga/{sagaId}

/groups/{groupId}/users/{userId}  (Group-specific user profiles)
  ├─ username: string  (unique within group)
  ├─ role: string  ("admin" or "member")
  ├─ joinedAt: timestamp
  ├─ characters: array
  ├─ activeCampaignId: string
  ├─ preferences: object

/groups/{groupId}/usernames/{username}  (Group-scoped usernames)
  ├─ userId: string
  ├─ originalUsername: string  (preserves case)
  ├─ createdAt: timestamp

/groups/{groupId}/registrationTokens/{tokenId}  (Group-specific tokens)
  ├─ token: string
  ├─ createdAt: timestamp
  ├─ createdBy: userId
  ├─ used: boolean
  ├─ usedAt: timestamp (optional)
  ├─ usedBy: userId (optional)
  ├─ notes: string (optional)

/users/{userId}  (Global user profiles)
  ├─ email: string
  ├─ groups: array of groupIds
  ├─ lastLoginAt: timestamp
  ├─ createdAt: timestamp
  ├─ activeGroupId: string (last selected group)
```

### 1.2 Data Models

#### Group Model
```typescript
interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: Date | string;
  createdBy: string; // userId
}
```

#### Campaign Model
```typescript
interface Campaign {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  createdAt: Date | string;
  createdBy: string; // userId
  isActive: boolean;
}
```

#### Group User Profile
```typescript
interface GroupUserProfile {
  userId: string;
  username: string;
  role: 'admin' | 'member';
  joinedAt: Date | string;
  characters?: CharacterNameEntry[];
  activeCampaignId?: string;
  preferences: {
    theme: string;
    [key: string]: any;
  };
}
```

#### Global User Profile
```typescript
interface GlobalUserProfile {
  id: string;
  email: string;
  groups: string[]; // groupIds
  activeGroupId?: string;
  lastLoginAt: Date | string;
  createdAt: Date | string;
}
```

## 2. Authentication & User Management

### 2.1 Registration Process

1. **Token-Based Registration**:
   - User receives a registration token from a group admin
   - Token is specific to a single group
   - Registration form accepts email, password, username, and token
   - System verifies token and identifies which group it belongs to
   - Creates Firebase Auth user
   - Creates global user profile with this group as the only membership
   - Creates group-specific user profile with username

2. **User Flow**:
   ```
   User receives token -> Visits registration page -> Submits form ->
   System validates token -> Creates accounts -> Redirects to group home
   ```

### 2.2 Login Process

1. **Group Selection**:
   - User logs in with email/password
   - System loads global profile and retrieves group memberships
   - If user belongs to only one group, auto-select it
   - If user belongs to multiple groups, show group selection screen
   - After group selection, load group-specific profile and campaigns

2. **Session Management**:
   - Store active group ID in user session
   - Use group ID as part of data path construction for all queries
   - Track last active group in user profile for convenience on next login

### 2.3 Group Joining Process

1. **Adding to Existing Account**:
   - User receives a token for a new group
   - User logs in to existing account
   - System detects token parameter and offers to join new group
   - If accepted, adds group to user's memberships and creates group profile
   - Alternatively, provide "Join group" screen to enter token manually

## 3. Core Services Modification

### 3.1 FirebaseService Updates

```typescript
class FirebaseService {
  // Add group and campaign context to service
  private activeGroupId: string | null = null;
  private activeCampaignId: string | null = null;
  
  /**
   * Set active group context
   */
  public setActiveGroup(groupId: string): void {
    this.activeGroupId = groupId;
    
    // Update last accessed timestamp
    const userId = this.getCurrentUser()?.uid;
    if (userId) {
      this.updateDocument('users', userId, {
        activeGroupId: groupId,
        [`groupAccess.${groupId}.lastAccessedAt`]: new Date()
      });
    }
  }
  
  /**
   * Set active campaign context
   */
  public setActiveCampaign(campaignId: string): void {
    this.activeCampaignId = campaignId;
    
    // Update user preference in group profile
    const userId = this.getCurrentUser()?.uid;
    if (userId && this.activeGroupId) {
      this.updateGroupUserProfile(this.activeGroupId, userId, {
        activeCampaignId: campaignId
      });
    }
  }
  
  /**
   * Get collection reference with group/campaign context
   */
  private getCollectionRef(collectionName: string): CollectionReference {
    if (!this.activeGroupId) {
      throw new Error('No active group selected');
    }
    
    if (this.activeCampaignId) {
      // Campaign-specific collections
      return collection(
        this.db,
        'groups',
        this.activeGroupId,
        'campaigns',
        this.activeCampaignId,
        collectionName
      );
    } else {
      // Group-level collections
      return collection(
        this.db,
        'groups',
        this.activeGroupId,
        collectionName
      );
    }
  }
  
  /**
   * Get group-specific user profile
   */
  public async getGroupUserProfile(groupId: string, userId: string): Promise<GroupUserProfile | null> {
    const docRef = doc(this.db, 'groups', groupId, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as GroupUserProfile;
    }
    
    return null;
  }
  
  /**
   * Update group-specific user profile
   */
  public async updateGroupUserProfile(groupId: string, userId: string, updates: Partial<GroupUserProfile>): Promise<void> {
    const docRef = doc(this.db, 'groups', groupId, 'users', userId);
    await updateDoc(docRef, updates);
  }
  
  /* 
   * Modified CRUD operations - all use getCollectionRef() to include context
   */
  
  public async getCollection<T>(collectionName: string): Promise<T[]> {
    const collectionRef = this.getCollectionRef(collectionName);
    const snapshot = await getDocs(collectionRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as unknown as T));
  }
  
  // Update other CRUD methods similarly...
  
  /**
   * Group management methods
   */
  
  public async getGroups(): Promise<Group[]> {
    const userId = this.getCurrentUser()?.uid;
    if (!userId) return [];
    
    // Get user's global profile to find group memberships
    const userDoc = await getDoc(doc(this.db, 'users', userId));
    if (!userDoc.exists()) return [];
    
    const userData = userDoc.data();
    const groupIds = userData.groups || [];
    
    // Fetch each group's metadata
    const groups: Group[] = [];
    for (const groupId of groupIds) {
      const groupDoc = await getDoc(doc(this.db, 'groups', groupId));
      if (groupDoc.exists()) {
        groups.push({
          id: groupId,
          ...groupDoc.data()
        } as Group);
      }
    }
    
    return groups;
  }
  
  public async getCampaigns(groupId: string): Promise<Campaign[]> {
    const campaignsCol = collection(this.db, 'groups', groupId, 'campaigns');
    const snapshot = await getDocs(campaignsCol);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      groupId,
      ...doc.data()
    } as Campaign));
  }
  
  /**
   * Generate a registration token for a specific group
   */
  public async generateGroupRegistrationToken(groupId: string, notes: string = ''): Promise<string> {
    const userId = this.getCurrentUser()?.uid;
    if (!userId) throw new Error('Not authenticated');
    
    // Check if user is admin of this group
    const userProfileDoc = await getDoc(doc(this.db, 'groups', groupId, 'users', userId));
    if (!userProfileDoc.exists() || userProfileDoc.data().role !== 'admin') {
      throw new Error('Only group admins can generate tokens');
    }
    
    // Generate token with same logic as before
    const token = this.generateInviteToken();
    
    // Store token in group's tokens collection
    await setDoc(doc(this.db, 'groups', groupId, 'registrationTokens', token), {
      token,
      createdAt: new Date(),
      createdBy: userId,
      notes,
      used: false
    });
    
    return token;
  }
  
  /**
   * Validate a registration token and get its group
   */
  public async validateRegistrationToken(token: string): Promise<{isValid: boolean, groupId?: string}> {
    // Query all groups' registration tokens
    // This is a collection group query - indexes required
    const q = query(
      collectionGroup(this.db, 'registrationTokens'),
      where('token', '==', token),
      where('used', '==', false),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { isValid: false };
    }
    
    // Extract group ID from the document path
    // Path format: groups/{groupId}/registrationTokens/{tokenId}
    const docPath = snapshot.docs[0].ref.path;
    const groupId = docPath.split('/')[1];
    
    return { isValid: true, groupId };
  }
  
  /**
   * Sign up with token and join specific group
   */
  public async signUpWithToken(
    token: string,
    email: string,
    password: string,
    username: string
  ): Promise<User> {
    // Validate token and get group ID
    const { isValid, groupId } = await this.validateRegistrationToken(token);
    
    if (!isValid || !groupId) {
      throw new Error('Invalid or expired token');
    }
    
    // Validate username is available in this group
    const isUsernameAvailable = await this.isUsernameAvailableInGroup(groupId, username);
    if (!isUsernameAvailable) {
      throw new Error('Username is already taken in this group');
    }
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = userCredential.user;
    
    try {
      // Use a transaction for all database operations
      await runTransaction(this.db, async (transaction) => {
        const now = new Date();
        
        // Create global user profile
        const globalUserDocRef = doc(this.db, 'users', user.uid);
        transaction.set(globalUserDocRef, {
          email: email,
          groups: [groupId],
          activeGroupId: groupId,
          lastLoginAt: now,
          createdAt: now
        });
        
        // Create group-specific user profile
        const groupUserDocRef = doc(this.db, 'groups', groupId, 'users', user.uid);
        transaction.set(groupUserDocRef, {
          userId: user.uid,
          username: username,
          role: 'member',
          joinedAt: now,
          preferences: {
            theme: 'default'
          }
        });
        
        // Create username reservation in group
        const usernameLower = username.toLowerCase();
        const usernameDocRef = doc(this.db, 'groups', groupId, 'usernames', usernameLower);
        transaction.set(usernameDocRef, {
          userId: user.uid,
          originalUsername: username,
          createdAt: now
        });
        
        // Mark token as used
        const tokenDocRef = doc(this.db, 'groups', groupId, 'registrationTokens', token);
        transaction.update(tokenDocRef, {
          used: true,
          usedAt: now,
          usedBy: user.uid
        });
      });
      
      return user;
    } catch (error) {
      // If transaction fails, delete the auth user
      try {
        await user.delete();
      } catch (e) {
        console.error('Failed to clean up auth user after error:', e);
      }
      throw error;
    }
  }
  
  /**
   * Check if username is available in a specific group
   */
  public async isUsernameAvailableInGroup(groupId: string, username: string): Promise<boolean> {
    const usernameLower = username.toLowerCase();
    const usernameDoc = await getDoc(doc(this.db, 'groups', groupId, 'usernames', usernameLower));
    return !usernameDoc.exists();
  }
  
  // Other group-specific methods...
}
```

### 3.2 FirebaseContext Updates

```typescript
/**
 * Extended context properties for group/campaign context
 */
interface FirebaseContextType {
  // Existing properties...
  
  // Group context
  groups: Group[];
  activeGroupId: string | null;
  setActiveGroup: (groupId: string) => Promise<void>;
  
  // Campaign context
  campaigns: Campaign[];
  activeCampaignId: string | null;
  setActiveCampaign: (campaignId: string) => Promise<void>;
  
  // Group-specific user profile
  groupUserProfile: GroupUserProfile | null;
  
  // Group management
  getGroups: () => Promise<Group[]>;
  getCampaigns: (groupId: string) => Promise<Campaign[]>;
  createCampaign: (groupId: string, campaignData: Partial<Campaign>) => Promise<string>;
  
  // Group-specific methods
  generateGroupRegistrationToken: (groupId: string, notes?: string) => Promise<string>;
  validateUsername: (groupId: string, username: string) => Promise<UsernameValidationResult>;
  changeUsername: (groupId: string, userId: string, newUsername: string) => Promise<void>;
}
```

## 4. UI/UX Components

### 4.1 Group Selection Screen

Create a new screen that appears after login when a user belongs to multiple groups:

```tsx
// src/components/features/groups/GroupSelector.tsx
import React from 'react';
import { useFirebase } from '../../../context/FirebaseContext';
import Card from '../../core/Card';
import Typography from '../../core/Typography';
import Button from '../../core/Button';

const GroupSelector: React.FC = () => {
  const { groups, setActiveGroup } = useFirebase();
  
  const handleSelectGroup = async (groupId: string) => {
    await setActiveGroup(groupId);
    // Navigate to group home page
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <Typography variant="h2" className="mb-6 text-center">
        Select a Group
      </Typography>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map(group => (
          <Card key={group.id} className="h-full">
            <Card.Content className="flex flex-col h-full">
              <Typography variant="h3" className="mb-2">
                {group.name}
              </Typography>
              {group.description && (
                <Typography color="secondary" className="mb-4">
                  {group.description}
                </Typography>
              )}
              <div className="mt-auto pt-4">
                <Button 
                  onClick={() => handleSelectGroup(group.id)} 
                  fullWidth
                >
                  Select Group
                </Button>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GroupSelector;
```

### 4.2 Campaign Selector

Add a dropdown in the header to select between campaigns in the current group:

```tsx
// src/components/features/campaigns/CampaignSelector.tsx
import React, { useState } from 'react';
import { useFirebase } from '../../../context/FirebaseContext';
import { ChevronDown, Book } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import clsx from 'clsx';

const CampaignSelector: React.FC = () => {
  const { campaigns, activeCampaignId, setActiveCampaign } = useFirebase();
  const { theme } = useTheme();
  const themePrefix = theme.name;
  const [isOpen, setIsOpen] = useState(false);
  
  const activeCampaign = campaigns.find(c => c.id === activeCampaignId);
  
  const handleSelect = (campaignId: string) => {
    setActiveCampaign(campaignId);
    setIsOpen(false);
  };
  
  if (campaigns.length <= 1) return null;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2 px-3 py-2 rounded-md",
          `${themePrefix}-dropdown-button`
        )}
      >
        <Book size={16} />
        <span>{activeCampaign?.name || 'Select Campaign'}</span>
        <ChevronDown size={16} />
      </button>
      
      {isOpen && (
        <div className={clsx(
          "absolute right-0 mt-1 w-56 rounded-md shadow-lg z-10",
          `${themePrefix}-dropdown`
        )}>
          <div className="py-1">
            {campaigns.map(campaign => (
              <button
                key={campaign.id}
                onClick={() => handleSelect(campaign.id)}
                className={clsx(
                  "w-full text-left px-4 py-2",
                  campaign.id === activeCampaignId
                    ? `${themePrefix}-dropdown-item-active`
                    : `${themePrefix}-dropdown-item`
                )}
              >
                {campaign.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignSelector;
```

### 4.3 Group Context Provider

Create a wrapper context to manage group/campaign state:

```tsx
// src/context/GroupContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useFirebase } from './FirebaseContext';
import { Group, Campaign } from '../types';

interface GroupContextType {
  isLoading: boolean;
  activeGroup: Group | null;
  activeCampaign: Campaign | null;
  campaigns: Campaign[];
  switchGroup: (groupId: string) => Promise<void>;
  switchCampaign: (campaignId: string) => Promise<void>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const GroupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    user, loading: authLoading, 
    getGroups, getCampaigns,
    setActiveGroup, setActiveCampaign
  } = useFirebase();
  
  const [isLoading, setIsLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaignState] = useState<Campaign | null>(null);
  
  // Load groups when user is authenticated
  useEffect(() => {
    if (authLoading || !user) {
      return;
    }
    
    const loadGroups = async () => {
      setIsLoading(true);
      try {
        const userGroups = await getGroups();
        setGroups(userGroups);
        
        // Auto-select first group if only one exists
        if (userGroups.length === 1) {
          await switchGroup(userGroups[0].id);
        } else if (userGroups.length > 1) {
          // Navigate to group selection screen
          // This could be handled in a parent component
        }
      } catch (error) {
        console.error('Failed to load groups:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGroups();
  }, [user, authLoading, getGroups]);
  
  // Function to switch active group
  const switchGroup = async (groupId: string) => {
    setIsLoading(true);
    try {
      // Update Firebase context
      await setActiveGroup(groupId);
      
      // Update local state
      const group = groups.find(g => g.id === groupId) || null;
      setActiveGroupState(group);
      
      // Load campaigns for this group
      if (group) {
        const groupCampaigns = await getCampaigns(groupId);
        setCampaigns(groupCampaigns);
        
        // Auto-select first campaign or previously selected campaign
        if (groupCampaigns.length > 0) {
          await switchCampaign(groupCampaigns[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to switch group:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to switch active campaign
  const switchCampaign = async (campaignId: string) => {
    try {
      // Update Firebase context
      await setActiveCampaign(campaignId);
      
      // Update local state
      const campaign = campaigns.find(c => c.id === campaignId) || null;
      setActiveCampaignState(campaign);
    } catch (error) {
      console.error('Failed to switch campaign:', error);
    }
  };
  
  const value = {
    isLoading,
    activeGroup,
    activeCampaign,
    campaigns,
    switchGroup,
    switchCampaign
  };
  
  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};
```

### 4.4 Integration with App Component

Update the main App component to include the new context providers:

```tsx
// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { FirebaseProvider } from './context/FirebaseContext';
import { GroupProvider } from './context/GroupContext';
import { ThemeProvider } from './context/ThemeContext';
// ...other imports

// Import new group-related components
import GroupSelector from './components/features/groups/GroupSelector';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <SessionManager>
          <GroupProvider>
            <ThemeProvider>
              <NavigationProvider>
                <Layout>
                  <Routes>
                    {/* New group selection route */}
                    <Route path="/groups" element={<GroupSelector />} />
                    
                    {/* Existing routes */}
                    {/* ... */}
                  </Routes>
                </Layout>
              </NavigationProvider>
            </ThemeProvider>
          </GroupProvider>
        </SessionManager>
      </FirebaseProvider>
    </ErrorBoundary>
  );
};

export default App;
```

## 5. Data Migration Plan

### 5.1 Prepare for Migration

1. **Backup Current Data**:
   - Export all Firestore collections
   - Store backups securely
   - Create a rollback plan

2. **Create Default Group and Campaign**:
   - Define IDs for the default group and campaign
   - Prepare migration scripts

### 5.2 Migration Script

```typescript
/**
 * Migration script to move existing data to the new structure
 */
async function migrateToGroupStructure() {
  // Create default group
  const defaultGroupId = 'default-group';
  await setDoc(doc(db, 'groups', defaultGroupId), {
    id: defaultGroupId,
    name: 'Default Group',
    description: 'Automatically created during migration',
    createdAt: new Date(),
    createdBy: 'system'
  });
  
  // Create default campaign
  const defaultCampaignId = 'default-campaign';
  await setDoc(doc(db, 'groups', defaultGroupId, 'campaigns', defaultCampaignId), {
    id: defaultCampaignId,
    name: 'Default Campaign',
    description: 'Automatically created during migration',
    createdAt: new Date(),
    createdBy: 'system',
    isActive: true
  });
  
  // Migrate users
  const usersSnapshot = await getDocs(collection(db, 'users'));
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    // Create global user profile with group membership
    await setDoc(doc(db, 'users', userId), {
      email: userData.email,
      groups: [defaultGroupId],
      activeGroupId: defaultGroupId,
      lastLoginAt: userData.lastLogin || new Date(),
      createdAt: userData.dateCreated || new Date()
    });
    
    // Create group-specific user profile
    await setDoc(doc(db, 'groups', defaultGroupId, 'users', userId), {
      userId: userId,
      username: userData.username,
      role: userData.isAdmin ? 'admin' : 'member',
      joinedAt: userData.dateCreated || new Date(),
      characters: userData.characterNames || [],
      preferences: userData.preferences || { theme: 'default' }
    });
    
    // Create username reservation
    if (userData.username) {
      await setDoc(doc(db, 'groups', defaultGroupId, 'usernames', userData.username.toLowerCase()), {
        userId: userId,
        originalUsername: userData.username,
        createdAt: new Date()
      });
    }
  }
  
  // Migrate registration tokens
  const tokensSnapshot = await getDocs(collection(db, 'registrationTokens'));
  for (const tokenDoc of tokensSnapshot.docs) {
    const tokenData = tokenDoc.data();
    await setDoc(doc(db, 'groups', defaultGroupId, 'registrationTokens', tokenDoc.id), {
      ...tokenData,
      // Ensure all required fields are present
      token: tokenDoc.id,
      createdAt: tokenData.createdAt || new Date(),
      createdBy: tokenData.createdBy || 'system',
      used: tokenData.used || false
    });
  }
  
  // Migrate campaign content collections
  const contentCollections = ['chapters', 'locations', 'npcs', 'quests', 'rumors'];
  
  for (const collectionName of contentCollections) {
    const contentSnapshot = await getDocs(collection(db, collectionName));
    
    for (const contentDoc of contentSnapshot.docs) {
      const contentData = contentDoc.data();
      // Copy to new location under default group/campaign
      await setDoc(
        doc(db, 'groups', defaultGroupId, 'campaigns', defaultCampaignId, collectionName, contentDoc.id),
        contentData
      );
    }
  }
  
  // Handle saga separately if needed
  const sagaSnapshot = await getDocs(collection(db, 'saga'));
  for (const sagaDoc of sagaSnapshot.docs) {
    await setDoc(
      doc(db, 'groups', defaultGroupId, 'campaigns', defaultCampaignId, 'saga', sagaDoc.id),
      sagaDoc.data()
    );
  }
  
  console.log('Migration completed successfully');
}
```

### 5.3 Post-Migration Verification

1. **Data Integrity Checks**:
   - Count documents in old vs. new structure
   - Verify sample documents were correctly migrated
   - Test querying data in the new structure

2. **Migration Rollback Plan** (if needed):
   - Prepare a rollback script that restores from backups
   - Test rollback procedure before going live

## 6. Security Rules

### 6.1 Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isGroupMember(groupId) {
      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
      return userDoc != null && userDoc.data.groups != null && 
             userDoc.data.groups.hasAny([groupId]);
    }
    
    function isGroupAdmin(groupId) {
      let userProfileDoc = get(/databases/$(database)/documents/groups/$(groupId)/users/$(request.auth.uid));
      return userProfileDoc != null && userProfileDoc.data.role == "admin";
    }
    
    // Global user profiles
    match /users/{userId} {
      // User can read/write their own profile
      allow read, write: if request.auth.uid == userId;
    }
    
    // Group-level access
    match /groups/{groupId} {
      // Group metadata readable by members
      allow read: if isGroupMember(groupId);
      allow create: if isAuthenticated(); // Anyone can create a group
      allow update, delete: if isGroupAdmin(groupId);
      
      // Group user profiles
      match /users/{userId} {
        // Readable by group members
        allow read: if isGroupMember(groupId);
        // Writable by the user or group admin
        allow write: if request.auth.uid == userId || isGroupAdmin(groupId);
      }
      
      // Group usernames
      match /usernames/{username} {
        // Readable by group members (needed for checking availability)
        allow read: if isGroupMember(groupId);
        // Only modifiable through secure paths
        allow write: if false;
      }
      
      // Group registration tokens
      match /registrationTokens/{token} {
        // Only admins can manage tokens
        allow read, write: if isGroupAdmin(groupId);
        
        // Special case: allow token validation for authentication
        allow get: if true;
      }
      
      // Campaigns
      match /campaigns/{campaignId} {
        // Group members can read campaigns
        allow read: if isGroupMember(groupId);
        // Only admins can create/edit campaigns
        allow write: if isGroupAdmin(groupId);
        
        // Campaign content collections
        match /{collection}/{docId} {
          // Group members can read content
          allow read: if isGroupMember(groupId);
          // Group members can create/edit content
          allow write: if isGroupMember(groupId);
        }
      }
    }
  }
}
```

## 7. Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

1. **Database Structure**:
   - Define collections and document structure
   - Set up security rules for the new structure
   - Create indexes for group-based queries

2. **Authentication Services**:
   - Update FirebaseService with group context methods
   - Modify token validation and registration flow
   - Create group management methods

3. **Context Providers**:
   - Implement GroupContext provider
   - Update FirebaseContext to support groups

### Phase 2: Migration (Week 2-3)

1. **Prepare Migration**:
   - Create migration scripts
   - Test on development environment
   - Backup production data

2. **Execute Migration**:
   - Move data to new structure
   - Verify migration success
   - Keep dual support during transition

### Phase 3: UI Implementation (Week 3-4)

1. **Core Components**:
   - Group selector screen
   - Campaign selector component
   - Update layout with group/campaign context

2. **Admin Features**:
   - Group management interface
   - Registration token generation per group
   - User management within groups

3. **Navigation Updates**:
   - Add group-aware routing
   - Update breadcrumbs with group/campaign info

### Phase 4: Testing & Deployment (Week 4-5)

1. **Testing**:
   - Unit tests for group/campaign services
   - Integration tests for user flows
   - End-to-end testing for critical paths

2. **Performance Optimization**:
   - Audit Firebase reads/writes
   - Optimize queries and indexes
   - Implement appropriate caching

3. **Deployment**:
   - Deploy database changes
   - Roll out application updates
   - Monitor for issues

## 8. Testing Strategy

### 8.1 Unit Tests

Focus on testing:
- Group context switching
- Campaign context switching
- Token validation with group context
- Username validation within groups

Example unit test:

```typescript
// __tests__/services/firebase/groupManagement.test.ts
import { FirebaseService } from '../../../src/services/firebase/FirebaseService';
import { mockFirestore } from '../../mocks/firestore';

describe('Group Management', () => {
  beforeEach(() => {
    // Set up mocks
  });
  
  test('validateRegistrationToken should return correct group ID', async () => {
    // Arrange
    const service = new FirebaseService();
    mockFirestore.collection('groups').doc('group-1').collection('registrationTokens').doc('valid-token').set({
      token: 'valid-token',
      used: false,
      createdAt: new Date()
    });
    
    // Act
    const result = await service.validateRegistrationToken('valid-token');
    
    // Assert
    expect(result.isValid).toBe(true);
    expect(result.groupId).toBe('group-1');
  });
  
  test('isUsernameAvailableInGroup should check within group scope', async () => {
    // Arrange
    const service = new FirebaseService();
    mockFirestore.collection('groups').doc('group-1').collection('usernames').doc('existing').set({
      userId: 'user-1'
    });
    
    // Act & Assert
    expect(await service.isUsernameAvailableInGroup('group-1', 'existing')).toBe(false);
    expect(await service.isUsernameAvailableInGroup('group-1', 'newname')).toBe(true);
    expect(await service.isUsernameAvailableInGroup('group-2', 'existing')).toBe(true);
  });
  
  // More tests...
});
```

### 8.2 Integration Tests

Test these flows:
- Registration with group-specific token
- Login and group selection
- Switching between campaigns
- Creating content in specific campaign

### 8.3 End-to-End Tests

Test these scenarios:
- Complete user registration with token
- User belonging to multiple groups
- Admin managing multiple campaigns
- Content isolation between groups

## 9. Additional Considerations

### 9.1 Performance Optimization

1. **Prefetching**:
   - Preload active group/campaign data after login
   - Cache frequently accessed data

2. **Indexing**:
   - Create indexes for:
     - `registrationTokens` (token, used)
     - Group membership lookups

3. **Batched Operations**:
   - Use batched writes for multi-document updates
   - Use transactions for data consistency

### 9.2 Scalability

1. **Firestore Collection Limits**:
   - Max 1 write per second per document
   - No practical limit on collection size
   - No issues with 50+ groups

2. **Request Distribution**:
   - Spread reads/writes across multiple documents
   - Avoid hotspots on single documents

### 9.3 Future Expansion

1. **Group Invitations**:
   - Allow admins to invite existing users
   - Support email invitations

2. **Cross-Group Content Sharing**:
   - Templates for NPCs, locations
   - Export/import between campaigns

3. **Group Chat/Messaging**:
   - Real-time communication within group
   - Campaign-specific announcements

## 10. Documentation

### 10.1 User Documentation

Create documentation explaining:
- How to register with a token
- How to switch between groups
- How to manage multiple campaigns
- Group vs. campaign-specific content

### 10.2 Developer Documentation

Document:
- Group/campaign context architecture
- Security rules implementation
- Data access patterns
- Testing approach

## 11. Conclusion

This implementation plan provides a comprehensive approach to extending the D&D Campaign Companion with multi-group and multi-campaign support. The architecture maintains complete isolation between different play groups while enabling users to participate in multiple groups with a single authentication profile. The phased implementation approach allows for systematic development and testing, minimizing disruption to existing users.