// src/context/__tests__/behavioral/RumorContext.bugs.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { RumorProvider, useRumors } from '../../RumorContext';
import { Rumor, RumorStatus, RumorNote, SourceType } from '../../../types/rumor';

/**
 * RumorContext Bug Discovery Testing
 * 
 * Tests that INTENTIONALLY FAIL to document and track real implementation bugs.
 * These tests define the EXPECTED behavior and will pass once bugs are fixed.
 * 
 * IMPORTANT: These tests are designed to fail until bugs are resolved.
 * Do not modify these tests to make them pass - fix the implementation instead.
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseFirestore = jest.fn();
const mockUseRumorData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useFirestore: () => mockUseFirestore(),
}));

jest.mock('../../../hooks/useRumorData', () => ({
  useRumorData: () => mockUseRumorData(),
}));

jest.mock('../../../hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

// Mock user utilities for proper testing
jest.mock('../../../utils/user-utils', () => ({
  getUserName: jest.fn(),
  getActiveCharacterName: jest.fn()
}));

const { getUserName, getActiveCharacterName } = require('../../../utils/user-utils');

const RumorTestComponent = ({ onContextChange }: { onContextChange: (context: any) => void }) => {
  const rumorContext = useRumors();
  
  React.useEffect(() => {
    onContextChange(rumorContext);
  }, [rumorContext, onContextChange]);
  
  return <div data-testid="rumor-bugs-test">Rumor Bug Tests</div>;
};

describe('RumorContext Bug Discovery Tests', () => {
  let rumorContext: any;
  let mockAddData: jest.Mock;
  let mockUpdateData: jest.Mock;
  let mockDeleteData: jest.Mock;
  let mockSetDocument: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    rumorContext = null;

    // Setup user utilities to return expected values
    getUserName.mockReturnValue('Test User');
    getActiveCharacterName.mockReturnValue('Test Character');

    mockAddData = jest.fn();
    mockUpdateData = jest.fn();
    mockDeleteData = jest.fn();
    mockSetDocument = jest.fn();

    // Setup authenticated state for bug testing
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user' },
    });

    mockUseUser.mockReturnValue({
      userProfile: { name: 'Test User' },
      activeGroupUserProfile: { 
        name: 'Test User',
        activeCharacterName: 'Test Character'
      },
    });

    mockUseFirestore.mockReturnValue({
      setDocument: mockSetDocument,
    });

    mockUseRumorData.mockReturnValue({
      rumors: [],
      loading: false,
      error: null,
      refreshRumors: jest.fn(),
    });

    mockUseFirebaseData.mockReturnValue({
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: mockDeleteData,
    });
  });

  const renderRumorContext = () => {
    const handleContextChange = (context: any) => {
      rumorContext = context;
    };

    return render(
      <RumorProvider>
        <RumorTestComponent onContextChange={handleContextChange} />
      </RumorProvider>
    );
  };

  describe('Bug #011: Rumor User Attribution Metadata Issues', () => {
    test('BUG: should include proper user attribution in rumor creation', async () => {
      mockAddData.mockResolvedValue(undefined);
      renderRumorContext();

      await waitFor(() => {
        expect(rumorContext).toBeDefined();
      });

      const rumorData: Omit<Rumor, 'id'> = {
        title: 'Test Rumor for Attribution',
        content: 'A test rumor to check user attribution',
        status: 'unconfirmed' as RumorStatus,
        sourceType: 'tavern' as SourceType,
        sourceName: 'Test Tavern',
        relatedNPCs: [],
        relatedLocations: [],
        notes: [],
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await rumorContext.addRumor(rumorData);
      });

      // BUG DISCOVERY: This test will FAIL until getUserName and getActiveCharacterName utilities are fixed
      // EXPECTED: Proper user attribution metadata should be included
      // ACTUAL: getUserName returns "" and getActiveCharacterName returns null
      expect(mockAddData).toHaveBeenCalledWith(
        expect.objectContaining({
          createdByUsername: 'Test User',        // BUG: Currently receives ""
          createdByCharacterName: 'Test Character', // BUG: Currently receives null
          modifiedByUsername: 'Test User',       // BUG: Currently receives ""
          modifiedByCharacterName: 'Test Character' // BUG: Currently receives null
        }),
        'test-rumor-for-attribution'
      );

      console.warn('BUG #011: User attribution utilities getUserName/getActiveCharacterName return empty/null values');
    });

    test('BUG: should include proper user attribution in rumor updates', async () => {
      const mockRumors = [
        {
          id: 'test-rumor',
          title: 'Test Rumor',
          content: 'A test rumor',
          status: 'unconfirmed' as RumorStatus,
          sourceType: 'tavern' as SourceType,
          sourceName: 'Test Tavern',
          relatedNPCs: [],
          relatedLocations: [],
          notes: [],
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      mockUseRumorData.mockReturnValue({
        rumors: mockRumors,
        loading: false,
        error: null,
        refreshRumors: jest.fn(),
      });

      mockUpdateData.mockResolvedValue(undefined);
      renderRumorContext();

      await waitFor(() => {
        expect(rumorContext).toBeDefined();
      });

      await act(async () => {
        await rumorContext.updateRumor({
          ...mockRumors[0],
          content: 'Updated content'
        });
      });

      // BUG DISCOVERY: This test will FAIL until attribution utilities are fixed
      expect(mockUpdateData).toHaveBeenCalledWith(
        'test-rumor',
        expect.objectContaining({
          modifiedByUsername: 'Test User',       // BUG: Currently receives ""
          modifiedByCharacterName: 'Test Character' // BUG: Currently receives null
        })
      );
    });

    test('BUG: should include proper user attribution in note creation', async () => {
      const mockRumors = [
        {
          id: 'test-rumor',
          title: 'Test Rumor',
          content: 'A test rumor',
          status: 'unconfirmed' as RumorStatus,
          sourceType: 'tavern' as SourceType,
          sourceName: 'Test Tavern',
          relatedNPCs: [],
          relatedLocations: [],
          notes: [],
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      mockUseRumorData.mockReturnValue({
        rumors: mockRumors,
        loading: false,
        error: null,
        refreshRumors: jest.fn(),
      });

      mockUpdateData.mockResolvedValue(undefined);
      renderRumorContext();

      await waitFor(() => {
        expect(rumorContext).toBeDefined();
      });

      const note: RumorNote = {
        id: 'note-1',
        content: 'Test note content',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await rumorContext.updateRumorNote('test-rumor', note);
      });

      // BUG DISCOVERY: This test will FAIL until attribution utilities are fixed
      expect(mockUpdateData).toHaveBeenCalledWith(
        'test-rumor',
        expect.objectContaining({
          notes: [
            expect.objectContaining({
              createdByUsername: 'Test User',        // BUG: Currently receives ""
              createdByCharacterName: 'Test Character' // BUG: Currently receives null
            })
          ],
          modifiedByUsername: 'Test User',       // BUG: Currently receives ""
          modifiedByCharacterName: 'Test Character' // BUG: Currently receives null
        })
      );
    });
  });

  describe('Bug #012: Rumor ID Generation Collision Risk', () => {
    test('BUG: should generate unique IDs for case-variant rumor titles', async () => {
      mockAddData.mockResolvedValue(undefined);
      renderRumorContext();

      await waitFor(() => {
        expect(rumorContext).toBeDefined();
      });

      const rumor1 = { 
        title: 'Dragon Sighting',
        content: 'A dragon was seen',
        status: 'unconfirmed' as RumorStatus,
        sourceType: 'npc' as SourceType,
        sourceName: 'Witness',
        relatedNPCs: [],
        relatedLocations: [],
        notes: [],
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      const rumor2 = { 
        title: 'DRAGON SIGHTING',
        content: 'Another dragon report',
        status: 'unconfirmed' as RumorStatus,
        sourceType: 'traveler' as SourceType,
        sourceName: 'Merchant',
        relatedNPCs: [],
        relatedLocations: [],
        notes: [],
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await rumorContext.addRumor(rumor1);
        await rumorContext.addRumor(rumor2);
      });

      // BUG DISCOVERY: This test will FAIL until ID generation algorithm is fixed
      // EXPECTED: Different IDs for different rumor titles
      // ACTUAL: Both generate "dragon-sighting" ID, causing collision
      const [firstCall, secondCall] = mockAddData.mock.calls;
      expect(firstCall[1]).toBe('dragon-sighting');
      expect(secondCall[1]).not.toBe('dragon-sighting'); // BUG: Currently fails - both IDs are identical

      // Document the collision for tracking
      if (firstCall[1] === secondCall[1]) {
        console.warn(`BUG #012: ID collision detected - "${firstCall[1]}" === "${secondCall[1]}"`);
      }
    });

    test('BUG: should generate unique IDs for punctuation-variant rumor titles', async () => {
      mockAddData.mockResolvedValue(undefined);
      renderRumorContext();

      await waitFor(() => {
        expect(rumorContext).toBeDefined();
      });

      const rumor1 = { 
        title: "Wizard's Tower",
        content: 'A mysterious tower',
        status: 'unconfirmed' as RumorStatus,
        sourceType: 'tavern' as SourceType,
        sourceName: 'Tavern Talk',
        relatedNPCs: [],
        relatedLocations: [],
        notes: [],
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      const rumor2 = { 
        title: "Wizards Tower",
        content: 'The same tower without apostrophe',
        status: 'unconfirmed' as RumorStatus,
        sourceType: 'npc' as SourceType,
        sourceName: 'Local Guide',
        relatedNPCs: [],
        relatedLocations: [],
        notes: [],
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await rumorContext.addRumor(rumor1);
        await rumorContext.addRumor(rumor2);
      });

      // BUG DISCOVERY: Different titles with punctuation should generate different IDs
      const [firstCall, secondCall] = mockAddData.mock.calls;
      expect(firstCall[1]).not.toBe(secondCall[1]); // These should be different

      // Both should be valid but unique
      expect(firstCall[1]).toMatch(/wizard.*tower/);
      expect(secondCall[1]).toMatch(/wizard.*tower/);
      expect(firstCall[1]).not.toBe(secondCall[1]);
    });
  });

  describe('Bug #013: Rumor Combine Function Complex Logic Issues', () => {
    test('BUG: should handle duplicate NPC/location relationships correctly', async () => {
      const mockRumors = [
        {
          id: 'rumor-1',
          title: 'Dragon Report A',
          content: 'Dragon seen in mountains',
          status: 'unconfirmed' as RumorStatus,
          sourceType: 'npc' as SourceType,
          sourceName: 'Guide A',
          relatedNPCs: ['npc-1', 'npc-2'],
          relatedLocations: ['mountain-1'],
          notes: [],
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'rumor-2',
          title: 'Dragon Report B',
          content: 'Similar dragon sighting',
          status: 'unconfirmed' as RumorStatus,
          sourceType: 'traveler' as SourceType,
          sourceName: 'Merchant B',
          relatedNPCs: ['npc-2', 'npc-3'],  // npc-2 is duplicate
          relatedLocations: ['mountain-1', 'mountain-2'], // mountain-1 is duplicate
          notes: [],
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      mockUseRumorData.mockReturnValue({
        rumors: mockRumors,
        loading: false,
        error: null,
        refreshRumors: jest.fn(),
      });

      mockAddData.mockResolvedValue(undefined);
      mockUpdateData.mockResolvedValue(undefined);
      renderRumorContext();

      await waitFor(() => {
        expect(rumorContext).toBeDefined();
      });

      await act(async () => {
        await rumorContext.combineRumors(['rumor-1', 'rumor-2'], {
          title: 'Combined Dragon Reports'
        });
      });

      // BUG DISCOVERY: Combined rumor should deduplicate related entities correctly
      expect(mockAddData).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedNPCs: ['npc-1', 'npc-2', 'npc-3'], // Should be deduplicated
          relatedLocations: ['mountain-1', 'mountain-2'] // Should be deduplicated
        }),
        'combined-dragon-reports'
      );

      console.warn('BUG #013: Checking if combine function properly deduplicates relationships');
    });

    test('BUG: should handle missing arrays in rumor data gracefully', async () => {
      const mockRumors = [
        {
          id: 'rumor-with-undefined-arrays',
          title: 'Incomplete Rumor',
          content: 'A rumor with missing array fields',
          status: 'unconfirmed' as RumorStatus,
          sourceType: 'other' as SourceType,
          sourceName: 'Unknown',
          // Missing relatedNPCs and relatedLocations arrays
          notes: [],
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        } as any  // Cast to any to allow missing fields
      ];

      mockUseRumorData.mockReturnValue({
        rumors: mockRumors,
        loading: false,
        error: null,
        refreshRumors: jest.fn(),
      });

      mockAddData.mockResolvedValue(undefined);
      mockUpdateData.mockResolvedValue(undefined);
      renderRumorContext();

      await waitFor(() => {
        expect(rumorContext).toBeDefined();
      });

      // BUG DISCOVERY: Should handle undefined arrays gracefully
      await act(async () => {
        const result = await rumorContext.combineRumors(['rumor-with-undefined-arrays'], {
          title: 'Safe Combined Rumor'
        });
        expect(result).toBe('safe-combined-rumor');
      });

      // Should not crash and should provide default empty arrays
      expect(mockAddData).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedNPCs: [], // Should default to empty array
          relatedLocations: [] // Should default to empty array
        }),
        'safe-combined-rumor'
      );
    });
  });

  describe('Bug #014: Quest Conversion Function Integration Issues', () => {
    test('BUG: should properly integrate with quest creation system', async () => {
      const mockRumors = [
        {
          id: 'rumor-to-convert',
          title: 'Quest Worthy Rumor',
          content: 'This rumor should become a quest',
          status: 'confirmed' as RumorStatus,
          sourceType: 'npc' as SourceType,
          sourceName: 'Quest Giver',
          relatedNPCs: ['quest-giver-1'],
          relatedLocations: ['quest-location'],
          notes: [],
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      mockUseRumorData.mockReturnValue({
        rumors: mockRumors,
        loading: false,
        error: null,
        refreshRumors: jest.fn(),
      });

      mockSetDocument.mockResolvedValue(undefined);
      mockUpdateData.mockResolvedValue(undefined);
      renderRumorContext();

      await waitFor(() => {
        expect(rumorContext).toBeDefined();
      });

      const questData = {
        title: 'Investigate Dragon Rumors',
        description: 'Look into the dragon sightings',
        status: 'active'
      };

      await act(async () => {
        const questId = await rumorContext.convertToQuest(['rumor-to-convert'], questData);
        expect(questId).toBe('investigate-dragon-rumors');
      });

      // BUG DISCOVERY: Quest creation should include proper attribution metadata
      expect(mockSetDocument).toHaveBeenCalledWith(
        'quests',
        'investigate-dragon-rumors',
        expect.objectContaining({
          title: 'Investigate Dragon Rumors',
          description: 'Look into the dragon sightings',
          status: 'active',
          createdBy: 'test-user',
          createdByUsername: 'Test User',        // BUG: May receive ""
          createdByCharacterName: 'Test Character', // BUG: May receive null
          dateAdded: expect.any(String)
        })
      );

      // Should update rumor with conversion tracking
      expect(mockUpdateData).toHaveBeenCalledWith(
        'rumor-to-convert',
        expect.objectContaining({
          convertedToQuestId: 'investigate-dragon-rumors',
          notes: expect.arrayContaining([
            expect.objectContaining({
              content: 'Converted to quest: investigate-dragon-rumors'
            })
          ])
        })
      );

      console.warn('BUG #014: Quest conversion may have user attribution issues');
    });

    test('BUG: should handle quest ID generation edge cases', async () => {
      const mockRumors = [
        {
          id: 'special-rumor',
          title: 'Special Characters!@# Rumor',
          content: 'Rumor with special characters',
          status: 'confirmed' as RumorStatus,
          sourceType: 'other' as SourceType,
          sourceName: 'Special Source',
          relatedNPCs: [],
          relatedLocations: [],
          notes: [],
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      mockUseRumorData.mockReturnValue({
        rumors: mockRumors,
        loading: false,
        error: null,
        refreshRumors: jest.fn(),
      });

      mockSetDocument.mockResolvedValue(undefined);
      renderRumorContext();

      await waitFor(() => {
        expect(rumorContext).toBeDefined();
      });

      const questData = {
        title: 'Quest With Special Characters!@#$%',
        description: 'A quest with special characters in title'
      };

      await act(async () => {
        await rumorContext.convertToQuest(['special-rumor'], questData);
      });

      // BUG DISCOVERY: Quest ID generation should handle special characters properly
      expect(mockSetDocument).toHaveBeenCalledWith(
        'quests',
        'quest-with-special-characters', // Should be sanitized ID
        expect.objectContaining({
          id: 'quest-with-special-characters'
        })
      );
    });
  });

  describe('Bug Documentation: Error Boundary Integration', () => {
    test('BUG: useRumors hook error should integrate properly with React error boundaries', () => {
      // This test documents the React error boundary integration issue
      // The hook throws correctly but error boundary integration could be improved
      
      const TestComponent = () => {
        try {
          useRumors();
          return <div>Should not reach here</div>;
        } catch (error) {
          // BUG: Error boundary integration could be improved
          console.warn('BUG: React error boundary integration issue documented');
          throw error; // Re-throw for proper error boundary handling
        }
      };

      // Document the expected behavior vs actual behavior
      expect(() => render(<TestComponent />)).toThrow(
        'useRumors must be used within a RumorProvider'
      );
    });
  });
});

/**
 * Bug Test Summary
 * 
 * These tests are INTENTIONALLY FAILING to serve as:
 * 1. Bug documentation and tracking
 * 2. Regression prevention once bugs are fixed
 * 3. Specification of expected behavior
 * 
 * DO NOT modify these tests to make them pass.
 * Fix the implementation to make the tests pass.
 * 
 * Bugs Tracked:
 * - #011: Rumor User Attribution Metadata Issues (High Priority)
 * - #012: Rumor ID Generation Collision Risk (Medium Priority)  
 * - #013: Rumor Combine Function Complex Logic Issues (Medium Priority)
 * - #014: Quest Conversion Function Integration Issues (Medium Priority)
 * - React Error Boundary Integration (Low Priority)
 */