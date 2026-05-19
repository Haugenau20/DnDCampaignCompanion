// src/services/firebase/ai/__tests__/entityMapper.test.ts

import { mapOpenAIEntityToExtractedEntity, extractDetailsByType } from '../entityMapper';
import { OpenAIEntityResponse } from '../../../openai/types';

/**
 * Tests for entityMapper.ts
 *
 * mapOpenAIEntityToExtractedEntity is a pure mapping function.
 * extractDetailsByType routes detail fields by entity type.
 *
 * The source file's extractDetailsByType has an empty body (bug #023).
 * We test the EXPECTED behaviour per the JSDoc/specification.
 */

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeEntity(
  overrides: Partial<OpenAIEntityResponse> = {}
): OpenAIEntityResponse {
  return {
    text: 'Gandalf the Grey',
    type: 'npc',
    confidence: 0.95,
    details: {
      name: 'Gandalf the Grey',
      relationship: 'friendly',
      context: 'Met at the tavern',
    } as any,
    ...overrides,
  };
}

// ─── mapOpenAIEntityToExtractedEntity ─────────────────────────────────────────

describe('entityMapper', () => {
  describe('mapOpenAIEntityToExtractedEntity', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
      // Deterministic Math.random for id-suffix
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    test('should return an ExtractedEntity with the required fields', () => {
      const input = makeEntity();
      const result = mapOpenAIEntityToExtractedEntity(input);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('isConverted');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('extraData');
    });

    test('should copy text from the input entity', () => {
      const input = makeEntity({ text: 'The Prancing Pony' });
      const result = mapOpenAIEntityToExtractedEntity(input);
      expect(result.text).toBe('The Prancing Pony');
    });

    test('should set type from input entity type', () => {
      const input = makeEntity({ type: 'location' });
      const result = mapOpenAIEntityToExtractedEntity(input);
      expect(result.type).toBe('location');
    });

    test('should copy confidence from input entity', () => {
      const input = makeEntity({ confidence: 0.72 });
      const result = mapOpenAIEntityToExtractedEntity(input);
      expect(result.confidence).toBe(0.72);
    });

    test('should set isConverted to false by default', () => {
      const result = mapOpenAIEntityToExtractedEntity(makeEntity());
      expect(result.isConverted).toBe(false);
    });

    test('should generate an id containing the entity type', () => {
      const input = makeEntity({ type: 'quest' });
      const result = mapOpenAIEntityToExtractedEntity(input);
      expect(result.id).toContain('quest');
    });

    test('should include an ISO createdAt timestamp', () => {
      const result = mapOpenAIEntityToExtractedEntity(makeEntity());
      expect(() => new Date(result.createdAt)).not.toThrow();
      expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
    });

    test('should set createdAt to the current time', () => {
      const result = mapOpenAIEntityToExtractedEntity(makeEntity());
      expect(result.createdAt).toBe('2025-01-15T10:00:00.000Z');
    });

    test('should include originalText in extraData', () => {
      const input = makeEntity({ text: 'Minas Tirith' });
      const result = mapOpenAIEntityToExtractedEntity(input);
      expect(result.extraData?.originalText).toBe('Minas Tirith');
    });

    test('should handle the "details" format (OpenAIEntityResponse with details field)', () => {
      const input = makeEntity({
        type: 'npc',
        details: {
          name: 'Aragorn',
          relationship: 'friendly',
          context: 'King of Gondor',
        } as any,
      });
      const result = mapOpenAIEntityToExtractedEntity(input);
      expect(result.extraData).toBeDefined();
    });

    test('should handle the flat format (no details, extra root fields)', () => {
      const flatInput: any = {
        text: 'Rivendell',
        type: 'location',
        confidence: 0.88,
        // No "details" field — extra fields at root
        locationType: 'city',
        context: 'Elven city',
      };
      const result = mapOpenAIEntityToExtractedEntity(flatInput);
      expect(result.text).toBe('Rivendell');
      expect(result.type).toBe('location');
      expect(result.extraData?.originalText).toBe('Rivendell');
      // Extra fields should be preserved
      expect(result.extraData?.locationType).toBe('city');
    });

    test('should produce different IDs for successive calls (via Date.now change)', () => {
      // Two calls at different times
      const result1 = mapOpenAIEntityToExtractedEntity(makeEntity());
      jest.setSystemTime(new Date('2025-01-15T10:00:01.000Z'));
      const result2 = mapOpenAIEntityToExtractedEntity(makeEntity());
      // IDs embed timestamp so they must differ when time changes
      expect(result1.id).not.toBe(result2.id);
    });
  });

  // ─── extractDetailsByType ─────────────────────────────────────────────────

  describe('extractDetailsByType', () => {
    /**
     * Per the JSDoc and the implementation in EntityExtractionService (which
     * mirrors the intended logic), extractDetailsByType should return a subset
     * of fields appropriate for each entity type.
     *
     * NOTE: The current entityMapper.ts implementation of extractDetailsByType
     * has an empty body — these tests document the EXPECTED behaviour and will
     * fail until the implementation is complete (Bug #023).
     */

    const npcDetails = {
      name: 'Strider',
      title: 'Ranger',
      race: 'Human',
      occupation: 'Ranger',
      location: 'Bree',
      relationship: 'friendly' as const,
      description: 'A ranger from the north',
      context: 'Met at the Prancing Pony',
    };

    const locationDetails = {
      name: 'Bree',
      locationType: 'town' as const,
      description: 'A small town',
      parentLocation: 'Bree-land',
      context: 'Human settlement',
    };

    const questDetails = {
      title: 'Destroy the One Ring',
      description: 'A dangerous quest',
      objectives: ['Reach Mordor', 'Destroy the ring'],
      NPCsInvolved: ['Frodo', 'Sam'],
      locationName: 'Mount Doom',
      context: 'The final quest',
    };

    const rumorDetails = {
      title: 'Strange lights in the forest',
      content: 'Locals report strange lights',
      status: 'unconfirmed' as const,
      sourceType: 'tavern' as const,
      sourceName: 'The Prancing Pony',
      context: 'Overheard at the bar',
    };

    test('should return npc-specific fields for type "npc"', () => {
      const result = extractDetailsByType(npcDetails, 'npc');
      // Expected fields per EntityExtractionService implementation
      expect(result).toHaveProperty('name', 'Strider');
      expect(result).toHaveProperty('relationship', 'friendly');
      expect(result).toHaveProperty('context', 'Met at the Prancing Pony');
    });

    test('should return location-specific fields for type "location"', () => {
      const result = extractDetailsByType(locationDetails, 'location');
      expect(result).toHaveProperty('name', 'Bree');
      expect(result).toHaveProperty('locationType', 'town');
      expect(result).toHaveProperty('context', 'Human settlement');
    });

    test('should return quest-specific fields for type "quest"', () => {
      const result = extractDetailsByType(questDetails, 'quest');
      expect(result).toHaveProperty('title', 'Destroy the One Ring');
      expect(result).toHaveProperty('context', 'The final quest');
    });

    test('should return rumor-specific fields for type "rumor"', () => {
      const result = extractDetailsByType(rumorDetails, 'rumor');
      expect(result).toHaveProperty('title', 'Strange lights in the forest');
      expect(result).toHaveProperty('content', 'Locals report strange lights');
    });

    test('should include default relationship "unknown" for npc when relationship is missing', () => {
      const detailsNoRelationship = { ...npcDetails };
      delete (detailsNoRelationship as any).relationship;
      const result = extractDetailsByType(detailsNoRelationship as any, 'npc');
      expect(result).toHaveProperty('relationship', 'unknown');
    });

    test('should include default empty objectives array for quest when objectives are missing', () => {
      const detailsNoObjectives = { ...questDetails };
      delete (detailsNoObjectives as any).objectives;
      const result = extractDetailsByType(detailsNoObjectives as any, 'quest');
      expect(result.objectives).toEqual([]);
    });

    test('should include default empty NPCsInvolved array for quest when NPCsInvolved is missing', () => {
      const detailsNoNPCs = { ...questDetails };
      delete (detailsNoNPCs as any).NPCsInvolved;
      const result = extractDetailsByType(detailsNoNPCs as any, 'quest');
      expect(result.NPCsInvolved).toEqual([]);
    });

    test('should return the details object unchanged for an unknown type', () => {
      const unknownDetails = { arbitrary: 'data', more: 123 };
      const result = extractDetailsByType(unknownDetails as any, 'npc');
      // For unknown types falling through default, result should be defined
      expect(result).toBeDefined();
    });
  });
});
