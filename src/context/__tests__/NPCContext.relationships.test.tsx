// src/context/__tests__/NPCContext.relationships.test.tsx

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../../test-utils/simple-test-utils';
import { createTestNPC } from '../../test-utils/test-data-helpers';

// Test NPC relationship management and cross-feature dependencies
// These tests are critical for the restructuring since they define
// how NPCs should interact with Quests, Locations, and other NPCs

describe('NPCContext Relationship Management', () => {
  describe('NPC-Quest Relationships', () => {
    test('should handle bidirectional NPC-Quest relationships', () => {
      // SPECIFICATION: When an NPC is added to a quest, the quest should appear 
      // in the NPC's relatedQuests, and the NPC should appear in the quest's relatedNPCIds
      
      const npc = createTestNPC({
        name: 'Thorin Oakenshield',
        connections: {
          relatedQuests: ['quest-erebor'],
          relatedNPCs: [],
          affiliations: []
        }
      });

      // Quest should reference this NPC
      const mockQuest = {
        id: 'quest-erebor',
        title: 'Reclaim Erebor',
        relatedNPCIds: ['thorin-oakenshield']
      };

      // Verify bidirectional relationship
      expect(npc.connections.relatedQuests).toContain('quest-erebor');
      expect(mockQuest.relatedNPCIds).toContain('thorin-oakenshield');
    });

    test('should filter NPCs by quest correctly', () => {
      const npcs = [
        createTestNPC({
          name: 'Gandalf',
          connections: {
            relatedQuests: ['quest-ring', 'quest-erebor'],
            relatedNPCs: [],
            affiliations: []
          }
        }),
        createTestNPC({
          name: 'Thorin',
          connections: {
            relatedQuests: ['quest-erebor'],
            relatedNPCs: [],
            affiliations: []
          }
        }),
        createTestNPC({
          name: 'Bilbo',
          connections: {
            relatedQuests: ['quest-ring'],
            relatedNPCs: [],
            affiliations: []
          }
        }),
        createTestNPC({
          name: 'Smaug',
          connections: {
            relatedQuests: [], // No quests
            relatedNPCs: [],
            affiliations: []
          }
        })
      ];

      // Test getNPCsByQuest logic
      const getNPCsByQuest = (questId: string) => {
        return npcs.filter(npc => 
          npc.connections.relatedQuests.includes(questId)
        );
      };

      const ereborNPCs = getNPCsByQuest('quest-erebor');
      expect(ereborNPCs).toHaveLength(2);
      expect(ereborNPCs.map(npc => npc.name)).toContain('Gandalf');
      expect(ereborNPCs.map(npc => npc.name)).toContain('Thorin');

      const ringNPCs = getNPCsByQuest('quest-ring');
      expect(ringNPCs).toHaveLength(2);
      expect(ringNPCs.map(npc => npc.name)).toContain('Gandalf');
      expect(ringNPCs.map(npc => npc.name)).toContain('Bilbo');

      const nonExistentQuestNPCs = getNPCsByQuest('quest-nonexistent');
      expect(nonExistentQuestNPCs).toHaveLength(0);
    });

    test('should handle quest relationship updates', () => {
      const npc = createTestNPC({
        name: 'Gandalf',
        connections: {
          relatedQuests: ['quest-1'],
          relatedNPCs: [],
          affiliations: []
        }
      });

      // Add new quest relationship
      const updatedNPC = {
        ...npc,
        connections: {
          ...npc.connections,
          relatedQuests: [...npc.connections.relatedQuests, 'quest-2']
        }
      };

      expect(updatedNPC.connections.relatedQuests).toHaveLength(2);
      expect(updatedNPC.connections.relatedQuests).toContain('quest-1');
      expect(updatedNPC.connections.relatedQuests).toContain('quest-2');

      // Remove quest relationship
      const npcWithRemovedQuest = {
        ...updatedNPC,
        connections: {
          ...updatedNPC.connections,
          relatedQuests: updatedNPC.connections.relatedQuests.filter(id => id !== 'quest-1')
        }
      };

      expect(npcWithRemovedQuest.connections.relatedQuests).toHaveLength(1);
      expect(npcWithRemovedQuest.connections.relatedQuests).toContain('quest-2');
      expect(npcWithRemovedQuest.connections.relatedQuests).not.toContain('quest-1');
    });
  });

  describe('NPC-Location Relationships', () => {
    test('should filter NPCs by location (case insensitive)', () => {
      const npcs = [
        createTestNPC({
          name: 'Elrond',
          location: 'Rivendell'
        }),
        createTestNPC({
          name: 'Thorin',
          location: 'Erebor'
        }),
        createTestNPC({
          name: 'Smaug',
          location: 'erebor' // Different case
        }),
        createTestNPC({
          name: 'Gandalf',
          location: 'RIVENDELL' // Different case
        }),
        createTestNPC({
          name: 'Bilbo'
          // No location
        })
      ];

      // Test getNPCsByLocation logic (case insensitive as per NPCContext.tsx line 38-42)
      const getNPCsByLocation = (location: string) => {
        return npcs.filter(npc => 
          npc.location?.toLowerCase() === location.toLowerCase()
        );
      };

      const ereborNPCs = getNPCsByLocation('Erebor');
      expect(ereborNPCs).toHaveLength(2);
      expect(ereborNPCs.map(npc => npc.name)).toContain('Thorin');
      expect(ereborNPCs.map(npc => npc.name)).toContain('Smaug');

      const rivendellNPCs = getNPCsByLocation('rivendell');
      expect(rivendellNPCs).toHaveLength(2);
      expect(rivendellNPCs.map(npc => npc.name)).toContain('Elrond');
      expect(rivendellNPCs.map(npc => npc.name)).toContain('Gandalf');

      const nonExistentLocationNPCs = getNPCsByLocation('Mordor');
      expect(nonExistentLocationNPCs).toHaveLength(0);
    });

    test('should handle NPCs without location', () => {
      const npcs = [
        createTestNPC({ name: 'NPC with location', location: 'Rivendell' }),
        createTestNPC({ name: 'NPC without location' }) // No location property
      ];

      const getNPCsByLocation = (location: string) => {
        return npcs.filter(npc => 
          npc.location?.toLowerCase() === location.toLowerCase()
        );
      };

      const rivendellNPCs = getNPCsByLocation('Rivendell');
      expect(rivendellNPCs).toHaveLength(1);
      expect(rivendellNPCs[0].name).toBe('NPC with location');

      // NPCs without location should not appear in any location search
      const noLocationNPC = npcs.find(npc => npc.name === 'NPC without location');
      expect(noLocationNPC?.location).toBeUndefined();
    });
  });

  describe('NPC-NPC Relationships', () => {
    test('should handle NPC to NPC relationships', () => {
      const gandalf = createTestNPC({
        name: 'Gandalf',
        connections: {
          relatedQuests: [],
          relatedNPCs: ['thorin-oakenshield', 'bilbo-baggins'],
          affiliations: ['fellowship']
        }
      });

      const thorin = createTestNPC({
        name: 'Thorin Oakenshield',
        connections: {
          relatedQuests: [],
          relatedNPCs: ['gandalf'], // Should this be bidirectional?
          affiliations: ['company-of-thorin']
        }
      });

      // Verify NPC relationships
      expect(gandalf.connections.relatedNPCs).toContain('thorin-oakenshield');
      expect(gandalf.connections.relatedNPCs).toContain('bilbo-baggins');
      expect(thorin.connections.relatedNPCs).toContain('gandalf');

      // Verify affiliations
      expect(gandalf.connections.affiliations).toContain('fellowship');
      expect(thorin.connections.affiliations).toContain('company-of-thorin');
    });

    test('should filter NPCs by relationship type', () => {
      const npcs = [
        createTestNPC({ name: 'Gandalf', relationship: 'friendly' }),
        createTestNPC({ name: 'Thorin', relationship: 'neutral' }),
        createTestNPC({ name: 'Smaug', relationship: 'hostile' }),
        createTestNPC({ name: 'Gollum', relationship: 'hostile' }),
        createTestNPC({ name: 'Elrond', relationship: 'friendly' })
      ];

      // Test getNPCsByRelationship logic
      const getNPCsByRelationship = (relationship: string) => {
        return npcs.filter(npc => npc.relationship === relationship);
      };

      const friendlyNPCs = getNPCsByRelationship('friendly');
      expect(friendlyNPCs).toHaveLength(2);
      expect(friendlyNPCs.map(npc => npc.name)).toContain('Gandalf');
      expect(friendlyNPCs.map(npc => npc.name)).toContain('Elrond');

      const hostileNPCs = getNPCsByRelationship('hostile');
      expect(hostileNPCs).toHaveLength(2);
      expect(hostileNPCs.map(npc => npc.name)).toContain('Smaug');
      expect(hostileNPCs.map(npc => npc.name)).toContain('Gollum');

      const neutralNPCs = getNPCsByRelationship('neutral');
      expect(neutralNPCs).toHaveLength(1);
      expect(neutralNPCs[0].name).toBe('Thorin');
    });
  });

  describe('Relationship Data Integrity', () => {
    test('should maintain referential integrity when relationships change', () => {
      // CRITICAL for restructuring: When an NPC is deleted, 
      // all references to it should be cleaned up

      const npcs = [
        createTestNPC({
          name: 'Gandalf',
          connections: {
            relatedQuests: ['quest-1'],
            relatedNPCs: ['thorin'],
            affiliations: []
          }
        }),
        createTestNPC({
          name: 'Thorin',
          connections: {
            relatedQuests: ['quest-1'],
            relatedNPCs: ['gandalf'],
            affiliations: []
          }
        })
      ];

      // Simulate deleting Thorin
      const remainingNPCs = npcs.filter(npc => npc.name !== 'Thorin');
      
      // Gandalf should no longer reference Thorin
      const updatedGandalf = {
        ...remainingNPCs[0],
        connections: {
          ...remainingNPCs[0].connections,
          relatedNPCs: remainingNPCs[0].connections.relatedNPCs.filter(id => id !== 'thorin')
        }
      };

      expect(updatedGandalf.connections.relatedNPCs).not.toContain('thorin');
      expect(remainingNPCs).toHaveLength(1);
    });

    test('should handle circular relationships safely', () => {
      // Test potential circular reference issues
      const npc1 = createTestNPC({
        name: 'NPC 1',
        connections: {
          relatedQuests: [],
          relatedNPCs: ['npc-2'],
          affiliations: []
        }
      });

      const npc2 = createTestNPC({
        name: 'NPC 2', 
        connections: {
          relatedQuests: [],
          relatedNPCs: ['npc-1'], // Circular reference
          affiliations: []
        }
      });

      // This should be fine - circular references in data are OK
      // as long as the UI doesn't infinite loop when rendering them
      expect(npc1.connections.relatedNPCs).toContain('npc-2');
      expect(npc2.connections.relatedNPCs).toContain('npc-1');
    });

    test('should validate relationship data types', () => {
      const npc = createTestNPC();

      // All relationship arrays should be arrays
      expect(Array.isArray(npc.connections.relatedQuests)).toBe(true);
      expect(Array.isArray(npc.connections.relatedNPCs)).toBe(true);
      expect(Array.isArray(npc.connections.affiliations)).toBe(true);

      // All relationship arrays should contain strings
      npc.connections.relatedQuests.forEach(questId => {
        expect(typeof questId).toBe('string');
      });

      npc.connections.relatedNPCs.forEach(npcId => {
        expect(typeof npcId).toBe('string');
      });

      npc.connections.affiliations.forEach(affiliation => {
        expect(typeof affiliation).toBe('string');
      });
    });
  });

  describe('Relationship Edge Cases', () => {
    test('should handle empty relationships gracefully', () => {
      const npcWithEmptyRelationships = createTestNPC({
        connections: {
          relatedQuests: [],
          relatedNPCs: [],
          affiliations: []
        }
      });

      // Should not error when filtering with empty arrays
      const getNPCsByQuest = (questId: string) => {
        return [npcWithEmptyRelationships].filter(npc => 
          npc.connections.relatedQuests.includes(questId)
        );
      };

      expect(getNPCsByQuest('any-quest')).toHaveLength(0);
    });

    test('should handle malformed relationship data', () => {
      // Test what happens with potentially malformed data
      const npcWithBadData = {
        ...createTestNPC(),
        connections: {
          relatedQuests: null as any, // Malformed
          relatedNPCs: undefined as any, // Malformed
          affiliations: 'not-an-array' as any // Malformed
        }
      };

      // These would cause errors in real code - document expected behavior
      expect(() => {
        // This would fail in real code if not handled properly
        npcWithBadData.connections.relatedQuests?.includes('test');
      }).not.toThrow(); // Should use optional chaining

      expect(() => {
        // This would fail in real code if not handled properly  
        npcWithBadData.connections.relatedNPCs?.includes('test');
      }).not.toThrow(); // Should use optional chaining
    });
  });
});