// src/context/firebase/FirebaseContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import firebaseServices from '../../services/firebase';
import { UserProfile, GroupUserProfile, Group, Campaign } from '../../types/user';

// Define a custom event for auth state changes
export const AUTH_STATE_CHANGED_EVENT = 'auth-state-changed';

// Core context type with shared state
interface FirebaseContextType {
  // Auth state
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  
  // Group context
  groups: Group[];
  activeGroupId: string | null;
  activeGroupUserProfile: GroupUserProfile | null;
  
  // Campaign context
  campaigns: Campaign[];
  activeCampaignId: string | null;
  
  // Context updaters
  refreshGroups: () => Promise<Group[]>;
  refreshCampaigns: () => Promise<Campaign[]>;
  refreshUserProfile: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = authLoading || profileLoading || groupsLoading;
  
  // Group and campaign state
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroupUserProfile, setActiveGroupUserProfile] = useState<GroupUserProfile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  // Dispatch auth state change event
  const dispatchAuthStateChangedEvent = (authenticated: boolean) => {
    const event = new CustomEvent(AUTH_STATE_CHANGED_EVENT, { 
      detail: { authenticated } 
    });
    window.dispatchEvent(event);
  };

  // Load user profile
  const refreshUserProfile = async () => {
    if (!user) return;
    
    try {
      console.log(`FirebaseContext: Loading user profile for ${user.uid}`);
      const profile = await firebaseServices.user.getUserProfile(user.uid);
      console.log(`FirebaseContext: User profile loaded:`, profile);
      setUserProfile(profile);
      
      if (profile?.activeGroupId) {
        console.log(`FirebaseContext: Setting active group to ${profile.activeGroupId}`);
        await setActiveGroupContext(profile.activeGroupId, user);
      } else {
        console.warn(`FirebaseContext: No active group ID found in user profile`);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
    }
  };

  // Set active group and load related data
  const setActiveGroupContext = async (groupId: string, currentUser: User | null = null) => {
    console.log(`Setting active group context: ${groupId}`);
    
    try {
      // Set the group context in Firebase service
      firebaseServices.auth.setActiveGroup(groupId);
      setActiveGroupId(groupId);
      
      // Use provided currentUser parameter if available, otherwise fall back to state
      const authUser = currentUser || user;
      
      if (!authUser) {
        console.warn('Cannot load group profile - no authenticated user');
        return;
      }
      
      console.log(`Loading group profile for user ${authUser.uid} in group ${groupId}`);
      
      // Load user's profile in this group
      const groupProfile = await firebaseServices.user.getGroupUserProfile(groupId, authUser.uid);
      console.log(`Group profile loaded for group ${groupId}:`, groupProfile);
      
      if (groupProfile) {
        setActiveGroupUserProfile(groupProfile);
        
        // Now load campaigns
        setCampaignsLoading(true);
        try {
          const groupCampaigns = await firebaseServices.campaign.getCampaigns(groupId);
          console.log(`Loaded ${groupCampaigns.length} campaigns for group ${groupId}`);
          setCampaigns(groupCampaigns);
          
          if (groupCampaigns.length > 0) {
            // Determine which campaign should be active
            // Only use the activeCampaignId if it's actually a campaign ID
            let campaignIdToSet = '';
            
            if (groupProfile.activeCampaignId) {
              // Check if this ID corresponds to a campaign
              const campaignExists = groupCampaigns.some(c => c.id === groupProfile.activeCampaignId);
              
              if (campaignExists) {
                campaignIdToSet = groupProfile.activeCampaignId;
              } else {
                // If activeCampaignId doesn't point to a real campaign, use first available
                campaignIdToSet = groupCampaigns[0].id;
              }
            } else {
              // No activeCampaignId set yet, use first campaign
              campaignIdToSet = groupCampaigns[0].id;
            }
            
            // Set the active campaign
            console.log(`Setting active campaign to ${campaignIdToSet}`);
            firebaseServices.auth.setActiveCampaign(campaignIdToSet);
            setActiveCampaignId(campaignIdToSet);
          }
        } catch (err) {
          console.error(`Error loading campaigns for group ${groupId}:`, err);
        } finally {
          setCampaignsLoading(false);
        }
      } else {
        console.warn(`No group profile found for user ${authUser.uid} in group ${groupId}`);
      }
    } catch (err) {
      console.error('Error setting active group context:', err);
      setError(err instanceof Error ? err.message : 'Failed to set active group');
    }
  };

  // Refresh groups list
  const refreshGroups = async () => {
    if (!user) return [];
    
    try {
      console.log(`FirebaseContext: Refreshing groups for user ${user.uid}`);
      const userGroups = await firebaseServices.group.getGroups();
      console.log(`FirebaseContext: Found ${userGroups.length} groups for user ${user.uid}:`, userGroups);
      setGroups(userGroups);
      
      // If user has exactly one group and no active group is set, auto-select it
      if (userGroups.length === 1 && !activeGroupId) {
        await setActiveGroupContext(userGroups[0].id, user);
      }
      
      return userGroups;
    } catch (err) {
      console.error('Error loading groups:', err);
      return [];
    }
  };

  // Refresh campaigns list
  const refreshCampaigns = async () => {
    if (!activeGroupId) return [];
    
    try {
      const groupCampaigns = await firebaseServices.campaign.getCampaigns(activeGroupId);
      setCampaigns(groupCampaigns);
      
      // Auto-select first campaign if available and none is selected
      if (groupCampaigns.length > 0 && !activeCampaignId) {
        const campaignToActivate = groupCampaigns[0].id;
        console.log(`Setting active campaign to ${campaignToActivate}`);
        firebaseServices.auth.setActiveCampaign(campaignToActivate);
        setActiveCampaignId(campaignToActivate);
      }
      
      return groupCampaigns;
    } catch (err) {
      console.error('Error loading campaigns:', err);
      return [];
    }
  };

  // Load user profile with retry logic
  const loadUserProfile = async (userId: string) => {
    console.log(`Loading user profile for ${userId}`);
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const profile = await firebaseServices.user.getUserProfile(userId);
        console.log(`User profile loaded:`, profile);
        
        if (profile) {
          setUserProfile(profile);
          return profile;
        } else {
          console.warn(`No profile found for user ${userId}`);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        }
      } catch (err) {
        console.error(`Error loading user profile (attempt ${retryCount + 1}):`, err);
        if (retryCount >= maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000));
        retryCount++;
      }
    }
    
    throw new Error('Failed to load user profile after multiple attempts');
  };

  // Load groups with proper active group selection
  const loadGroups = async (userId: string, profile: UserProfile, currentUser: User) => {
    console.log(`Loading groups for user ${userId} with profile:`, profile);
    
    try {
      const userGroups = await firebaseServices.group.getGroups();
      console.log(`Loaded ${userGroups.length} groups for user ${userId}:`, userGroups);
      setGroups(userGroups);
      
      if (userGroups.length > 0) {
        // Set active group from the provided profile or default to first group
        const targetGroupId = profile.activeGroupId || userGroups[0].id;
        console.log(`Setting active group to ${targetGroupId}`);
        await setActiveGroupContext(targetGroupId, currentUser);
      } else {
        console.warn(`No groups found for user ${userId}`);
      }
      
      return userGroups;
    } catch (err) {
      console.error('Error loading groups:', err);
      throw err;
    }
  };

  // Listen to authentication state
  useEffect(() => {
    const auth = firebaseServices.auth.getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, 
      async (firebaseUser) => {
        console.log(`Auth state changed: user ${firebaseUser ? 'detected' : 'not detected'}`);
        setUser(firebaseUser);
        
        if (firebaseUser) {
          dispatchAuthStateChangedEvent(true);
          
          // Clear previous data to avoid mixing old and new data
          setUserProfile(null);
          setActiveGroupUserProfile(null);
          setGroups([]);
          setCampaigns([]);
          
          try {
            // Step 1: Load user profile
            setProfileLoading(true);
            const profile = await loadUserProfile(firebaseUser.uid);
            setProfileLoading(false);
            
            // Step 2: Load groups - using the profile returned from loadUserProfile
            if (profile) {
              setGroupsLoading(true);
              // Pass the firebaseUser directly to loadGroups
              await loadGroups(firebaseUser.uid, profile, firebaseUser);
              setGroupsLoading(false);
            } else {
              console.warn(`No profile loaded for user ${firebaseUser.uid}, cannot load groups`);
              setAuthLoading(false);
            }
          } catch (err) {
            console.error('Error in auth state change loading:', err);
            setError(err instanceof Error ? err.message : 'Failed to load user data');
            setAuthLoading(false);
          }
        } else {
          dispatchAuthStateChangedEvent(false);
          
          // Clear all state on logout
          setUserProfile(null);
          setActiveGroupUserProfile(null);
          setActiveGroupId(null);
          setActiveCampaignId(null);
          setGroups([]);
          setCampaigns([]);
          setAuthLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Context value
  const value: FirebaseContextType = {
    // Auth state
    user,
    userProfile,
    loading,
    error,
    setError,
    
    // Group context
    groups,
    activeGroupId,
    activeGroupUserProfile,
    
    // Campaign context
    campaigns,
    activeCampaignId,
    
    // Context updaters
    refreshGroups,
    refreshCampaigns,
    refreshUserProfile
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

// Base hook for accessing FirebaseContext
export const useFirebaseContext = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebaseContext must be used within a FirebaseProvider');
  }
  return context;
};