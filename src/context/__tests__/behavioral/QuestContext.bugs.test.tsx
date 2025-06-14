// src/context/__tests__/behavioral/QuestContext.bugs.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { QuestProvider, useQuests } from '../../QuestContext';
import { Quest, QuestStatus } from '../../../types/quest';

/**
 * Quest Context Bug Tests - FAILING TESTS for Known Bugs
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
  
  return <div data-testid="quest-bugs-test">Quest Bugs Test</div>;
};

describe('QuestContext Known Bugs (FAILING TESTS)', () => {
  let questContext: any;
  let mockAddData: jest.Mock;
  let mockUpdateData: jest.Mock;
  let mockRefreshQuests: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    questContext = null;

    mockAddData = jest.fn();
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

    mockUseQuestData.mockReturnValue({
      quests: [],
      loading: false,
      error: null,
      getQuestById: jest.fn().mockReturnValue(undefined),
      refreshQuests: mockRefreshQuests,
      hasRequiredContext: true,
    });

    mockUseFirebaseData.mockReturnValue({
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: jest.fn(),
    });

    mockAddData.mockResolvedValue(undefined);
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

  // BUG #004: ID Generation Should Prevent Collisions
  describe('Bug #004: ID Generation Collision Prevention', () => {
    test('should generate unique IDs for quests with similar titles', async () => {
      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      const questData1 = {
        title: 'Save the Village',
        description: 'Help the villagers',
        status: 'active' as QuestStatus,
        objectives: [],
        connections: {
          relatedNPCs: [],
          relatedLocations: [],
          relatedQuests: []
        }
      };

      const questData2 = {
        title: 'SAVE THE VILLAGE', // Different case, should get different ID
        description: 'Different quest description',
        status: 'active' as QuestStatus,
        objectives: [],
        connections: {
          relatedNPCs: [],
          relatedLocations: [],
          relatedQuests: []
        }
      };

      await act(async () => {
        await questContext.addQuest(questData1);
        await questContext.addQuest(questData2);
      });

      const [firstQuestData] = mockAddData.mock.calls[0];
      const [secondQuestData] = mockAddData.mock.calls[1];

      // EXPECTED BEHAVIOR: IDs should be unique
      // CURRENT BUG: Both generate 'save-the-village'
      expect(firstQuestData.id).not.toBe(secondQuestData.id);
    });

    test('should generate unique IDs for quests with punctuation differences', async () => {
      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      const questData1 = {
        title: 'Find the Treasure!',
        description: 'Locate the hidden treasure',
        status: 'active' as QuestStatus,
        objectives: [],
        connections: {
          relatedNPCs: [],
          relatedLocations: [],
          relatedQuests: []
        }
      };

      const questData2 = {
        title: 'Find the Treasure!!!',
        description: 'Different treasure quest',
        status: 'active' as QuestStatus,
        objectives: [],
        connections: {
          relatedNPCs: [],
          relatedLocations: [],
          relatedQuests: []
        }
      };

      await act(async () => {
        await questContext.addQuest(questData1);
        await questContext.addQuest(questData2);
      });

      const [firstQuestData] = mockAddData.mock.calls[0];
      const [secondQuestData] = mockAddData.mock.calls[1];

      // EXPECTED BEHAVIOR: IDs should be unique
      // CURRENT BUG: Both generate 'find-the-treasure'
      expect(firstQuestData.id).not.toBe(secondQuestData.id);
    });

    test('should generate unique IDs for quests with whitespace differences', async () => {
      renderQuestContext();

      await waitFor(() => {
        expect(questContext).toBeDefined();
      });

      const questData1 = {
        title: 'Rescue the Princess',
        description: 'Save the captured princess',
        status: 'active' as QuestStatus,
        objectives: [],
        connections: {
          relatedNPCs: [],
          relatedLocations: [],
          relatedQuests: []
        }
      };

      const questData2 = {
        title: '  Rescue   the   Princess  ', // Extra whitespace
        description: 'Different rescue quest',
        status: 'active' as QuestStatus,
        objectives: [],
        connections: {
          relatedNPCs: [],
          relatedLocations: [],
          relatedQuests: []
        }
      };

      await act(async () => {
        await questContext.addQuest(questData1);
        await questContext.addQuest(questData2);
      });

      const [firstQuestData] = mockAddData.mock.calls[0];
      const [secondQuestData] = mockAddData.mock.calls[1];

      // EXPECTED BEHAVIOR: IDs should be unique
      // CURRENT BUG: Both generate 'rescue-the-princess'
      expect(firstQuestData.id).not.toBe(secondQuestData.id);
    });
  });
});

/**
 * HOW TO USE THESE TESTS:
 * 
 * 1. Run tests: npm test -- QuestContext.bugs.test.tsx
 * 2. See failing tests (this is EXPECTED - they represent bugs)
 * 3. Fix bugs in QuestContext.tsx implementation
 * 4. Run tests again - they should PASS when bugs are fixed
 * 5. Remove .failing() from test names when bugs are resolved
 * 
 * CURRENT STATUS: All tests in this file should FAIL until bugs are fixed
 */