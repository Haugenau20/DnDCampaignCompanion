// src/context/__tests__/QuestContext.behavioral.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { QuestProvider, useQuests } from '../../QuestContext';
import { Quest, QuestStatus } from '../../../types/quest';

/**
 * Quest Context Behavioral Testing
 * 
 * Tests ACTUAL Quest context behavior with mocked Firebase dependencies.
 * This tests the real Quest context logic (black box) while mocking external dependencies.
 * 
 * STRATEGY:
 * - Use real QuestProvider and useQuests hook
 * - Mock Firebase dependencies (useAuth, useFirebaseData, etc.)
 * - Test actual Quest context behavior and logic
 * - Verify correct data is passed to Firebase (without testing Firebase itself)
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseQuestData = jest.fn();
const mockUseFirebaseData = jest.fn();

// Mock the Firebase context hooks
jest.mock('../../firebase', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

// Mock the data hooks
jest.mock('../../../hooks/useQuestData', () => ({
  useQuestData: () => mockUseQuestData(),
}));

jest.mock('../../../hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

// Test component that uses the Quest context
const QuestTestComponent = ({ onContextChange }: { onContextChange: (context: any) => void }) => {
  const questContext = useQuests();
  
  React.useEffect(() => {
    onContextChange(questContext);
  }, [questContext, onContextChange]);
  
  return <div data-testid="quest-test">Quest Context Test</div>;
};

describe('QuestContext Behavioral Testing', () => {
  let questContext: any;
  let mockAddData: jest.Mock;
  let mockUpdateData: jest.Mock;
  let mockDeleteData: jest.Mock;
  let mockRefreshQuests: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    questContext = null;

    // Create mock Firebase operations
    mockAddData = jest.fn();
    mockUpdateData = jest.fn();
    mockDeleteData = jest.fn();
    mockRefreshQuests = jest.fn();

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

    mockUseQuestData.mockReturnValue({
      quests: [],
      loading: false,
      error: null,
      getQuestById: jest.fn().mockReturnValue(undefined),
      refreshQuests: mockRefreshQuests,
      hasRequiredContext: false,
    });

    mockUseFirebaseData.mockReturnValue({
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: mockDeleteData,
    });
  });

  const renderQuestContext = () => {
    const handleContextChange = (context: any) => {
      questContext = context;
    };

    return render(
      <QuestProvider>
        <QuestTestComponent onContextChange={handleContextChange} />
      </QuestProvider>
    );
  };

  describe('Quest Context Initialization Behavior', () => {
    test('should provide empty quest list when no data loaded', async () => {
      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Quest context should start with empty list
      expect(questContext.quests).toEqual([]);
      expect(questContext.error).toBeNull();
      expect(questContext.isLoading).toBe(false);
      expect(questContext.loading).toBe(false);
    });

    test('should provide all required Quest operations', async () => {
      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: All Quest operations should be available as functions
      const requiredOperations = [
        'addQuest', 'updateQuest', 'deleteQuest', 'getQuestById',
        'getQuestsByStatus', 'getQuestsByLocation', 'getQuestsByNPC',
        'updateQuestStatus', 'updateQuestObjective', 'markQuestCompleted',
        'markQuestFailed', 'refreshQuests'
      ];

      requiredOperations.forEach(operation => {
        expect(typeof questContext[operation]).toBe('function');
      });
    });

    test('should reflect loading state from useQuestData', async () => {
      // Mock loading state
      mockUseQuestData.mockReturnValue({
        quests: [],
        loading: true,
        error: null,
        getQuestById: jest.fn(),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: false,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Loading state should be reflected correctly
      expect(questContext.isLoading).toBe(true);
      expect(questContext.loading).toBe(true);
    });
  });

  describe('Quest Authentication Behavior', () => {
    test('should reject quest creation when user not authenticated', async () => {
      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      const questData = {
        title: 'Test Quest',
        description: 'A test quest',
        status: 'active' as QuestStatus,
        objectives: []
      };

      // BEHAVIOR: Should throw authentication error for unauthenticated user
      await expect(questContext.addQuest(questData)).rejects.toThrow(
        'User must be authenticated to add quests'
      );

      // BEHAVIOR: Firebase should not be called when authentication fails
      expect(mockAddData).not.toHaveBeenCalled();
    });

    test('should reject quest creation when no group context', async () => {
      // Mock authenticated user but no group context
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
      });

      mockUseUser.mockReturnValue({
        userProfile: { uid: 'test-user' },
        activeGroupUserProfile: { uid: 'test-user' },
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      const questData = {
        title: 'Test Quest',
        description: 'A test quest',
        status: 'active' as QuestStatus,
        objectives: []
      };

      // BEHAVIOR: Should throw group context error
      await expect(questContext.addQuest(questData)).rejects.toThrow(
        'Group and campaign context must be set to add quests'
      );

      // BEHAVIOR: Firebase should not be called when context validation fails
      expect(mockAddData).not.toHaveBeenCalled();
    });

    test('should allow quest creation with full authentication context', async () => {
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
      mockRefreshQuests.mockResolvedValue([]);

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      const questData = {
        title: 'Test Quest',
        description: 'A test quest',
        status: 'active' as QuestStatus,
        objectives: []
      };

      // BEHAVIOR: Should succeed with proper authentication
      await act(async () => {
        const result = await questContext.addQuest(questData);
        expect(typeof result).toBe('string'); // Should return quest ID
      });

      // BEHAVIOR: Should call Firebase with correctly formatted quest data
      expect(mockAddData).toHaveBeenCalledTimes(1);
      const [questDataSent, questId] = mockAddData.mock.calls[0];

      // Verify correct data sent to Firebase
      expect(questDataSent).toMatchObject({
        title: 'Test Quest',
        description: 'A test quest',
        status: 'active',
        objectives: [],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
      });

      expect(questDataSent.id).toBe(questId); // ID should match
      expect(questDataSent.dateAdded).toBeDefined();
      expect(Array.isArray(questDataSent.objectives)).toBe(true);

      // BEHAVIOR: Should refresh quests after creation
      expect(mockRefreshQuests).toHaveBeenCalledTimes(1);
    });
  });

  describe('Quest ID Generation Behavior', () => {
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
      mockRefreshQuests.mockResolvedValue([]);
    });

    test('should generate predictable IDs from quest titles', async () => {
      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      const questData = {
        title: 'Save the Village',
        description: 'A heroic quest',
        status: 'active' as QuestStatus,
        objectives: []
      };

      await act(async () => {
        await questContext.addQuest(questData);
      });

      // BEHAVIOR: Should generate consistent ID from title
      const [questDataSent] = mockAddData.mock.calls[0];
      expect(questDataSent.id).toBe('save-the-village');
    });

    test('should reveal ID collision behavior with similar titles', async () => {
      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIORAL TEST: What happens with titles that generate same ID?
      const questData1 = {
        title: 'Save the Village',
        description: 'First quest',
        status: 'active' as QuestStatus,
        objectives: []
      };

      const questData2 = {
        title: 'SAVE THE VILLAGE', // Different case, same generated ID
        description: 'Second quest',
        status: 'active' as QuestStatus,
        objectives: []
      };

      await act(async () => {
        await questContext.addQuest(questData1);
        await questContext.addQuest(questData2);
      });

      // BEHAVIOR: Both quests should be sent to Firebase
      expect(mockAddData).toHaveBeenCalledTimes(2);

      const [firstQuestData] = mockAddData.mock.calls[0];
      const [secondQuestData] = mockAddData.mock.calls[1];

      // DISCOVERY: This reveals if the ID generation creates collisions
      expect(firstQuestData.id).toBe('save-the-village');
      expect(secondQuestData.id).toBe('save-the-village'); // Same ID - collision!

      // This test documents the current behavior (collision exists)
      // In future, when bug is fixed, this test should fail and be updated
      console.warn('ID collision detected:', firstQuestData.id, '===', secondQuestData.id);
    });
  });

  describe('Quest Retrieval Behavior', () => {
    test('should return undefined for nonexistent quest', async () => {
      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should return undefined for missing quest
      const result = questContext.getQuestById('nonexistent-quest');
      expect(result).toBeUndefined();
    });

    test('should filter quests by status correctly', async () => {
      // Mock quest data
      const mockQuests = [
        { id: '1', status: 'active', title: 'Active Quest' },
        { id: '2', status: 'completed', title: 'Completed Quest' },
        { id: '3', status: 'active', title: 'Another Active Quest' },
      ];

      mockUseQuestData.mockReturnValue({
        quests: mockQuests,
        loading: false,
        error: null,
        getQuestById: jest.fn(),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should filter by status correctly
      const activeQuests = questContext.getQuestsByStatus('active');
      const completedQuests = questContext.getQuestsByStatus('completed');
      const failedQuests = questContext.getQuestsByStatus('failed');

      expect(activeQuests).toHaveLength(2);
      expect(completedQuests).toHaveLength(1);
      expect(failedQuests).toHaveLength(0);

      expect(activeQuests[0].status).toBe('active');
      expect(activeQuests[1].status).toBe('active');
      expect(completedQuests[0].status).toBe('completed');
    });
  });

  describe('Quest Relationship Filtering Behavior', () => {
    test('should filter quests by NPC correctly', async () => {
      // Mock quest data with NPC relationships
      const mockQuests = [
        {
          id: '1',
          title: 'Quest with NPC ID',
          relatedNPCIds: ['npc-123', 'npc-456'],
          importantNPCs: []
        },
        {
          id: '2',
          title: 'Quest with NPC name',
          relatedNPCIds: [],
          importantNPCs: [{ name: 'npc-123', description: 'Important NPC' }]
        },
        {
          id: '3',
          title: 'Quest without NPC',
          relatedNPCIds: ['other-npc'],
          importantNPCs: []
        },
      ];

      mockUseQuestData.mockReturnValue({
        quests: mockQuests,
        loading: false,
        error: null,
        getQuestById: jest.fn(),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should find quests by NPC ID and NPC name
      const npcQuests = questContext.getQuestsByNPC('npc-123');

      expect(npcQuests).toHaveLength(2); // Should find both ID and name matches
      expect(npcQuests[0].id).toBe('1');
      expect(npcQuests[1].id).toBe('2');
    });

    test('should filter quests by location correctly', async () => {
      // Mock quest data with location relationships
      const mockQuests = [
        {
          id: '1',
          title: 'Quest with location ID',
          location: 'dungeon-123',
          keyLocations: []
        },
        {
          id: '2',
          title: 'Quest with key location',
          location: 'other-location',
          keyLocations: [{ name: 'dungeon-123', description: 'Dark dungeon' }]
        },
        {
          id: '3',
          title: 'Quest elsewhere',
          location: 'different-location',
          keyLocations: []
        },
      ];

      mockUseQuestData.mockReturnValue({
        quests: mockQuests,
        loading: false,
        error: null,
        getQuestById: jest.fn(),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should find quests by location ID and key location name
      const locationQuests = questContext.getQuestsByLocation('dungeon-123');

      expect(locationQuests).toHaveLength(2); // Should find both direct and key location matches
      expect(locationQuests[0].id).toBe('1');
      expect(locationQuests[1].id).toBe('2');
    });
  });

  describe('Quest Update Behavior', () => {
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
      mockRefreshQuests.mockResolvedValue([]);
    });

    test('should reject updates to nonexistent quest', async () => {
      // Mock getQuestById to return undefined
      mockUseQuestData.mockReturnValue({
        quests: [],
        loading: false,
        error: null,
        getQuestById: jest.fn().mockReturnValue(undefined),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should reject status update for nonexistent quest
      await expect(
        questContext.updateQuestStatus('nonexistent-quest', 'completed')
      ).rejects.toThrow('Quest not found');

      // BEHAVIOR: Firebase should not be called
      expect(mockUpdateData).not.toHaveBeenCalled();
    });

    test('should update quest status with proper metadata', async () => {
      const existingQuest = {
        id: 'test-quest',
        title: 'Test Quest',
        status: 'active',
        objectives: []
      };

      mockUseQuestData.mockReturnValue({
        quests: [existingQuest],
        loading: false,
        error: null,
        getQuestById: jest.fn().mockReturnValue(existingQuest),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should update quest status successfully
      await act(async () => {
        await questContext.updateQuestStatus('test-quest', 'completed');
      });

      // BEHAVIOR: Should call Firebase with updated quest data
      expect(mockUpdateData).toHaveBeenCalledTimes(1);
      const [questId, updatedQuestData] = mockUpdateData.mock.calls[0];

      expect(questId).toBe('test-quest');
      expect(updatedQuestData.status).toBe('completed');
      expect(updatedQuestData.dateCompleted).toBeDefined(); // Should set completion date
      expect(updatedQuestData.modifiedBy).toBe('test-user');
      expect(updatedQuestData.modifiedByUsername).toBe('TestUser');
      expect(updatedQuestData.dateModified).toBeDefined();

      // BEHAVIOR: Should refresh quests after update
      expect(mockRefreshQuests).toHaveBeenCalledTimes(1);
    });
  });

  describe('Quest Deletion Behavior', () => {
    beforeEach(() => {
      // Setup auth for delete operations
      mockUseAuth.mockReturnValue({ user: { uid: 'test-user' } });
      mockUseGroups.mockReturnValue({ activeGroupId: 'test-group' });
      mockUseCampaigns.mockReturnValue({ activeCampaignId: 'test-campaign' });
      mockDeleteData.mockResolvedValue(undefined);
      mockRefreshQuests.mockResolvedValue([]);
    });

    test('should delete quest and refresh data', async () => {
      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should delete quest successfully
      await act(async () => {
        await questContext.deleteQuest('test-quest');
      });

      // BEHAVIOR: Should call Firebase delete with quest ID
      expect(mockDeleteData).toHaveBeenCalledWith('test-quest');

      // BEHAVIOR: Should refresh quests after deletion
      expect(mockRefreshQuests).toHaveBeenCalledTimes(1);
    });

    test('should reject deletion without authentication', async () => {
      // Remove authentication
      mockUseAuth.mockReturnValue({ user: null });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should reject deletion for unauthenticated user
      await expect(questContext.deleteQuest('test-quest')).rejects.toThrow(
        'User must be authenticated to delete quests'
      );

      // BEHAVIOR: Firebase should not be called
      expect(mockDeleteData).not.toHaveBeenCalled();
    });
  });
});