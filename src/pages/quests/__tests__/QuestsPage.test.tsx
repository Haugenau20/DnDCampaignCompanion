// src/pages/quests/__tests__/QuestsPage.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestsPage from '../QuestsPage';

// ---------------------------------------------------------------------------
// Since the roster moved out of this page and into QuestDirectory, the page's
// job is exactly what the other three entity pages' is: the header, the create
// action, the context guards and the loading/error branches. The directory is
// mocked here the same way NPCDirectory/RumorDirectory/LocationDirectory are in
// their pages' suites — the roster's own behaviour is covered by
// features/campaign-entities/quests/components/__tests__/QuestDirectory.test.tsx.
// ---------------------------------------------------------------------------

let mockUser: { uid: string } | null = { uid: 'user-1' };
let mockActiveGroupId: string | null = 'group-1';
let mockActiveCampaignId: string | null = 'campaign-1';

jest.mock('features/user-management', () => ({
  useAuth: () => ({ user: mockUser }),
  useGroups: () => ({ activeGroupId: mockActiveGroupId }),
  useCampaigns: () => ({ activeCampaignId: mockActiveCampaignId }),
}));

interface QuestContextMock {
  quests: unknown[];
  loading: boolean;
  error: string | null;
}

let mockQuestContext: QuestContextMock = {
  quests: [],
  loading: false,
  error: null,
};

jest.mock('features/campaign-entities', () => ({
  useQuests: () => mockQuestContext,
  QuestDirectory: (props: { quests?: unknown[] }) => (
    <div data-testid="quest-directory">
      <span data-testid="quest-directory-count">{props.quests?.length}</span>
    </div>
  ),
}));

const mockNavigateToPage = jest.fn();

jest.mock('shared/hooks/useNavigation', () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('QuestsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { uid: 'user-1' };
    mockActiveGroupId = 'group-1';
    mockActiveCampaignId = 'campaign-1';
    mockQuestContext = {
      quests: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
      loading: false,
      error: null,
    };
  });

  // -------------------------------------------------------------------------
  // Context guards
  // -------------------------------------------------------------------------
  describe('context guards', () => {
    it('renders "No Group Selected" when no group is active', () => {
      mockActiveGroupId = null;
      render(<QuestsPage />);
      expect(screen.getByText('No Group Selected')).toBeInTheDocument();
      expect(screen.queryByTestId('quest-directory')).not.toBeInTheDocument();
    });

    it('renders "No Campaign Selected" when a group is active but no campaign is', () => {
      mockActiveCampaignId = null;
      render(<QuestsPage />);
      expect(screen.getByText('No Campaign Selected')).toBeInTheDocument();
      expect(screen.queryByTestId('quest-directory')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders a loading indicator instead of the directory', () => {
      mockQuestContext = { ...mockQuestContext, loading: true, quests: [] };
      render(<QuestsPage />);
      expect(screen.getByText('Loading quests...')).toBeInTheDocument();
      expect(screen.queryByTestId('quest-directory')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders the error message instead of the directory', () => {
      mockQuestContext = { ...mockQuestContext, error: 'Firebase error', quests: [] };
      render(<QuestsPage />);
      expect(
        screen.getByText('Error Loading Quests. Sign in to view content.')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('quest-directory')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Page header / create action
  // -------------------------------------------------------------------------
  describe('page header', () => {
    it('renders the heading and subtitle', () => {
      render(<QuestsPage />);
      expect(screen.getByText('Campaign Quests')).toBeInTheDocument();
      expect(
        screen.getByText("Track your party's epic adventures and missions")
      ).toBeInTheDocument();
    });

    it('shows "Create Quest" for an authenticated user and navigates on click', () => {
      render(<QuestsPage />);
      fireEvent.click(screen.getByText('Create Quest'));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/quests/create');
    });

    it('hides "Create Quest" when there is no user', () => {
      mockUser = null;
      render(<QuestsPage />);
      expect(screen.queryByText('Create Quest')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Directory handoff
  // -------------------------------------------------------------------------
  describe('quest directory', () => {
    it('renders the directory once group, campaign and data are all ready', () => {
      render(<QuestsPage />);
      expect(screen.getByTestId('quest-directory')).toBeInTheDocument();
    });

    it('passes every quest through, unfiltered — filtering is the directory\'s job', () => {
      render(<QuestsPage />);
      expect(screen.getByTestId('quest-directory-count')).toHaveTextContent('3');
    });
  });
});
