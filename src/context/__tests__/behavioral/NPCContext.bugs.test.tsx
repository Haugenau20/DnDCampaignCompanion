// src/context/__tests__/behavioral/NPCContext.bugs.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { NPCProvider, useNPCs } from '../../NPCContext';
import { NPC, NPCStatus, NPCRelationship } from '../../../types/npc';

/**
 * NPC Context Bug Tests - FAILING TESTS for Known Bugs
 * 
 * These tests define EXPECTED behavior for known bugs.
 * They will FAIL until the bugs are fixed in the implementation.
 * When a bug is fixed, the corresponding test should PASS.
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseNPCData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('../../firebase', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

jest.mock('../../../hooks/useNPCData', () => ({
  useNPCData: () => mockUseNPCData(),
}));

jest.mock('../../../hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

const NPCTestComponent = ({ onContextChange }: { onContextChange: (context: any) => void }) => {
  const npcContext = useNPCs();
  
  React.useEffect(() => {
    onContextChange(npcContext);
  }, [npcContext, onContextChange]);
  
  return <div data-testid="npc-bugs-test">NPC Bugs Test</div>;
};

describe('NPCContext Known Bugs (FAILING TESTS)', () => {
  let npcContext: any;
  let mockAddData: jest.Mock;
  let mockUpdateData: jest.Mock;
  let mockRefreshNPCs: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    npcContext = null;

    mockAddData = jest.fn();
    mockUpdateData = jest.fn();
    mockRefreshNPCs = jest.fn();

    // Setup authenticated context
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user' },
    });

    mockUseUser.mockReturnValue({
      userProfile: { uid: 'test-user' },
      activeGroupUserProfile: { uid: 'test-user', username: 'TestUser' },
    });

    mockUseGroups.mockReturnValue({
      activeGroupId: 'test-group',
    });

    mockUseCampaigns.mockReturnValue({
      activeCampaignId: 'test-campaign',
    });

    mockUseNPCData.mockReturnValue({
      npcs: [],
      loading: false,
      error: null,
      getNPCById: jest.fn().mockReturnValue(undefined),
      refreshNPCs: mockRefreshNPCs,
      hasRequiredContext: true,
    });

    mockUseFirebaseData.mockReturnValue({
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: jest.fn(),
    });

    mockAddData.mockResolvedValue(undefined);
    mockUpdateData.mockResolvedValue(undefined);
    mockRefreshNPCs.mockResolvedValue([]);
  });

  const renderNPCContext = () => {
    const handleContextChange = (context: any) => {
      npcContext = context;
    };

    return render(
      <NPCProvider>
        <NPCTestComponent onContextChange={handleContextChange} />
      </NPCProvider>
    );
  };

  // BUG #002: ID Generation Should Prevent Collisions
  describe('Bug #002: ID Generation Collision Prevention', () => {
    test('should generate unique IDs for NPCs with similar names', async () => {
      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const npcData1 = {
        name: 'Thorin Oakenshield',
        description: 'Dwarf warrior',
        status: 'alive' as NPCStatus,
        relationship: 'ally' as NPCRelationship,
        connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
        notes: []
      };

      const npcData2 = {
        name: 'THORIN OAKENSHIELD', // Different case, should get different ID
        description: 'Different dwarf',
        status: 'alive' as NPCStatus,
        relationship: 'ally' as NPCRelationship,
        connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
        notes: []
      };

      await act(async () => {
        await npcContext.addNPC(npcData1);
        await npcContext.addNPC(npcData2);
      });

      const [firstNPCData] = mockAddData.mock.calls[0];
      const [secondNPCData] = mockAddData.mock.calls[1];

      // EXPECTED BEHAVIOR: IDs should be unique
      // CURRENT BUG: Both generate 'thorin-oakenshield'
      expect(firstNPCData.id).not.toBe(secondNPCData.id);
    });

    test('should generate unique IDs for NPCs with punctuation differences', async () => {
      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const npcData1 = {
        name: 'Save the Village!',
        description: 'Important quest',
        status: 'alive' as NPCStatus,
        relationship: 'ally' as NPCRelationship,
        connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
        notes: []
      };

      const npcData2 = {
        name: 'Save the Village!!!',
        description: 'Different quest',
        status: 'alive' as NPCStatus,
        relationship: 'ally' as NPCRelationship,
        connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
        notes: []
      };

      await act(async () => {
        await npcContext.addNPC(npcData1);
        await npcContext.addNPC(npcData2);
      });

      const [firstNPCData] = mockAddData.mock.calls[0];
      const [secondNPCData] = mockAddData.mock.calls[1];

      // EXPECTED BEHAVIOR: IDs should be unique
      // CURRENT BUG: Both generate 'save-the-village'
      expect(firstNPCData.id).not.toBe(secondNPCData.id);
    });
  });

  // BUG #006: Update Operations Should Validate Existence
  describe('Bug #006: Missing Entity Existence Validation', () => {
    test('should reject updates to nonexistent NPCs', async () => {
      // Mock that NPC doesn't exist
      mockUseNPCData.mockReturnValue({
        npcs: [],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(undefined), // NPC not found
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const nonExistentNPC = {
        id: 'nonexistent-npc',
        name: 'Updated Name',
        description: 'Updated description',
        status: 'alive' as NPCStatus,
        relationship: 'ally' as NPCRelationship,
        connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
        notes: []
      };

      // EXPECTED BEHAVIOR: Should throw error for nonexistent NPC
      // CURRENT BUG: Resolves successfully without validation
      await expect(npcContext.updateNPC(nonExistentNPC)).rejects.toThrow(
        'NPC not found'
      );
    });

    test('should reject note updates to nonexistent NPCs', async () => {
      // Mock that NPC doesn't exist
      mockUseNPCData.mockReturnValue({
        npcs: [],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(undefined), // NPC not found
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const noteData = {
        date: '2023-06-15',
        text: 'Note for nonexistent NPC'
      };

      // EXPECTED BEHAVIOR: Should throw error for nonexistent NPC
      // CURRENT BUG: Returns undefined without throwing
      await expect(
        npcContext.updateNPCNote('nonexistent-npc', noteData)
      ).rejects.toThrow('NPC not found');
    });

    test('should reject relationship updates to nonexistent NPCs', async () => {
      // Mock that NPC doesn't exist
      mockUseNPCData.mockReturnValue({
        npcs: [],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(undefined), // NPC not found
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // EXPECTED BEHAVIOR: Should throw error for nonexistent NPC
      // CURRENT BUG: Returns undefined without throwing
      await expect(
        npcContext.updateNPCRelationship('nonexistent-npc', 'ally')
      ).rejects.toThrow('NPC not found');
    });
  });
});

/**
 * HOW TO USE THESE TESTS:
 * 
 * 1. Run tests: npm test -- NPCContext.bugs.test.tsx
 * 2. See failing tests (this is EXPECTED - they represent bugs)
 * 3. Fix bugs in NPCContext.tsx implementation
 * 4. Run tests again - they should PASS when bugs are fixed
 * 5. Remove .failing() from test names when bugs are resolved
 * 
 * CURRENT STATUS: All tests in this file should FAIL until bugs are fixed
 */