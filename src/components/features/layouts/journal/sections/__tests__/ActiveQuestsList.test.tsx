// src/components/features/layouts/journal/sections/__tests__/ActiveQuestsList.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ActiveQuestsList from '../ActiveQuestsList';
import { Quest } from '../../../../../../types/quest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../../../../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation } = require('../../../../../../context/NavigationContext');
const mockNavigateToPage = jest.fn();

function setupMocks() {
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------
const BASE_QUEST: Quest = {
  id: 'quest-1',
  title: 'Find the Artifact',
  description: 'Retrieve the ancient artifact',
  status: 'active',
  objectives: [],
  createdBy: 'user-1',
  createdByUsername: 'user1',
  dateAdded: '2024-01-01',
};

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    ...BASE_QUEST,
    id: `quest-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActiveQuestsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Section heading
  // -------------------------------------------------------------------------
  describe('section heading', () => {
    it('renders the "Active Quests" heading', () => {
      render(<ActiveQuestsList quests={[]} loading={false} />);
      expect(screen.getByText(/Active Quests/)).toBeInTheDocument();
    });

    it('shows the count of active quests (not all quests)', () => {
      const quests = [
        makeQuest({ status: 'active' }),
        makeQuest({ status: 'active' }),
        makeQuest({ status: 'completed' }), // should be excluded
      ];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      // Only 2 active quests
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    });

    it('shows loading indicator in heading when loading=true', () => {
      render(<ActiveQuestsList quests={[]} loading={true} />);
      expect(screen.getByText(/\(\.\.\.\)/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('does not render quest items while loading', () => {
      const quests = [makeQuest({ title: 'Secret Quest' })];
      render(<ActiveQuestsList quests={quests} loading={true} />);
      expect(screen.queryByText('Secret Quest')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state (no active quests)
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    it('shows "No active quests" when the quests list is empty', () => {
      render(<ActiveQuestsList quests={[]} loading={false} />);
      expect(screen.getByText('No active quests')).toBeInTheDocument();
    });

    it('shows empty state when all quests are completed or failed (none active)', () => {
      const quests = [
        makeQuest({ status: 'completed' }),
        makeQuest({ status: 'failed' }),
      ];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      expect(screen.getByText('No active quests')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Filtering to active quests only
  // -------------------------------------------------------------------------
  describe('quest filtering', () => {
    it('renders only active quests, not completed ones', () => {
      const quests = [
        makeQuest({ title: 'Active Quest', status: 'active' }),
        makeQuest({ title: 'Completed Quest', status: 'completed' }),
      ];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      expect(screen.getByText('Active Quest')).toBeInTheDocument();
      expect(screen.queryByText('Completed Quest')).not.toBeInTheDocument();
    });

    it('renders only active quests, not failed ones', () => {
      const quests = [
        makeQuest({ title: 'Active Quest', status: 'active' }),
        makeQuest({ title: 'Failed Quest', status: 'failed' }),
      ];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      expect(screen.getByText('Active Quest')).toBeInTheDocument();
      expect(screen.queryByText('Failed Quest')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Quest item content
  // -------------------------------------------------------------------------
  describe('quest item content', () => {
    it('renders the quest title', () => {
      const quests = [makeQuest({ title: 'Slay the Dragon', status: 'active' })];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      expect(screen.getByText('Slay the Dragon')).toBeInTheDocument();
    });

    it('renders the quest description when provided', () => {
      const quests = [
        makeQuest({ title: 'Quest A', description: 'A heroic journey', status: 'active' }),
      ];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      expect(screen.getByText('A heroic journey')).toBeInTheDocument();
    });

    it('does not render a description paragraph when description is empty', () => {
      const quests = [makeQuest({ title: 'Quest A', description: '', status: 'active' })];
      const { container } = render(<ActiveQuestsList quests={quests} loading={false} />);
      // The description is rendered in a <p class="...journal-quest-note"> element.
      // When description is falsy the conditional branch is skipped.
      const noteEl = container.querySelector('.journal-quest-note');
      expect(noteEl).not.toBeInTheDocument();
    });

    it('renders the quest location when provided', () => {
      const quests = [makeQuest({ title: 'Quest A', location: 'Thornvale', status: 'active' })];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      expect(screen.getByText(/Thornvale/)).toBeInTheDocument();
    });

    it('does not render location section when location is absent', () => {
      const quests = [makeQuest({ title: 'Quest A', location: undefined, status: 'active' })];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      expect(screen.queryByText(/Location:/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Objectives completion percentage
  // -------------------------------------------------------------------------
  describe('objectives completion', () => {
    it('shows completion percentage when objectives are present', () => {
      const quests = [
        makeQuest({
          title: 'Quest A',
          status: 'active',
          objectives: [
            { id: 'o1', description: 'Step 1', completed: true },
            { id: 'o2', description: 'Step 2', completed: false },
          ],
        }),
      ];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      // 1/2 = 50%
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows 0% when no objectives are completed', () => {
      const quests = [
        makeQuest({
          title: 'Quest A',
          status: 'active',
          objectives: [
            { id: 'o1', description: 'Step 1', completed: false },
            { id: 'o2', description: 'Step 2', completed: false },
          ],
        }),
      ];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('shows 100% when all objectives are completed', () => {
      const quests = [
        makeQuest({
          title: 'Quest A',
          status: 'active',
          objectives: [
            { id: 'o1', description: 'Step 1', completed: true },
            { id: 'o2', description: 'Step 2', completed: true },
          ],
        }),
      ];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('does not render completion indicator when objectives list is empty', () => {
      const quests = [makeQuest({ title: 'Quest A', status: 'active', objectives: [] })];
      render(<ActiveQuestsList quests={quests} loading={false} />);
      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Click navigation
  // -------------------------------------------------------------------------
  describe('quest click navigation', () => {
    it('calls navigateToPage with the highlight URL when a quest item is clicked', () => {
      const quest = makeQuest({ id: 'quest-xyz', title: 'Legendary Quest', status: 'active' });
      render(<ActiveQuestsList quests={[quest]} loading={false} />);

      const questItem = screen.getByText('Legendary Quest').closest('li');
      expect(questItem).not.toBeNull();
      fireEvent.click(questItem!);

      expect(mockNavigateToPage).toHaveBeenCalledTimes(1);
      expect(mockNavigateToPage).toHaveBeenCalledWith('/quests?highlight=quest-xyz');
    });

    it('navigates with the correct quest id for each individual item', () => {
      const quest1 = makeQuest({ id: 'q1', title: 'Quest One', status: 'active' });
      const quest2 = makeQuest({ id: 'q2', title: 'Quest Two', status: 'active' });
      render(<ActiveQuestsList quests={[quest1, quest2]} loading={false} />);

      const item2 = screen.getByText('Quest Two').closest('li');
      fireEvent.click(item2!);

      expect(mockNavigateToPage).toHaveBeenCalledWith('/quests?highlight=q2');
    });
  });
});
