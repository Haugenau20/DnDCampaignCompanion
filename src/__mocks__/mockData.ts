// src/__mocks__/mockData.ts
export const mockNPC = {
    id: 'test-npc-1',
    name: 'Test NPC',
    status: 'alive',
    relationship: 'friendly',
    description: 'A test NPC',
    connections: {
      relatedNPCs: [],
      affiliations: [],
      relatedQuests: []
    },
    notes: []
  };
  
  export const mockQuest = {
    id: 'test-quest-1',
    title: 'Test Quest',
    description: 'A test quest',
    status: 'active',
    objectives: [
      { id: 'obj1', description: 'Test objective', completed: false }
    ]
  };
  
  export const mockLocation = {
    id: 'test-location-1',
    name: 'Test Location',
    type: 'city',
    status: 'explored',
    description: 'A test location'
  };
  
  export const mockChapter = {
    id: 'test-chapter-1',
    title: 'Test Chapter',
    content: 'Test chapter content',
    order: 1
  };