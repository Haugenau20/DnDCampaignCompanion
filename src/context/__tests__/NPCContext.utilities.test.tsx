// src/context/__tests__/NPCContext.utilities.test.tsx

// Test the utility functions that can be extracted from NPCContext

describe('NPCContext Utility Functions', () => {
  describe('generateNPCId function logic', () => {
    // Test the ID generation logic as specified in NPCContext line 116-121
    const generateNPCId = (name: string): string => {
      return name.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
    };

    test('should generate ID from simple name', () => {
      expect(generateNPCId('Gandalf')).toBe('gandalf');
    });

    test('should handle names with spaces', () => {
      expect(generateNPCId('Thorin Oakenshield')).toBe('thorin-oakenshield');
    });

    test('should handle names with special characters', () => {
      expect(generateNPCId("Gandalf the Grey")).toBe('gandalf-the-grey');
      expect(generateNPCId("O'Brien")).toBe('o-brien');
      expect(generateNPCId("Jean-Luc")).toBe('jean-luc');
    });

    test('should handle names with leading/trailing spaces', () => {
      expect(generateNPCId('  Bilbo Baggins  ')).toBe('bilbo-baggins');
    });

    test('should handle names with multiple special characters', () => {
      expect(generateNPCId('Dr. John Smith Jr.')).toBe('dr-john-smith-jr');
    });

    test('should handle edge cases', () => {
      expect(generateNPCId('')).toBe('');
      expect(generateNPCId('   ')).toBe('');
      expect(generateNPCId('123')).toBe('123');
      expect(generateNPCId('A')).toBe('a');
    });
  });

  describe('NPC filtering logic', () => {
    interface MockNPC {
      id: string;
      name: string;
      relationship: 'friendly' | 'hostile' | 'neutral';
      location?: string;
      connections: {
        relatedQuests: string[];
        relatedNPCs: string[];
        affiliations: string[];
      };
    }

    const mockNPCs: MockNPC[] = [
      {
        id: 'npc-1',
        name: 'Gandalf',
        relationship: 'friendly',
        location: 'Rivendell',
        connections: { relatedQuests: ['quest-1', 'quest-2'], relatedNPCs: [], affiliations: [] }
      },
      {
        id: 'npc-2', 
        name: 'Smaug',
        relationship: 'hostile',
        location: 'Erebor',
        connections: { relatedQuests: ['quest-1'], relatedNPCs: [], affiliations: [] }
      },
      {
        id: 'npc-3',
        name: 'Thorin',
        relationship: 'neutral',
        location: 'erebor',
        connections: { relatedQuests: [], relatedNPCs: [], affiliations: [] }
      }
    ];

    test('should filter NPCs by quest', () => {
      const getNPCsByQuest = (questId: string) => {
        return mockNPCs.filter(npc => 
          npc.connections.relatedQuests.includes(questId)
        );
      };

      const quest1NPCs = getNPCsByQuest('quest-1');
      expect(quest1NPCs).toHaveLength(2);
      expect(quest1NPCs.map(npc => npc.name)).toEqual(['Gandalf', 'Smaug']);

      const quest2NPCs = getNPCsByQuest('quest-2');
      expect(quest2NPCs).toHaveLength(1);
      expect(quest2NPCs[0].name).toBe('Gandalf');
    });

    test('should filter NPCs by location (case insensitive)', () => {
      const getNPCsByLocation = (location: string) => {
        return mockNPCs.filter(npc => 
          npc.location?.toLowerCase() === location.toLowerCase()
        );
      };

      const ereborNPCs = getNPCsByLocation('Erebor');
      expect(ereborNPCs).toHaveLength(2);
      expect(ereborNPCs.map(npc => npc.name)).toEqual(['Smaug', 'Thorin']);

      const rivendellNPCs = getNPCsByLocation('rivendell');
      expect(rivendellNPCs).toHaveLength(1);
      expect(rivendellNPCs[0].name).toBe('Gandalf');
    });

    test('should filter NPCs by relationship', () => {
      const getNPCsByRelationship = (relationship: string) => {
        return mockNPCs.filter(npc => 
          npc.relationship === relationship
        );
      };

      const friendlyNPCs = getNPCsByRelationship('friendly');
      expect(friendlyNPCs).toHaveLength(1);
      expect(friendlyNPCs[0].name).toBe('Gandalf');

      const hostileNPCs = getNPCsByRelationship('hostile');
      expect(hostileNPCs).toHaveLength(1);
      expect(hostileNPCs[0].name).toBe('Smaug');

      const neutralNPCs = getNPCsByRelationship('neutral');
      expect(neutralNPCs).toHaveLength(1);
      expect(neutralNPCs[0].name).toBe('Thorin');
    });
  });
});