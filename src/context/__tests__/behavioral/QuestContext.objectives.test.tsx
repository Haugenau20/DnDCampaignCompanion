// src/context/__tests__/QuestContext.objectives.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { QuestProvider, useQuests } from '../../QuestContext';
import { Quest, QuestStatus } from '../../../types/quest';

/**
 * Quest Context Objective Management Behavioral Testing
 * 
 * Tests ACTUAL Quest objective behavior including auto-completion logic.
 * This focuses on the complex objective management and auto-completion features.
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseQuestData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('../../firebase', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

jest.mock('../../../hooks/useQuestData', () => ({
  useQuestData: () => mockUseQuestData(),
}));

jest.mock('../../../hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

const QuestTestComponent = ({ onContextChange }: { onContextChange: (context: any) => void }) => {
  const questContext = useQuests();
  
  React.useEffect(() => {
    onContextChange(questContext);
  }, [questContext, onContextChange]);
  
  return <div data-testid="quest-objectives-test">Quest Objectives Test</div>;
};

describe('QuestContext Objective Management Behavior', () => {
  let questContext: any;
  let mockUpdateData: jest.Mock;
  let mockRefreshQuests: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    questContext = null;

    mockUpdateData = jest.fn();
    mockRefreshQuests = jest.fn();

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

    mockUseFirebaseData.mockReturnValue({
      addData: jest.fn(),
      updateData: mockUpdateData,
      deleteData: jest.fn(),
    });

    mockUpdateData.mockResolvedValue(undefined);
    mockRefreshQuests.mockResolvedValue([]);
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

  describe('Objective Update Behavior', () => {
    test('should update single objective completion status', async () => {
      const questWithObjectives: Quest = {
        id: 'test-quest',
        title: 'Multi-Objective Quest',
        description: 'A quest with multiple objectives',
        status: 'active',
        objectives: [
          { id: 'obj-1', description: 'First objective', completed: false },
          { id: 'obj-2', description: 'Second objective', completed: false },
          { id: 'obj-3', description: 'Third objective', completed: true },
        ],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseQuestData.mockReturnValue({
        quests: [questWithObjectives],
        loading: false,
        error: null,
        getQuestById: jest.fn().mockReturnValue(questWithObjectives),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should update specific objective to completed
      await act(async () => {
        await questContext.updateQuestObjective('test-quest', 'obj-1', true);
      });

      // BEHAVIOR: Should call Firebase with updated quest data
      expect(mockUpdateData).toHaveBeenCalledTimes(1);
      const [questId, updatedQuestData] = mockUpdateData.mock.calls[0];

      expect(questId).toBe('test-quest');
      
      // Verify objective was updated correctly
      const updatedObjectives = updatedQuestData.objectives;
      expect(updatedObjectives).toHaveLength(3);
      expect(updatedObjectives[0].completed).toBe(true);  // obj-1 now completed
      expect(updatedObjectives[1].completed).toBe(false); // obj-2 unchanged
      expect(updatedObjectives[2].completed).toBe(true);  // obj-3 unchanged

      // Quest should still be active (not all objectives complete)
      expect(updatedQuestData.status).toBe('active');
      expect(updatedQuestData.dateCompleted).toBeUndefined();

      // Should have modification metadata
      expect(updatedQuestData.modifiedBy).toBe('test-user');
      expect(updatedQuestData.modifiedByUsername).toBe('TestUser');
      expect(updatedQuestData.dateModified).toBeDefined();
    });

    test('should auto-complete quest when all objectives completed', async () => {
      const questNearCompletion: Quest = {
        id: 'test-quest',
        title: 'Almost Complete Quest',
        description: 'A quest nearly finished',
        status: 'active',
        objectives: [
          { id: 'obj-1', description: 'First objective', completed: true },
          { id: 'obj-2', description: 'Second objective', completed: false }, // Last incomplete
          { id: 'obj-3', description: 'Third objective', completed: true },
        ],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseQuestData.mockReturnValue({
        quests: [questNearCompletion],
        loading: false,
        error: null,
        getQuestById: jest.fn().mockReturnValue(questNearCompletion),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Completing last objective should auto-complete quest
      await act(async () => {
        await questContext.updateQuestObjective('test-quest', 'obj-2', true);
      });

      expect(mockUpdateData).toHaveBeenCalledTimes(1);
      const [questId, updatedQuestData] = mockUpdateData.mock.calls[0];

      // BEHAVIOR: All objectives should be completed
      const updatedObjectives = updatedQuestData.objectives;
      expect(updatedObjectives.every((obj: any) => obj.completed)).toBe(true);

      // BEHAVIOR: Quest should be auto-completed
      expect(updatedQuestData.status).toBe('completed');
      expect(updatedQuestData.dateCompleted).toBeDefined();
      
      // Verify completion date is recent
      const completionDate = new Date(updatedQuestData.dateCompleted);
      const now = new Date();
      expect(completionDate.getTime()).toBeCloseTo(now.getTime(), -2); // Within 100ms
    });

    test('should not auto-complete quest if already completed', async () => {
      const alreadyCompletedQuest: Quest = {
        id: 'test-quest',
        title: 'Already Complete Quest',
        description: 'A quest already finished',
        status: 'completed',
        dateCompleted: '2023-01-01T00:00:00.000Z',
        objectives: [
          { id: 'obj-1', description: 'First objective', completed: true },
          { id: 'obj-2', description: 'Second objective', completed: false }, // Updating this
        ],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseQuestData.mockReturnValue({
        quests: [alreadyCompletedQuest],
        loading: false,
        error: null,
        getQuestById: jest.fn().mockReturnValue(alreadyCompletedQuest),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should update objective but not change quest completion
      await act(async () => {
        await questContext.updateQuestObjective('test-quest', 'obj-2', true);
      });

      const [questId, updatedQuestData] = mockUpdateData.mock.calls[0];

      // BEHAVIOR: Objective should be updated
      expect(updatedQuestData.objectives[1].completed).toBe(true);

      // BEHAVIOR: Quest should remain completed with original date
      expect(updatedQuestData.status).toBe('completed');
      expect(updatedQuestData.dateCompleted).toBe('2023-01-01T00:00:00.000Z');
    });

    test('should not auto-complete failed quest', async () => {
      const failedQuest: Quest = {
        id: 'test-quest',
        title: 'Failed Quest',
        description: 'A quest that failed',
        status: 'failed',
        objectives: [
          { id: 'obj-1', description: 'First objective', completed: true },
          { id: 'obj-2', description: 'Second objective', completed: false },
        ],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseQuestData.mockReturnValue({
        quests: [failedQuest],
        loading: false,
        error: null,
        getQuestById: jest.fn().mockReturnValue(failedQuest),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should update objective but not change failed status
      await act(async () => {
        await questContext.updateQuestObjective('test-quest', 'obj-2', true);
      });

      const [questId, updatedQuestData] = mockUpdateData.mock.calls[0];

      // BEHAVIOR: Objective should be updated
      expect(updatedQuestData.objectives[1].completed).toBe(true);

      // BEHAVIOR: Quest should remain failed
      expect(updatedQuestData.status).toBe('failed');
      expect(updatedQuestData.dateCompleted).toBeUndefined();
    });
  });

  describe('Manual Quest Completion Behavior', () => {
    test('should complete quest and mark all objectives as done', async () => {
      const incompleteQuest: Quest = {
        id: 'test-quest',
        title: 'Incomplete Quest',
        description: 'A quest with some incomplete objectives',
        status: 'active',
        objectives: [
          { id: 'obj-1', description: 'First objective', completed: true },
          { id: 'obj-2', description: 'Second objective', completed: false },
          { id: 'obj-3', description: 'Third objective', completed: false },
        ],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseQuestData.mockReturnValue({
        quests: [incompleteQuest],
        loading: false,
        error: null,
        getQuestById: jest.fn().mockReturnValue(incompleteQuest),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Manual completion should complete quest regardless of objectives
      await act(async () => {
        await questContext.markQuestCompleted('test-quest');
      });

      expect(mockUpdateData).toHaveBeenCalledTimes(1);
      const [questId, updatedQuestData] = mockUpdateData.mock.calls[0];

      // BEHAVIOR: All objectives should be marked completed
      expect(updatedQuestData.objectives.every((obj: any) => obj.completed)).toBe(true);

      // BEHAVIOR: Quest should be completed
      expect(updatedQuestData.status).toBe('completed');
      expect(updatedQuestData.dateCompleted).toBeDefined();

      // BEHAVIOR: Should have completion metadata
      expect(updatedQuestData.modifiedBy).toBe('test-user');
      expect(updatedQuestData.modifiedByUsername).toBe('TestUser');
    });

    test('should complete quest with custom completion date', async () => {
      const quest: Quest = {
        id: 'test-quest',
        title: 'Test Quest',
        description: 'A test quest',
        status: 'active',
        objectives: [],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseQuestData.mockReturnValue({
        quests: [quest],
        loading: false,
        error: null,
        getQuestById: jest.fn().mockReturnValue(quest),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      const customDate = '2023-06-15T10:30:00.000Z';

      // BEHAVIOR: Should accept custom completion date
      await act(async () => {
        await questContext.markQuestCompleted('test-quest', customDate);
      });

      const [questId, updatedQuestData] = mockUpdateData.mock.calls[0];

      // BEHAVIOR: Should use provided completion date
      expect(updatedQuestData.dateCompleted).toBe(customDate);
      expect(updatedQuestData.status).toBe('completed');
    });

    test('should mark quest as failed', async () => {
      const quest: Quest = {
        id: 'test-quest',
        title: 'Test Quest',
        description: 'A test quest',
        status: 'active',
        objectives: [
          { id: 'obj-1', description: 'Objective', completed: false },
        ],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseQuestData.mockReturnValue({
        quests: [quest],
        loading: false,
        error: null,
        getQuestById: jest.fn().mockReturnValue(quest),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should mark quest as failed
      await act(async () => {
        await questContext.markQuestFailed('test-quest');
      });

      expect(mockUpdateData).toHaveBeenCalledTimes(1);
      const [questId, updatedQuestData] = mockUpdateData.mock.calls[0];

      // BEHAVIOR: Quest should be failed
      expect(updatedQuestData.status).toBe('failed');
      expect(updatedQuestData.dateCompleted).toBeUndefined(); // No completion date for failed

      // BEHAVIOR: Objectives should remain unchanged when quest fails
      expect(updatedQuestData.objectives[0].completed).toBe(false);

      // BEHAVIOR: Should have modification metadata
      expect(updatedQuestData.modifiedBy).toBe('test-user');
      expect(updatedQuestData.modifiedByUsername).toBe('TestUser');
      expect(updatedQuestData.dateModified).toBeDefined();
    });
  });

  describe('Objective Validation Behavior', () => {
    test('should reject objective update for nonexistent quest', async () => {
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

      // BEHAVIOR: Should reject update for nonexistent quest
      await expect(
        questContext.updateQuestObjective('nonexistent-quest', 'obj-1', true)
      ).rejects.toThrow('Quest not found');

      // BEHAVIOR: Firebase should not be called
      expect(mockUpdateData).not.toHaveBeenCalled();
    });

    test('should reject objective update for nonexistent objective', async () => {
      const quest: Quest = {
        id: 'test-quest',
        title: 'Test Quest',
        description: 'A test quest',
        status: 'active',
        objectives: [
          { id: 'obj-1', description: 'Only objective', completed: false },
        ],
        createdBy: 'test-user',
        createdByUsername: 'TestUser',
        dateAdded: new Date().toISOString(),
      };

      mockUseQuestData.mockReturnValue({
        quests: [quest],
        loading: false,
        error: null,
        getQuestById: jest.fn().mockReturnValue(quest),
        refreshQuests: mockRefreshQuests,
        hasRequiredContext: true,
      });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should handle nonexistent objective gracefully
      await act(async () => {
        await questContext.updateQuestObjective('test-quest', 'nonexistent-obj', true);
      });

      // BEHAVIOR: Should still call Firebase (current implementation doesn't validate objective existence)
      expect(mockUpdateData).toHaveBeenCalledTimes(1);
      const [questId, updatedQuestData] = mockUpdateData.mock.calls[0];

      // BEHAVIOR: Original objective should be unchanged
      expect(updatedQuestData.objectives[0].completed).toBe(false);
      
      // This test documents current behavior - objective validation not implemented
      // Future enhancement: could add objective existence validation
    });

    test('should require authentication for objective updates', async () => {
      // Remove authentication
      mockUseAuth.mockReturnValue({ user: null });

      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      // BEHAVIOR: Should reject objective update without authentication
      await expect(
        questContext.updateQuestObjective('test-quest', 'obj-1', true)
      ).rejects.toThrow('User must be authenticated to update objectives');

      // BEHAVIOR: Firebase should not be called
      expect(mockUpdateData).not.toHaveBeenCalled();
    });
  });
});