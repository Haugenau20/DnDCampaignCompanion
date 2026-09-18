// src/features/campaign-entities/quests/context/__tests__/QuestContext.objective-authoring.test.tsx
//
// The three objective writes `15-5` adds -- add, reword, reorder -- and the one
// it takes away: ticking the last box no longer concludes the quest.
//
// Objectives are the spine of a quest (§2.2). They were also the one part of it
// that could be *ticked* but never *authored* anywhere except the edit form:
// `updateQuestObjective` had existed, with its own suite, since long before any
// component called it.

import React from 'react';
import { render, act } from '@testing-library/react';
import { QuestProvider, useQuests } from '../QuestContext';
import { Quest } from '../../types';

const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseQuestData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

jest.mock('../../hooks/useQuestData', () => ({
  useQuestData: () => mockUseQuestData(),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

const QUEST: Quest = {
  id: 'reclaim-erebor',
  title: 'Reclaim Erebor',
  description: 'Take back the mountain.',
  status: 'active',
  objectives: [
    { id: 'obj-1', description: 'Find the secret door', completed: true },
    { id: 'obj-2', description: 'Enter the mountain undetected', completed: false },
    { id: 'obj-3', description: "Scout the dragon's hoard", completed: false },
  ],
  createdBy: 'user-1',
  createdByUsername: 'TestUser',
  dateAdded: '2025-05-31T00:00:00.000Z',
};

const Probe = ({ onContext }: { onContext: (context: any) => void }) => {
  const context = useQuests();
  React.useEffect(() => onContext(context), [context, onContext]);
  return null;
};

describe('QuestContext — authoring objectives', () => {
  let context: any;
  let updateData: jest.Mock;

  const renderWith = (quest: Quest = QUEST) => {
    mockUseQuestData.mockReturnValue({
      quests: [quest],
      loading: false,
      error: null,
      getQuestById: jest.fn().mockReturnValue(quest),
      refreshQuests: jest.fn().mockResolvedValue([]),
      hasRequiredContext: true,
    });

    render(
      <QuestProvider>
        <Probe onContext={(value) => { context = value; }} />
      </QuestProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    context = null;
    updateData = jest.fn().mockResolvedValue(undefined);

    mockUseAuth.mockReturnValue({ user: { uid: 'user-1' } });
    mockUseUser.mockReturnValue({ userProfile: {}, activeGroupUserProfile: {} });
    mockUseGroups.mockReturnValue({ activeGroupId: 'group-1' });
    mockUseCampaigns.mockReturnValue({ activeCampaignId: 'campaign-1' });
    mockUseFirebaseData.mockReturnValue({
      addData: jest.fn(),
      updateData,
      deleteData: jest.fn(),
    });
  });

  /** The objectives the last write sent. */
  const writtenObjectives = () =>
    updateData.mock.calls[updateData.mock.calls.length - 1][1].objectives;

  describe('addQuestObjective', () => {
    it('appends to the end of the list, unticked', async () => {
      renderWith();
      await act(async () => {
        await context.addQuestObjective('reclaim-erebor', 'Recover the Arkenstone');
      });

      const objectives = writtenObjectives();
      expect(objectives).toHaveLength(4);
      expect(objectives[3]).toMatchObject({
        description: 'Recover the Arkenstone',
        completed: false,
      });
      // The order is the party's plan: nothing already on the list moved.
      expect(objectives.slice(0, 3).map((o: any) => o.id)).toEqual(['obj-1', 'obj-2', 'obj-3']);
    });

    it('gives the new objective an id of its own', async () => {
      renderWith();
      await act(async () => {
        await context.addQuestObjective('reclaim-erebor', 'Recover the Arkenstone');
      });

      const objectives = writtenObjectives();
      const ids = objectives.map((o: any) => o.id);
      expect(objectives[3].id).toBeTruthy();
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('refuses an objective with nothing in it, and writes nothing', async () => {
      renderWith();
      await act(async () => {
        await expect(
          context.addQuestObjective('reclaim-erebor', '   ')
        ).rejects.toThrow('An objective needs something to say.');
      });
      expect(updateData).not.toHaveBeenCalled();
    });

    it('trims what it is given', async () => {
      renderWith();
      await act(async () => {
        await context.addQuestObjective('reclaim-erebor', '  Recover the Arkenstone  ');
      });
      expect(writtenObjectives()[3].description).toBe('Recover the Arkenstone');
    });
  });

  describe('editQuestObjective', () => {
    it('rewords one objective, keeping whether it is ticked and where it sits', async () => {
      renderWith();
      await act(async () => {
        await context.editQuestObjective(
          'reclaim-erebor',
          'obj-1',
          'Find the secret door mentioned in the map'
        );
      });

      const objectives = writtenObjectives();
      expect(objectives[0]).toMatchObject({
        id: 'obj-1',
        description: 'Find the secret door mentioned in the map',
        completed: true,
      });
      expect(objectives.map((o: any) => o.id)).toEqual(['obj-1', 'obj-2', 'obj-3']);
    });

    it('refuses to empty an objective', async () => {
      renderWith();
      await act(async () => {
        await expect(
          context.editQuestObjective('reclaim-erebor', 'obj-1', '')
        ).rejects.toThrow('An objective needs something to say.');
      });
      expect(updateData).not.toHaveBeenCalled();
    });
  });

  describe('moveQuestObjective', () => {
    it('swaps an objective with the one above it', async () => {
      renderWith();
      await act(async () => {
        await context.moveQuestObjective('reclaim-erebor', 'obj-2', 'up');
      });
      expect(writtenObjectives().map((o: any) => o.id)).toEqual(['obj-2', 'obj-1', 'obj-3']);
    });

    it('swaps an objective with the one below it', async () => {
      renderWith();
      await act(async () => {
        await context.moveQuestObjective('reclaim-erebor', 'obj-2', 'down');
      });
      expect(writtenObjectives().map((o: any) => o.id)).toEqual(['obj-1', 'obj-3', 'obj-2']);
    });

    it('writes nothing at all at the ends of the list', async () => {
      // Not "writes the list back unchanged": a no-op write still stamps
      // `dateModified` and credits a modification nobody made (§8).
      renderWith();
      await act(async () => {
        await context.moveQuestObjective('reclaim-erebor', 'obj-1', 'up');
        await context.moveQuestObjective('reclaim-erebor', 'obj-3', 'down');
      });
      expect(updateData).not.toHaveBeenCalled();
    });

    it('writes nothing for an objective that is not on this quest', async () => {
      renderWith();
      await act(async () => {
        await context.moveQuestObjective('reclaim-erebor', 'obj-missing', 'up');
      });
      expect(updateData).not.toHaveBeenCalled();
    });
  });

  describe('the guard every objective write shares', () => {
    it('refuses when nobody is signed in', async () => {
      mockUseAuth.mockReturnValue({ user: null });
      renderWith();
      await act(async () => {
        await expect(
          context.addQuestObjective('reclaim-erebor', 'Something')
        ).rejects.toThrow('User must be authenticated to update objectives');
      });
      expect(updateData).not.toHaveBeenCalled();
    });

    it('refuses when the quest does not exist', async () => {
      mockUseQuestData.mockReturnValue({
        quests: [],
        loading: false,
        error: null,
        getQuestById: jest.fn().mockReturnValue(undefined),
        refreshQuests: jest.fn().mockResolvedValue([]),
        hasRequiredContext: true,
      });
      render(
        <QuestProvider>
          <Probe onContext={(value) => { context = value; }} />
        </QuestProvider>
      );

      await act(async () => {
        await expect(
          context.editQuestObjective('nope', 'obj-1', 'Something')
        ).rejects.toThrow('Quest not found');
      });
      expect(updateData).not.toHaveBeenCalled();
    });
  });

  describe('what ticking the last objective does not do', () => {
    it('leaves the quest active, and leaves markQuestCompleted as the one way to conclude it', async () => {
      const nearlyDone: Quest = {
        ...QUEST,
        objectives: [
          { id: 'obj-1', description: 'Find the secret door', completed: true },
          { id: 'obj-2', description: 'Enter the mountain undetected', completed: false },
        ],
      };
      renderWith(nearlyDone);

      await act(async () => {
        await context.updateQuestObjective('reclaim-erebor', 'obj-2', true);
      });

      const written = updateData.mock.calls[0][1];
      expect(written.objectives.every((o: any) => o.completed)).toBe(true);
      expect(written.status).toBe('active');
      expect(written.dateCompleted).toBeUndefined();

      // ...and the deliberate act still does conclude it.
      await act(async () => {
        await context.markQuestCompleted('reclaim-erebor');
      });
      const concluded = updateData.mock.calls[1][1];
      expect(concluded.status).toBe('completed');
      expect(concluded.dateCompleted).toBeTruthy();
    });
  });
});
