// src/utils/__dev__/generators/groupGenerator.ts

import { doc, setDoc } from 'firebase/firestore';
import { UserData, UserMapping } from './userGenerator';

// Create two groups with actual creator UID
export const createGroups = async (db: any, userMapping: UserMapping) => {
  const dmUid = userMapping['dm'];
  
  // Create Group 1: The Fellowship
  const group1Id = 'group1';
  const group1Data = {
    name: 'The Fellowship',
    description: 'A group of adventurers bound by a common quest to destroy the One Ring.',
    createdAt: new Date().toISOString(),
    createdBy: dmUid
  };
  
  await setDoc(doc(db, 'groups', group1Id), group1Data);
  console.log(`Created group: ${group1Data.name} (${group1Id})`);
  
  // Create Group 2: The Council of Elrond
  const group2Id = 'group2';
  const group2Data = {
    name: 'The Council of Elrond',
    description: 'Representatives of the free peoples of Middle-earth who gathered to decide the fate of the One Ring.',
    createdAt: new Date().toISOString(),
    createdBy: dmUid
  };
  
  await setDoc(doc(db, 'groups', group2Id), group2Data);
  console.log(`Created group: ${group2Data.name} (${group2Id})`);
  
  return { group1Id, group2Id };
};

// Add users to groups with appropriate roles
export const addUsersToGroups = async (db: any, users: UserData[], groups: { group1Id: string, group2Id: string }, formattedDate: string) => {
  // Process each user
  for (const user of users) {
    // Determine which group(s) this user belongs to
    let userGroups = [];
    let isAdmin = false;
    
    if (user.username === 'DungeonMaster') {
      // DM is admin in both groups
      userGroups = [groups.group1Id, groups.group2Id];
      isAdmin = true;
    } else if (user.username === 'Aragorn') {
      // Aragorn is in both groups as a regular member
      userGroups = [groups.group1Id, groups.group2Id];
      isAdmin = false;
    } else if (['Gandalf', 'Gimli', 'Legolas'].includes(user.username)) {
      // These users are only in group 1
      userGroups = [groups.group1Id];
      isAdmin = false;
    } else {
      // Frodo, Samwise, and Pippin are only in group 2
      userGroups = [groups.group2Id];
      isAdmin = false;
    }
    
    // Add user to each applicable group
    for (const groupId of userGroups) {
      // Create user membership in group
      const groupUserData = {
        username: user.username,
        role: isAdmin ? 'admin' : 'member',
        joinedAt: formattedDate,
        characters: isAdmin ? [] : [`${user.username}'s Character`],
        activeCampaignId: groupId === groups.group1Id ? 'campaign1-1' : 'campaign2-1', // Set default active campaign
        preferences: { theme: 'dark', notifications: true }
      };
      
      await setDoc(doc(db, 'groups', groupId, 'users', user.id), groupUserData);
      console.log(`Added user ${user.username} to group ${groupId} as ${groupUserData.role}`);
      
      // Also create username document for lookup
      await setDoc(doc(db, 'groups', groupId, 'usernames', user.username.toLowerCase()), {
        userId: user.id,
        originalUsername: user.username,
        createdAt: formattedDate
      });
    }
  }
  
  // Create registration tokens for each group
  await createGroupTokens(db, groups.group1Id, users, formattedDate);
  await createGroupTokens(db, groups.group2Id, users, formattedDate);
};

// Helper to create tokens for a group
const createGroupTokens = async (db: any, groupId: string, users: UserData[], formattedDate: string) => {
  // Find the admin (DM) for this group
  const dmUser = users.find(u => u.username === 'DungeonMaster');
  if (!dmUser) return;

  // Determine which users should have tokens in this group
  let tokenUsers = [];
  
  if (groupId === 'group1') {
    // Group 1 tokens: Aragorn, Gandalf, Gimli
    tokenUsers = users.filter(u => ['Aragorn', 'Gandalf', 'Gimli'].includes(u.username));
  } else {
    // Group 2 tokens: Aragorn, Frodo, Samwise
    tokenUsers = users.filter(u => ['Aragorn', 'Frodo', 'Samwise'].includes(u.username));
  }
  
  // Create tokens
  for (let i = 0; i < tokenUsers.length; i++) {
    const user = tokenUsers[i];
    
    const token = {
      id: `token${i+1}-${groupId}`,
      token: `${groupId}-token-${i+1}`,
      createdAt: formattedDate,
      createdBy: dmUser.id,
      used: true,
      usedAt: formattedDate,
      usedBy: user.id,
      notes: `Token for ${user.username}`
    };
    
    await setDoc(doc(db, 'groups', groupId, 'registrationTokens', token.id), token);
    console.log(`Created token for ${user.username} in group ${groupId}`);
  }
  
  // Create one unused token for future members
  const unusedToken = {
    id: `token-unused-${groupId}`,
    token: `${groupId}-unused-token`,
    createdAt: formattedDate,
    createdBy: dmUser.id,
    used: false,
    notes: 'Spare token for future players'
  };
  
  await setDoc(doc(db, 'groups', groupId, 'registrationTokens', unusedToken.id), unusedToken);
  console.log(`Created unused token for group ${groupId}`);
};