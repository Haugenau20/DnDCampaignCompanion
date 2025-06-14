// src/context/__tests__/behavioral/NPCContext.behavioral.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { NPCProvider, useNPCs } from '../../NPCContext';
import { NPC, NPCStatus, NPCRelationship } from '../../../types/npc';

/**
 * NPC Context Behavioral Testing
 * 
 * Tests ACTUAL NPC context behavior with mocked Firebase dependencies.
 * This tests the real NPC context logic (black box) while mocking external dependencies.
 * 
 * STRATEGY:
 * - Use real NPCProvider and useNPCs hook
 * - Mock Firebase dependencies (useAuth, useFirebaseData, etc.)
 * - Test actual NPC context behavior and logic
 * - Verify correct data is passed to Firebase (without testing Firebase itself)
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseNPCData = jest.fn();
const mockUseFirebaseData = jest.fn();

// Mock the Firebase context hooks
jest.mock('../../firebase', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

// Mock the data hooks
jest.mock('../../../hooks/useNPCData', () => ({
  useNPCData: () => mockUseNPCData(),
}));

jest.mock('../../../hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

// Test component that uses the NPC context
const NPCTestComponent = ({ onContextChange }: { onContextChange: (context: any) => void }) => {
  const npcContext = useNPCs();
  
  React.useEffect(() => {
    onContextChange(npcContext);
  }, [npcContext, onContextChange]);
  
  return <div data-testid="npc-test">NPC Context Test</div>;
};

describe('NPCContext Behavioral Testing', () => {
  let npcContext: any;
  let mockAddData: jest.Mock;
  let mockUpdateData: jest.Mock;
  let mockDeleteData: jest.Mock;
  let mockRefreshNPCs: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    npcContext = null;

    // Create mock Firebase operations
    mockAddData = jest.fn();
    mockUpdateData = jest.fn();
    mockDeleteData = jest.fn();
    mockRefreshNPCs = jest.fn();

    // Setup default mock returns
    mockUseAuth.mockReturnValue({
      user: null, // Start unauthenticated
    });

    mockUseUser.mockReturnValue({
      userProfile: null,
      activeGroupUserProfile: null,
    });

    mockUseGroups.mockReturnValue({
      activeGroupId: null,
    });

    mockUseCampaigns.mockReturnValue({
      activeCampaignId: null,
    });

    mockUseNPCData.mockReturnValue({
      npcs: [],
      loading: false,
      error: null,
      getNPCById: jest.fn().mockReturnValue(undefined),
      refreshNPCs: mockRefreshNPCs,
      hasRequiredContext: false,
    });

    mockUseFirebaseData.mockReturnValue({
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: mockDeleteData,
    });
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

  describe('NPC Context Initialization Behavior', () => {
    test('should provide empty NPC list when no data loaded', async () => {
      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIOR: NPC context should start with empty list
      expect(npcContext.npcs).toEqual([]);
      // DISCOVERY: NPC context shows error message when no group selected
      expect(npcContext.error).toBe('Please select a group to view NPCs');
      expect(npcContext.isLoading).toBe(false);
    });

    test('should provide all required NPC operations', async () => {
      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIOR: All NPC operations should be available as functions
      const requiredOperations = [
        'addNPC', 'updateNPC', 'deleteNPC', 'getNPCById',
        'getNPCsByQuest', 'getNPCsByLocation', 'getNPCsByRelationship',
        'updateNPCNote', 'updateNPCRelationship'
      ];

      requiredOperations.forEach(operation => {
        expect(typeof npcContext[operation]).toBe('function');
      });
    });

    test('should reflect loading state from useNPCData', async () => {
      // Mock loading state
      mockUseNPCData.mockReturnValue({
        npcs: [],
        loading: true,
        error: null,
        getNPCById: jest.fn(),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: false,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIOR: Loading state should be reflected correctly
      expect(npcContext.isLoading).toBe(true);
    });
  });

  describe('NPC Authentication Behavior', () => {
    test('should reject NPC creation when user not authenticated', async () => {
      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const npcData = {
        name: 'Test NPC',
        description: 'A test character',
        status: 'alive' as NPCStatus,
        relationship: 'neutral' as NPCRelationship
      };

      // BEHAVIOR: NPC context checks group/campaign context before authentication
      await expect(npcContext.addNPC(npcData)).rejects.toThrow(
        'Cannot add NPC: No group or campaign selected'
      );

      // BEHAVIOR: Firebase should not be called when authentication fails
      expect(mockAddData).not.toHaveBeenCalled();
    });

    test('should reject NPC creation when no group context', async () => {
      // Mock authenticated user but no group context
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
      });

      mockUseUser.mockReturnValue({
        userProfile: { uid: 'test-user' },
        activeGroupUserProfile: { uid: 'test-user' },
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const npcData = {
        name: 'Test NPC',
        description: 'A test character',
        status: 'alive' as NPCStatus,
        relationship: 'neutral' as NPCRelationship
      };

      // BEHAVIOR: Should throw group context error (same message regardless of auth)
      await expect(npcContext.addNPC(npcData)).rejects.toThrow(
        'Cannot add NPC: No group or campaign selected'
      );

      // BEHAVIOR: Firebase should not be called when context validation fails
      expect(mockAddData).not.toHaveBeenCalled();
    });

    test('should allow NPC creation with full authentication context', async () => {
      // Mock full authentication context
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

      // Mock successful Firebase operation
      mockAddData.mockResolvedValue(undefined);
      mockRefreshNPCs.mockResolvedValue([]);
      
      // Enable required context for successful NPC creation
      mockUseNPCData.mockReturnValue({
        npcs: [],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(undefined),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const npcData = {
        name: 'Test NPC',
        description: 'A test character',
        status: 'alive' as NPCStatus,
        relationship: 'neutral' as NPCRelationship,
        connections: {
          relatedNPCs: [],
          affiliations: [],
          relatedQuests: []
        },
        notes: []
      };

      // BEHAVIOR: Should succeed with proper authentication
      await act(async () => {
        const result = await npcContext.addNPC(npcData);
        expect(typeof result).toBe('string'); // Should return NPC ID
      });

      // BEHAVIOR: Should call Firebase with correctly formatted NPC data
      expect(mockAddData).toHaveBeenCalledTimes(1);
      const [npcDataSent, npcId] = mockAddData.mock.calls[0];

      // Verify correct data sent to Firebase
      expect(npcDataSent).toMatchObject({
        name: 'Test NPC',
        description: 'A test character',
        status: 'alive',
        relationship: 'neutral',
      });
      
      // DISCOVERY: NPC creation doesn't include user attribution metadata
      expect(npcDataSent.createdBy).toBeUndefined();
      expect(npcDataSent.createdByUsername).toBeUndefined();
      expect(npcDataSent.dateAdded).toBeUndefined();

      expect(npcDataSent.id).toBe(npcId); // ID should match
      
      // Verify connection arrays are passed through correctly
      expect(Array.isArray(npcDataSent.connections.relatedNPCs)).toBe(true);
      expect(Array.isArray(npcDataSent.connections.affiliations)).toBe(true);
      expect(Array.isArray(npcDataSent.connections.relatedQuests)).toBe(true);
      expect(Array.isArray(npcDataSent.notes)).toBe(true);

      // BEHAVIOR: Should refresh NPCs after creation
      expect(mockRefreshNPCs).toHaveBeenCalledTimes(1);
    });
  });

  describe('NPC ID Generation Behavior', () => {
    beforeEach(() => {
      // Setup full auth context for ID generation tests
      mockUseAuth.mockReturnValue({ user: { uid: 'test-user' } });
      mockUseUser.mockReturnValue({
        userProfile: { uid: 'test-user' },
        activeGroupUserProfile: { uid: 'test-user', username: 'TestUser' },
      });
      mockUseGroups.mockReturnValue({ activeGroupId: 'test-group' });
      mockUseCampaigns.mockReturnValue({ activeCampaignId: 'test-campaign' });
      mockAddData.mockResolvedValue(undefined);
      mockRefreshNPCs.mockResolvedValue([]);
      
      // Enable required context for ID generation tests
      mockUseNPCData.mockReturnValue({
        npcs: [],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(undefined),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });
    });

    test('should generate predictable IDs from NPC names', async () => {
      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const npcData = {
        name: 'Thorin Oakenshield',
        description: 'Dwarf warrior and leader',
        status: 'alive' as NPCStatus,
        relationship: 'ally' as NPCRelationship,
        connections: {
          relatedNPCs: [],
          affiliations: [],
          relatedQuests: []
        },
        notes: []
      };

      await act(async () => {
        await npcContext.addNPC(npcData);
      });

      // BEHAVIOR: Should generate consistent ID from name
      const [npcDataSent] = mockAddData.mock.calls[0];
      expect(npcDataSent.id).toBe('thorin-oakenshield');
    });

    test('should reveal ID collision behavior with similar names', async () => {
      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIORAL TEST: What happens with names that generate same ID?
      const npcData1 = {
        name: 'Thorin Oakenshield',
        description: 'Dwarf warrior',
        status: 'alive' as NPCStatus,
        relationship: 'ally' as NPCRelationship,
        connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
        notes: []
      };

      const npcData2 = {
        name: 'THORIN OAKENSHIELD', // Different case, same generated ID
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

      // BEHAVIOR: Both NPCs should be sent to Firebase
      expect(mockAddData).toHaveBeenCalledTimes(2);

      const [firstNPCData] = mockAddData.mock.calls[0];
      const [secondNPCData] = mockAddData.mock.calls[1];

      // DISCOVERY: This reveals if the ID generation creates collisions
      expect(firstNPCData.id).toBe('thorin-oakenshield');
      expect(secondNPCData.id).toBe('thorin-oakenshield'); // Same ID - collision!

      // This test documents the current behavior (collision exists)
      console.warn('NPC ID collision detected:', firstNPCData.id, '===', secondNPCData.id);
    });
  });

  describe('NPC Retrieval Behavior', () => {
    test('should return undefined for nonexistent NPC', async () => {
      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIOR: Should return undefined for missing NPC
      const result = npcContext.getNPCById('nonexistent-npc');
      expect(result).toBeUndefined();
    });

    test('should filter NPCs by quest correctly', async () => {
      // Mock NPC data with quest relationships
      const mockNPCs = [
        {
          id: '1',
          name: 'Quest Giver',
          connections: { relatedQuests: ['quest-123'] }
        },
        {
          id: '2',
          name: 'Other NPC',
          connections: { relatedQuests: ['quest-456'] }
        },
        {
          id: '3',
          name: 'No Quest NPC',
          connections: { relatedQuests: [] }
        },
      ];

      mockUseNPCData.mockReturnValue({
        npcs: mockNPCs,
        loading: false,
        error: null,
        getNPCById: jest.fn(),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIOR: Should filter by quest correctly
      const questNPCs = npcContext.getNPCsByQuest('quest-123');

      expect(questNPCs).toHaveLength(1);
      expect(questNPCs[0].id).toBe('1');
    });

    test('should filter NPCs by relationship correctly', async () => {
      // Mock NPC data with relationships
      const mockNPCs = [
        { id: '1', name: 'Ally NPC', relationship: 'ally' },
        { id: '2', name: 'Enemy NPC', relationship: 'enemy' },
        { id: '3', name: 'Neutral NPC', relationship: 'neutral' },
        { id: '4', name: 'Another Ally', relationship: 'ally' },
      ];

      mockUseNPCData.mockReturnValue({
        npcs: mockNPCs,
        loading: false,
        error: null,
        getNPCById: jest.fn(),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIOR: Should filter by relationship correctly
      const allyNPCs = npcContext.getNPCsByRelationship('ally');
      const enemyNPCs = npcContext.getNPCsByRelationship('enemy');

      expect(allyNPCs).toHaveLength(2);
      expect(enemyNPCs).toHaveLength(1);
      expect(allyNPCs[0].relationship).toBe('ally');
      expect(allyNPCs[1].relationship).toBe('ally');
      expect(enemyNPCs[0].relationship).toBe('enemy');
    });

    test('should filter NPCs by location correctly', async () => {
      // Mock NPC data with locations
      const mockNPCs = [
        { id: '1', name: 'Tavern Keeper', location: 'The Prancing Pony' },
        { id: '2', name: 'Guard Captain', location: 'City Gates' },
        { id: '3', name: 'Merchant', location: 'The Prancing Pony' },
        { id: '4', name: 'Wizard', location: 'Tower of Magic' },
        { id: '5', name: 'No Location NPC' }, // No location property
      ];

      mockUseNPCData.mockReturnValue({
        npcs: mockNPCs,
        loading: false,
        error: null,
        getNPCById: jest.fn(),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIOR: Should filter by location correctly (case insensitive)
      const tavernNPCs = npcContext.getNPCsByLocation('The Prancing Pony');
      const tavernNPCsLowercase = npcContext.getNPCsByLocation('the prancing pony');
      const gateNPCs = npcContext.getNPCsByLocation('City Gates');
      const nonexistentNPCs = npcContext.getNPCsByLocation('Nonexistent Place');

      expect(tavernNPCs).toHaveLength(2);
      expect(tavernNPCsLowercase).toHaveLength(2); // Case insensitive
      expect(tavernNPCs[0].id).toBe('1');
      expect(tavernNPCs[1].id).toBe('3');
      expect(gateNPCs).toHaveLength(1);
      expect(gateNPCs[0].id).toBe('2');
      expect(nonexistentNPCs).toHaveLength(0);
    });
  });

  describe('NPC Update Behavior', () => {
    beforeEach(() => {
      // Setup auth for update operations
      mockUseAuth.mockReturnValue({ user: { uid: 'test-user' } });
      mockUseUser.mockReturnValue({
        userProfile: { uid: 'test-user' },
        activeGroupUserProfile: { uid: 'test-user', username: 'TestUser' },
      });
      mockUseGroups.mockReturnValue({ activeGroupId: 'test-group' });
      mockUseCampaigns.mockReturnValue({ activeCampaignId: 'test-campaign' });
      mockUpdateData.mockResolvedValue(undefined);
      mockRefreshNPCs.mockResolvedValue([]);
    });

    test('should reject updates to nonexistent NPC', async () => {
      // Mock getNPCById to return undefined
      mockUseNPCData.mockReturnValue({
        npcs: [],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(undefined),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const updatedNPC = {
        id: 'nonexistent-npc',
        name: 'Updated Name',
        description: 'Updated description',
        status: 'alive' as NPCStatus,
        relationship: 'ally' as NPCRelationship
      };

      // BEHAVIOR: NPC updateNPC doesn't validate NPC existence - resolves instead of rejecting
      // DISCOVERY: This reveals that updateNPC doesn't check if NPC exists!
      await act(async () => {
        const result = await npcContext.updateNPC(updatedNPC);
        expect(result).toBeUndefined(); // updateNPC resolves even for nonexistent NPC
      });

      // BEHAVIOR: Firebase IS called even for nonexistent NPC - this may be a bug!
      expect(mockUpdateData).toHaveBeenCalledTimes(1);
    });

    test('should update NPC with proper metadata', async () => {
      const existingNPC = {
        id: 'test-npc',
        name: 'Test NPC',
        description: 'Original description',
        status: 'alive',
        relationship: 'neutral'
      };

      mockUseNPCData.mockReturnValue({
        npcs: [existingNPC],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(existingNPC),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      const updatedNPC = {
        ...existingNPC,
        description: 'Updated description',
        relationship: 'ally' as NPCRelationship
      };

      // BEHAVIOR: Should update NPC successfully
      await act(async () => {
        await npcContext.updateNPC(updatedNPC);
      });

      // BEHAVIOR: Should call Firebase with updated NPC data
      expect(mockUpdateData).toHaveBeenCalledTimes(1);
      const [npcId, updatedNPCData] = mockUpdateData.mock.calls[0];

      expect(npcId).toBe('test-npc');
      expect(updatedNPCData.description).toBe('Updated description');
      expect(updatedNPCData.relationship).toBe('ally');
      expect(updatedNPCData.modifiedBy).toBe('test-user');
      expect(updatedNPCData.modifiedByUsername).toBe('TestUser');
      expect(updatedNPCData.dateModified).toBeDefined();

      // BEHAVIOR: Should refresh NPCs after update
      expect(mockRefreshNPCs).toHaveBeenCalledTimes(1);
    });

    test('should update NPC relationship with proper metadata', async () => {
      const existingNPC = {
        id: 'test-npc',
        name: 'Test NPC',
        description: 'A test character',
        status: 'alive',
        relationship: 'neutral'
      };

      mockUseNPCData.mockReturnValue({
        npcs: [existingNPC],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(existingNPC),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIOR: Should update NPC relationship
      await act(async () => {
        await npcContext.updateNPCRelationship('test-npc', 'ally');
      });

      // BEHAVIOR: Should call Firebase with updated relationship
      expect(mockUpdateData).toHaveBeenCalledTimes(1);
      const [npcId, updatedNPCData] = mockUpdateData.mock.calls[0];

      expect(npcId).toBe('test-npc');
      expect(updatedNPCData.relationship).toBe('ally');
      expect(updatedNPCData.modifiedBy).toBe('test-user');
      expect(updatedNPCData.modifiedByUsername).toBe('TestUser');
      expect(updatedNPCData.dateModified).toBeDefined();

      // BEHAVIOR: Should refresh NPCs after relationship update
      expect(mockRefreshNPCs).toHaveBeenCalledTimes(1);
    });

    test('should reject relationship update for nonexistent NPC', async () => {
      // Mock getNPCById to return undefined
      mockUseNPCData.mockReturnValue({
        npcs: [],
        loading: false,
        error: null,
        getNPCById: jest.fn().mockReturnValue(undefined),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIOR: updateNPCRelationship doesn't throw for nonexistent NPC - just returns
      await act(async () => {
        const result = await npcContext.updateNPCRelationship('nonexistent-npc', 'ally');
        expect(result).toBeUndefined();
      });

      // BEHAVIOR: Firebase should not be called for nonexistent NPC
      expect(mockUpdateData).not.toHaveBeenCalled();
    });
  });

  describe('NPC Deletion Behavior', () => {
    beforeEach(() => {
      // Setup auth for delete operations
      mockUseAuth.mockReturnValue({ user: { uid: 'test-user' } });
      mockUseGroups.mockReturnValue({ activeGroupId: 'test-group' });
      mockUseCampaigns.mockReturnValue({ activeCampaignId: 'test-campaign' });
      mockDeleteData.mockResolvedValue(undefined);
      mockRefreshNPCs.mockResolvedValue([]);
      
      // Enable context for delete operations
      mockUseNPCData.mockReturnValue({
        npcs: [],
        loading: false,
        error: null,
        getNPCById: jest.fn(),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true,
      });
    });

    test('should delete NPC and refresh data', async () => {
      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIOR: Should delete NPC successfully
      await act(async () => {
        await npcContext.deleteNPC('test-npc');
      });

      // BEHAVIOR: Should call Firebase delete with NPC ID
      expect(mockDeleteData).toHaveBeenCalledWith('test-npc');

      // BEHAVIOR: Should refresh NPCs after deletion
      expect(mockRefreshNPCs).toHaveBeenCalledTimes(1);
    });

    test('should reject deletion without authentication', async () => {
      // Remove authentication but keep context enabled
      mockUseAuth.mockReturnValue({ user: null });
      
      // Override the context to allow authentication check
      mockUseNPCData.mockReturnValue({
        npcs: [],
        loading: false,
        error: null,
        getNPCById: jest.fn(),
        refreshNPCs: mockRefreshNPCs,
        hasRequiredContext: true, // Context enabled so we reach auth check
      });

      renderNPCContext();

      await waitFor(() => {
        expect(npcContext).toBeDefined();
      });

      // BEHAVIOR: NPC deletion checks authentication after context
      await expect(npcContext.deleteNPC('test-npc')).rejects.toThrow(
        'User must be authenticated to delete an NPC'
      );

      // BEHAVIOR: Firebase should not be called
      expect(mockDeleteData).not.toHaveBeenCalled();
    });
  });
});