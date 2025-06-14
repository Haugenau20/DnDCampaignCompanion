// src/test-utils/test-data-helpers.ts

import { NPC } from '../types/npc';
import { Quest, QuestObjective, QuestLocation, QuestNPC, QuestStatus } from '../types/quest';
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
  leads: ['Initial lead'],
  keyLocations: [{
    name: 'Test Location',
    description: 'A location important to this quest'
  }],
  importantNPCs: [{
    name: 'Test NPC',
    description: 'An NPC important to this quest'
  }],
  relatedNPCIds: [],
  complications: ['Potential complication'],
  rewards: ['Test reward'],
  location: 'Starting Location',
  levelRange: '1-3',
  createdBy: 'test-user-1',
  createdByUsername: 'test-user',
  dateAdded: new Date().toISOString(),
  ...overrides
});

// Quest-specific test data helpers
export const createTestQuestObjective = (overrides: Partial<QuestObjective> = {}): QuestObjective => ({
  id: `obj-${Date.now()}-${testIdCounter++}`,
  description: 'Test objective description',
  completed: false,
  ...overrides
});

export const createTestQuestLocation = (overrides: Partial<QuestLocation> = {}): QuestLocation => ({
  name: 'Test Quest Location',
  description: 'A location related to the quest',
  ...overrides
});

export const createTestQuestNPC = (overrides: Partial<QuestNPC> = {}): QuestNPC => ({
  name: 'Test Quest NPC',
  description: 'An NPC related to the quest',
  ...overrides
});

// Quest status helpers
export const createQuestWithStatus = (status: QuestStatus, overrides: Partial<Quest> = {}): Quest => {
  const baseQuest = createTestQuest(overrides);
  const now = new Date().toISOString();
  
  switch (status) {
    case 'completed':
      return {
        ...baseQuest,
        status: 'completed',
        dateCompleted: now,
        objectives: baseQuest.objectives.map(obj => ({ ...obj, completed: true }))
      };
    case 'failed':
      return {
        ...baseQuest,
        status: 'failed'
      };
    default:
      return {
        ...baseQuest,
        status
      };
  }
};

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
    relatedNPCIds: [npc.id],
    keyLocations: [{ name: 'Erebor', description: 'The Lonely Mountain' }]
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
    activeQuest: createQuestWithStatus('active'),
    completedQuest: createQuestWithStatus('completed'),
    failedQuest: createQuestWithStatus('failed')
  }),

  questCrud: () => ({
    quest: createTestQuest(),
    updatedData: { 
      title: 'Updated Quest Title', 
      description: 'Updated description',
      status: 'completed' as QuestStatus 
    }
  }),

  questObjectives: () => ({
    quest: createTestQuest({
      objectives: [
        createTestQuestObjective({ id: 'obj-1', description: 'First objective', completed: false }),
        createTestQuestObjective({ id: 'obj-2', description: 'Second objective', completed: true }),
        createTestQuestObjective({ id: 'obj-3', description: 'Third objective', completed: false })
      ]
    })
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