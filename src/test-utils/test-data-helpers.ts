// src/test-utils/test-data-helpers.ts

import { NPC } from '../types/npc';
import { Quest } from '../types/quest';
import { Location } from '../types/location';
import { Rumor } from '../types/rumor';

// Counter for unique IDs
let testIdCounter = 1;

// Test data that matches your existing type structure
export const createTestNPC = (overrides: Partial<NPC> = {}): NPC => ({
  id: `test-npc-${Date.now()}-${testIdCounter++}`,
  name: 'Test NPC',
  description: 'A test character for testing purposes',
  status: 'alive',
  relationship: 'neutral',
  connections: {
    relatedNPCs: [],
    affiliations: [],
    relatedQuests: []
  },
  notes: [],
  createdBy: 'test-user-1',
  createdByUsername: 'test-user',
  dateAdded: new Date().toISOString(),
  ...overrides
});

export const createTestQuest = (overrides: Partial<Quest> = {}): Quest => ({
  id: `test-quest-${Date.now()}-${testIdCounter++}`,
  title: 'Test Quest',
  description: 'A test quest for testing purposes',
  status: 'active',
  objectives: [{
    id: 'obj-1',
    description: 'Test objective',
    completed: false
  }],
  rewards: ['Test reward'],
  relatedNPCIds: [],
  createdBy: 'test-user-1',
  createdByUsername: 'test-user',
  dateAdded: new Date().toISOString(),
  ...overrides
});

export const createTestLocation = (overrides: Partial<Location> = {}): Location => ({
  id: `test-location-${Date.now()}-${testIdCounter++}`,
  name: 'Test Location',
  description: 'A test location for testing purposes',
  type: 'city',
  status: 'known',
  connectedNPCs: [],
  relatedQuests: [],
  notes: [],
  tags: [],
  createdBy: 'test-user-1',
  createdByUsername: 'test-user',
  dateAdded: new Date().toISOString(),
  ...overrides
});

export const createTestRumor = (overrides: Partial<Rumor> = {}): Rumor => ({
  id: `test-rumor-${Date.now()}-${testIdCounter++}`,
  title: 'Test Rumor',
  content: 'A test rumor for testing purposes',
  status: 'unconfirmed',
  sourceType: 'tavern',
  sourceName: 'Test Source',
  relatedNPCs: [],
  relatedLocations: [],
  notes: [],
  createdBy: 'test-user-1',
  createdByUsername: 'test-user',
  dateAdded: new Date().toISOString(),
  ...overrides
});

// Helper to create interconnected test data (mimics real campaign relationships)
export const createInterconnectedTestData = () => {
  const npc = createTestNPC({
    name: 'Thorin Oakenshield',
    description: 'Dwarf warrior and leader'
  });

  const quest = createTestQuest({
    title: 'Reclaim Erebor',
    description: 'Retake the Lonely Mountain',
    relatedNPCIds: [npc.id]
  });

  const location = createTestLocation({
    name: 'Erebor',
    description: 'The Lonely Mountain',
    relatedQuests: [quest.id],
    connectedNPCs: [npc.id]
  });

  const rumor = createTestRumor({
    title: 'Dragon Sighting',
    content: 'Smaug has been seen near the mountain'
  });

  // Update NPC with quest relationship
  npc.connections.relatedQuests = [quest.id];

  return { npc, quest, location, rumor };
};

// Helper to create test data for specific scenarios
export const createTestDataFor = {
  npcCrud: () => ({
    npc: createTestNPC(),
    updatedData: { name: 'Updated NPC Name', description: 'Updated description' }
  }),
  
  questManagement: () => ({
    activeQuest: createTestQuest({ status: 'active' }),
    completedQuest: createTestQuest({ status: 'completed' }),
    failedQuest: createTestQuest({ status: 'failed' })
  }),

  relationshipTesting: () => createInterconnectedTestData(),

  searchTesting: () => ({
    npcs: [
      createTestNPC({ name: 'Gandalf' }),
      createTestNPC({ name: 'Thorin' }),
      createTestNPC({ name: 'Bilbo' })
    ],
    quests: [
      createTestQuest({ title: 'Find the Ring' }),
      createTestQuest({ title: 'Defeat Smaug' })
    ],
    locations: [
      createTestLocation({ name: 'Rivendell' }),
      createTestLocation({ name: 'Erebor' })
    ]
  })
};