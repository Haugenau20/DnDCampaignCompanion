// src/pages/quests/__tests__/QuestsPage.test.tsx
import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import QuestsPage from '../QuestsPage';
import type { Quest, QuestObjective } from 'features/campaign-entities';
import type { NPC } from 'features/campaign-entities';
import type { Location } from 'features/campaign-entities';

// ---------------------------------------------------------------------------
// Context mocks
//
// QuestsPage talks to Firebase-backed hooks exclusively through the
// `features/campaign-entities` and `features/user-management` barrels, plus
// `shared/hooks/useNavigation`. None of those, once mocked, touch
// react-router or any provider tree, so no router/provider wrapper is needed.
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
  quests: Quest[];
  loading: boolean;
  error: string | null;
  deleteQuest: jest.Mock;
}

const mockDeleteQuest = jest.fn().mockResolvedValue(undefined);

let mockQuestContext: QuestContextMock = {
  quests: [],
  loading: false,
  error: null,
  deleteQuest: mockDeleteQuest,
};

let mockGetNPCById: (id: string) => NPC | undefined = () => undefined;
let mockLocations: Location[] = [];

jest.mock('features/campaign-entities', () => ({
  useQuests: () => mockQuestContext,
  useNPCs: () => ({ getNPCById: mockGetNPCById }),
  useLocations: () => ({ locations: mockLocations }),
}));

const mockNavigateToPage = jest.fn();
const mockCreatePath = jest.fn(
  (path: string, _params?: Record<string, string>, query?: Record<string, string>) =>
    query && Object.keys(query).length
      ? `${path}?${new URLSearchParams(query).toString()}`
      : path
);
const mockGetCurrentQueryParams = jest.fn(() => ({} as Record<string, string>));

jest.mock('shared/hooks/useNavigation', () => ({
  useNavigation: () => ({
    navigateToPage: mockNavigateToPage,
    createPath: mockCreatePath,
    getCurrentQueryParams: mockGetCurrentQueryParams,
  }),
}));

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: `quest-${Math.random().toString(36).slice(2)}`,
    title: 'Test Quest',
    description: 'A test quest',
    status: 'active',
    objectives: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function makeObjective(overrides: Partial<QuestObjective> = {}): QuestObjective {
  return {
    id: `obj-${Math.random().toString(36).slice(2)}`,
    description: 'Do a thing',
    completed: false,
    ...overrides,
  };
}

function makeNPC(overrides: Partial<NPC> = {}): NPC {
  return {
    id: 'npc-1',
    name: 'Elder Willow',
    status: 'alive',
    relationship: 'friendly',
    description: 'A wise elder',
    connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
    notes: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc-1',
    name: 'Forest Clearing',
    type: 'landmark',
    status: 'known',
    description: 'A quiet clearing',
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

const questActiveDragon = makeQuest({
  id: 'q1',
  title: 'Find the Dragon',
  description: 'A quest about a red dragon terrorizing the valley',
  status: 'active',
  location: 'Dungeon',
  levelRange: '3-5',
  background: 'The dragon arrived three winters ago.',
  objectives: [
    makeObjective({ id: 'o1', description: 'Scout the lair entrance', completed: true }),
    makeObjective({ id: 'o2', description: 'Slay the dragon', completed: false }),
  ],
  leads: ['Ask the blacksmith about dragon scales'],
  complications: ['The lair is full of traps'],
  rewards: ['500 gold', 'Dragon scale armor'],
  keyLocations: [{ name: "Dragon's Lair", description: 'A cave in the mountains' }],
  importantNPCs: [{ name: 'Old Hunter', description: "Knows the dragon's habits" }],
  relatedNPCIds: ['npc-1'],
});

const questCompletedLich = makeQuest({
  id: 'q2',
  title: 'Slay the Lich',
  description: 'A necromantic affair threatens the kingdom',
  status: 'completed',
  location: 'Crypt',
  dateCompleted: '1492-03-10',
  levelRange: '5-8',
  objectives: [makeObjective({ id: 'o3', description: 'Retrieve the phylactery', completed: true })],
  relatedNPCIds: [],
});

const questFailedPrincess = makeQuest({
  id: 'q3',
  title: 'Rescue the Princess',
  description: 'A classic adventure gone wrong',
  status: 'failed',
  location: 'Dungeon',
  objectives: [],
});

const questActiveHerbs = makeQuest({
  id: 'q4',
  title: 'Collect Herbs',
  description: 'A mundane errand for the herbalist',
  status: 'active',
  location: 'Forest',
  objectives: [
    makeObjective({ id: 'o4', description: 'Gather 10 herbs', completed: false }),
    makeObjective({ id: 'o5', description: 'Return to herbalist', completed: false }),
    makeObjective({ id: 'o6', description: 'Report findings', completed: true }),
  ],
  relatedNPCIds: ['npc-1', 'npc-missing'],
  keyLocations: [
    { name: 'Forest Clearing', description: 'A quiet clearing' },
    { name: 'Unknown Ruins', description: 'Ancient, unmapped ruins' },
  ],
});

const sampleQuests = [questActiveDragon, questCompletedLich, questFailedPrincess, questActiveHerbs];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  return render(<QuestsPage />);
}

const expandButton = (title: string | RegExp) =>
  screen.getByRole('button', { name: typeof title === 'string' ? new RegExp(`Expand ${title}`) : title });

const collapseButton = (title: string) =>
  screen.getByRole('button', { name: new RegExp(`Collapse ${title}`) });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('QuestsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteQuest.mockResolvedValue(undefined);
    mockUser = { uid: 'user-1' };
    mockActiveGroupId = 'group-1';
    mockActiveCampaignId = 'campaign-1';
    mockQuestContext = {
      quests: [...sampleQuests],
      loading: false,
      error: null,
      deleteQuest: mockDeleteQuest,
    };
    mockGetNPCById = (id: string) => (id === 'npc-1' ? makeNPC() : undefined);
    mockLocations = [makeLocation({ name: 'Forest Clearing' })];
    mockGetCurrentQueryParams.mockReturnValue({});
  });

  // -------------------------------------------------------------------------
  // Context guards
  // -------------------------------------------------------------------------
  describe('when no group is selected', () => {
    it('renders "No Group Selected"', () => {
      mockActiveGroupId = null;
      renderPage();
      expect(screen.getByText('No Group Selected')).toBeInTheDocument();
    });
  });

  describe('when no campaign is selected', () => {
    it('renders "No Campaign Selected"', () => {
      mockActiveCampaignId = null;
      renderPage();
      expect(screen.getByText('No Campaign Selected')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders a loading indicator and no rows', () => {
      mockQuestContext = { ...mockQuestContext, loading: true, quests: [] };
      renderPage();
      expect(screen.getByText('Loading quests...')).toBeInTheDocument();
      expect(screen.queryByText('Find the Dragon')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders the error message', () => {
      mockQuestContext = { ...mockQuestContext, error: 'Firebase error', quests: [] };
      renderPage();
      expect(
        screen.getByText('Error Loading Quests. Sign in to view content.')
      ).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Page header / create action
  // -------------------------------------------------------------------------
  describe('page header', () => {
    it('renders the heading and subtitle', () => {
      renderPage();
      expect(screen.getByText('Campaign Quests')).toBeInTheDocument();
      expect(
        screen.getByText("Track your party's epic adventures and missions")
      ).toBeInTheDocument();
    });

    it('shows "Create Quest" for an authenticated user and navigates on click', () => {
      renderPage();
      const createButton = screen.getByText('Create Quest');
      fireEvent.click(createButton);
      expect(mockNavigateToPage).toHaveBeenCalledWith('/quests/create');
    });

    it('hides "Create Quest" when there is no user', () => {
      mockUser = null;
      renderPage();
      expect(screen.queryByText('Create Quest')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Status bar — one bar that replaced three stat cards
  // -------------------------------------------------------------------------
  describe('status bar', () => {
    it('shows the true total, unaffected by filters', () => {
      renderPage();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('sworn so far')).toBeInTheDocument();
    });

    it('labels every one of the three statuses, each with a word', () => {
      renderPage();
      // active=2, completed=1, failed=1
      expect(screen.getByRole('button', { name: '2 active' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 completed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 failed' })).toBeInTheDocument();
    });

    it('keeps a zero-count status band visible, with reduced opacity', () => {
      mockQuestContext.quests = [questActiveDragon, questActiveHerbs];
      renderPage();
      const failedBand = screen.getByRole('button', { name: '0 failed' });
      expect(failedBand).toBeInTheDocument();
      expect(failedBand.className).toContain('opacity-50');
    });

    it('is honest that active + completed does not equal the total once a failed quest exists', () => {
      renderPage();
      // active(2) + completed(1) = 3, but total is 4 because of the 1 failed quest.
      // All three bands together (2 + 1 + 1) do sum to the total of 4.
      const active = screen.getByRole('button', { name: '2 active' });
      const completed = screen.getByRole('button', { name: '1 completed' });
      const failed = screen.getByRole('button', { name: '1 failed' });
      expect(active).toBeInTheDocument();
      expect(completed).toBeInTheDocument();
      expect(failed).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('filters rows by clicking a band', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: '1 failed' }));
      expect(screen.getByText('Rescue the Princess')).toBeInTheDocument();
      expect(screen.queryByText('Find the Dragon')).not.toBeInTheDocument();
      expect(screen.queryByText('Slay the Lich')).not.toBeInTheDocument();
    });

    it('clicking the active band a second time clears the filter back to all', () => {
      renderPage();
      const failedBand = () => screen.getByRole('button', { name: '1 failed' });

      fireEvent.click(failedBand());
      expect(failedBand()).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByText('Find the Dragon')).not.toBeInTheDocument();

      fireEvent.click(failedBand());
      expect(failedBand()).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Find the Dragon')).toBeInTheDocument();
    });

    it('does not change the bar counts when a text search narrows the visible rows', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search quests...'), {
        target: { value: 'dragon' },
      });
      expect(screen.getByRole('button', { name: '2 active' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 completed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 failed' })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Grouping — fixed status order, empty groups skipped
  // -------------------------------------------------------------------------
  describe('grouping by status', () => {
    it('renders one group per non-empty status, in Active/Completed/Failed order', () => {
      renderPage();
      const headings = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
      expect(headings).toEqual(['Active Quests', 'Completed Quests', 'Failed Quests']);
    });

    it('labels each group heading with its own count', () => {
      renderPage();
      const activeHeading = screen.getByRole('heading', { name: 'Active Quests' });
      expect(activeHeading.parentElement).toHaveTextContent('2');
      const completedHeading = screen.getByRole('heading', { name: 'Completed Quests' });
      expect(completedHeading.parentElement).toHaveTextContent('1');
    });

    it('omits a group entirely once filtering leaves it empty', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: '2 active' }));
      const headings = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
      expect(headings).toEqual(['Active Quests']);
    });
  });

  // -------------------------------------------------------------------------
  // Empty states
  // -------------------------------------------------------------------------
  describe('empty states', () => {
    it('shows a generic message when there are no quests at all', () => {
      mockQuestContext.quests = [];
      renderPage();
      expect(screen.getByText('No Quests Found')).toBeInTheDocument();
      expect(screen.getByText('There are no quests to display')).toBeInTheDocument();
    });

    it('shows a status-specific message when a status filter yields nothing', () => {
      mockQuestContext.quests = [questActiveDragon];
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: '0 failed' }));
      expect(screen.getByText('No Quests Found')).toBeInTheDocument();
      expect(screen.getByText('No failed quests found')).toBeInTheDocument();
    });

    it('shows a search-specific message when a search yields nothing', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search quests...'), {
        target: { value: 'zzznomatch' },
      });
      expect(screen.getByText('No Quests Found')).toBeInTheDocument();
      expect(screen.getByText('No quests match your search criteria')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Row rendering — collapsed
  // -------------------------------------------------------------------------
  describe('collapsed row', () => {
    it('shows title, status word and location', () => {
      renderPage();
      const row = within(expandButton('Find the Dragon'));
      expect(row.getByText('Find the Dragon')).toBeInTheDocument();
      expect(row.getByText('Active')).toBeInTheDocument();
      expect(row.getByText('Dungeon')).toBeInTheDocument();
    });

    it('shows a dash when the quest has no location', () => {
      mockQuestContext.quests = [makeQuest({ id: 'q-no-loc', title: 'No Location Quest' })];
      renderPage();
      const row = within(expandButton('No Location Quest'));
      expect(row.getByText('—')).toBeInTheDocument();
    });

    it('shows objective progress as "<completed> of <total> objectives"', () => {
      renderPage();
      const row = within(expandButton('Find the Dragon'));
      expect(row.getByText('1 of 2 objectives')).toBeInTheDocument();
    });

    it('renders a proportional progress bar sized to the completion ratio', () => {
      renderPage();
      const row = expandButton('Find the Dragon');
      const bar = row.querySelector('.progress-bar-active') as HTMLElement;
      expect(bar).toBeTruthy();
      expect(bar.style.width).toBe('50%');
    });

    it('says "No objectives" and omits the progress bar when there are none', () => {
      renderPage();
      const row = expandButton('Rescue the Princess');
      expect(within(row).getByText('No objectives')).toBeInTheDocument();
      expect(row.querySelector('.progress-bar-failed')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Row expansion
  // -------------------------------------------------------------------------
  describe('row expansion', () => {
    it('starts collapsed', () => {
      renderPage();
      expect(expandButton('Find the Dragon')).toHaveAttribute('aria-expanded', 'false');
    });

    it('expands in place on activation and shows expanded fields', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      expect(collapseButton('Find the Dragon')).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Objectives')).toBeInTheDocument();
    });

    it('collapses again on a second activation', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      fireEvent.click(collapseButton('Find the Dragon'));
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    it('only expands one row at a time', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      fireEvent.click(expandButton('Slay the Lich'));

      expect(expandButton('Find the Dragon')).toHaveAttribute('aria-expanded', 'false');
      expect(collapseButton('Slay the Lich')).toHaveAttribute('aria-expanded', 'true');
    });

    it('highlights the row matching the ?highlight= query param', () => {
      mockGetCurrentQueryParams.mockReturnValue({ highlight: 'q1' });
      const { container } = renderPage();
      const highlighted = container.querySelector('#quest-q1');
      expect(highlighted?.className).toContain('highlighted-item');
      const notHighlighted = container.querySelector('#quest-q2');
      expect(notHighlighted?.className).not.toContain('highlighted-item');
    });
  });

  // -------------------------------------------------------------------------
  // Expanded content — the richest part of the quest model
  // -------------------------------------------------------------------------
  describe('expanded content — objectives', () => {
    it('lists every objective with a completed/pending marker and description', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));

      const completedText = screen.getByText('Scout the lair entrance');
      const pendingText = screen.getByText('Slay the dragon');

      expect(completedText.closest('div')?.querySelector('.objective-completed')).toBeTruthy();
      expect(pendingText.closest('div')?.querySelector('.objective-pending')).toBeTruthy();
    });

    it('shows completed objectives struck through and muted, pending ones plain', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));

      const completedText = screen.getByText('Scout the lair entrance');
      const pendingText = screen.getByText('Slay the dragon');

      expect(completedText.className).toContain('line-through');
      expect(completedText.className).toContain('typography-secondary');
      expect(pendingText.className).not.toContain('line-through');
    });

    it('states "No objectives recorded" honestly instead of hiding the field', () => {
      renderPage();
      fireEvent.click(expandButton('Rescue the Princess'));
      expect(screen.getByText('No objectives recorded')).toBeInTheDocument();
    });
  });

  describe('expanded content — description and background', () => {
    it('always shows the description', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      expect(
        screen.getByText('A quest about a red dragon terrorizing the valley')
      ).toBeInTheDocument();
    });

    it('shows background text when present', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      expect(screen.getByText('The dragon arrived three winters ago.')).toBeInTheDocument();
    });

    it('states "No background written yet" when absent', () => {
      renderPage();
      fireEvent.click(expandButton('Rescue the Princess'));
      expect(screen.getByText('No background written yet')).toBeInTheDocument();
    });
  });

  describe('expanded content — leads, complications, rewards', () => {
    it('lists leads, complications and rewards when present', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      expect(screen.getByText('Ask the blacksmith about dragon scales')).toBeInTheDocument();
      expect(screen.getByText('The lair is full of traps')).toBeInTheDocument();
      expect(screen.getByText('500 gold')).toBeInTheDocument();
      expect(screen.getByText('Dragon scale armor')).toBeInTheDocument();
    });

    it('states emptiness honestly for leads, complications and rewards', () => {
      renderPage();
      fireEvent.click(expandButton('Rescue the Princess'));
      expect(screen.getByText('No leads recorded')).toBeInTheDocument();
      expect(screen.getByText('No complications recorded')).toBeInTheDocument();
      expect(screen.getByText('No rewards recorded')).toBeInTheDocument();
    });
  });

  describe('expanded content — level range and completion date', () => {
    it('shows the level range when present, and "Not recorded" when absent', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      expect(screen.getByText('3-5')).toBeInTheDocument();
      fireEvent.click(collapseButton('Find the Dragon'));

      fireEvent.click(expandButton('Rescue the Princess'));
      expect(screen.getByText('Not recorded')).toBeInTheDocument();
    });

    it('shows "Not yet completed" for an active quest', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      expect(screen.getByText('Not yet completed')).toBeInTheDocument();
    });

    it('shows the recorded date for a completed quest that has one', () => {
      renderPage();
      fireEvent.click(expandButton('Slay the Lich'));
      expect(screen.getByText('1492-03-10')).toBeInTheDocument();
    });

    it('shows "Date not recorded" for a completed quest with no date', () => {
      mockQuestContext.quests = [
        makeQuest({ id: 'q-nodate', title: 'Undated Victory', status: 'completed' }),
      ];
      renderPage();
      fireEvent.click(expandButton('Undated Victory'));
      expect(screen.getByText('Date not recorded')).toBeInTheDocument();
    });
  });

  describe('expanded content — key locations', () => {
    it('renders a known location as a clickable button that navigates to it', () => {
      renderPage();
      fireEvent.click(expandButton('Collect Herbs'));
      fireEvent.click(screen.getByRole('button', { name: /Forest Clearing/ }));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        '/locations?highlight=Forest+Clearing'
      );
    });

    it('renders an unknown location as plain, non-interactive text', () => {
      renderPage();
      fireEvent.click(expandButton('Collect Herbs'));
      expect(screen.getByText('Unknown Ruins')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Unknown Ruins/ })
      ).not.toBeInTheDocument();
    });

    it('states "No key locations recorded" when there are none', () => {
      renderPage();
      fireEvent.click(expandButton('Rescue the Princess'));
      expect(screen.getByText('No key locations recorded')).toBeInTheDocument();
    });
  });

  describe('expanded content — related and important NPCs', () => {
    it('renders a resolvable related NPC as a clickable button that navigates to it', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      fireEvent.click(screen.getByRole('button', { name: /Elder Willow/ }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/npcs?highlight=npc-1');
    });

    it('flags a related NPC id that does not resolve, instead of silently dropping it', () => {
      renderPage();
      fireEvent.click(expandButton('Collect Herbs'));
      expect(
        screen.getByText('npc-missing (not found in NPC directory)')
      ).toBeInTheDocument();
    });

    it('renders important NPCs (name + description) when present', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      expect(screen.getByText('Old Hunter')).toBeInTheDocument();
      expect(screen.getByText("Knows the dragon's habits")).toBeInTheDocument();
    });

    it('states emptiness honestly for related and important NPCs', () => {
      renderPage();
      fireEvent.click(expandButton('Rescue the Princess'));
      expect(screen.getByText('No related NPCs recorded')).toBeInTheDocument();
      expect(screen.getByText('No important NPCs recorded')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Edit / delete actions — auth gated
  // -------------------------------------------------------------------------
  describe('edit and delete actions', () => {
    it('shows Edit and Delete for an authenticated user, hides them otherwise', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('hides Edit and Delete when there is no user', () => {
      mockUser = null;
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('navigates to the edit page when Edit is clicked', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/quests/edit/q1');
    });

    it('opens a confirmation dialog naming the quest when Delete is clicked', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(
        screen.getByText('Are you sure you want to delete Quest "Find the Dragon"? This action cannot be undone.')
      ).toBeInTheDocument();
    });

    it('does not delete when the confirmation is cancelled', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockDeleteQuest).not.toHaveBeenCalled();
    });

    it('calls deleteQuest with the quest id when the deletion is confirmed', async () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      const confirmButtons = screen.getAllByRole('button', { name: 'Delete' });
      // The row's own Delete button plus the dialog's confirm button both read
      // "Delete" while the dialog is open; the dialog is portalled after the
      // row in document order, so it is the last match.
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => expect(mockDeleteQuest).toHaveBeenCalledWith('q1'));
    });
  });

  // -------------------------------------------------------------------------
  // Search filter
  // -------------------------------------------------------------------------
  describe('search filter', () => {
    it('filters by title', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search quests...'), {
        target: { value: 'dragon' },
      });
      expect(screen.getByText('Find the Dragon')).toBeInTheDocument();
      expect(screen.queryByText('Slay the Lich')).not.toBeInTheDocument();
    });

    it('filters by description', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search quests...'), {
        target: { value: 'necromantic' },
      });
      expect(screen.getByText('Slay the Lich')).toBeInTheDocument();
      expect(screen.queryByText('Find the Dragon')).not.toBeInTheDocument();
    });

    it('also searches objective descriptions, not just title and description', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search quests...'), {
        target: { value: 'phylactery' },
      });
      expect(screen.getByText('Slay the Lich')).toBeInTheDocument();
      expect(screen.queryByText('Find the Dragon')).not.toBeInTheDocument();
      expect(screen.queryByText('Collect Herbs')).not.toBeInTheDocument();
    });

    it('is case-insensitive', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search quests...'), {
        target: { value: 'DRAGON' },
      });
      expect(screen.getByText('Find the Dragon')).toBeInTheDocument();
    });

    it('clears back to the full list when the search is cleared', () => {
      renderPage();
      const search = screen.getByPlaceholderText('Search quests...');
      fireEvent.change(search, { target: { value: 'dragon' } });
      fireEvent.change(search, { target: { value: '' } });
      expect(screen.getByText('Find the Dragon')).toBeInTheDocument();
      expect(screen.getByText('Slay the Lich')).toBeInTheDocument();
    });

    // Documents current behaviour rather than asserting it is desirable: the
    // filter matches the raw relatedNPCIds strings themselves, not the NPC's
    // resolved display name. See final report.
    it('matches search text against the raw relatedNPCIds values', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search quests...'), {
        target: { value: 'npc-missing' },
      });
      expect(screen.getByText('Collect Herbs')).toBeInTheDocument();
      expect(screen.queryByText('Find the Dragon')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Location filter — stays a <select>, unbounded set of values
  // -------------------------------------------------------------------------
  describe('location filter', () => {
    it('renders a location select with every unique location, when any quest has one', () => {
      renderPage();
      const select = screen.getByRole('combobox');
      const optionLabels = within(select)
        .getAllByRole('option')
        .map(o => o.textContent);
      expect(optionLabels).toEqual(['All Locations', 'Crypt', 'Dungeon', 'Forest']);
    });

    it('omits the location select entirely when no quest has a location', () => {
      mockQuestContext.quests = [makeQuest({ id: 'q-x', title: 'No Location' })];
      renderPage();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('filters rows by the selected location', () => {
      renderPage();
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Dungeon' } });
      expect(screen.getByText('Find the Dragon')).toBeInTheDocument();
      expect(screen.getByText('Rescue the Princess')).toBeInTheDocument();
      expect(screen.queryByText('Slay the Lich')).not.toBeInTheDocument();
      expect(screen.queryByText('Collect Herbs')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Combined filters
  // -------------------------------------------------------------------------
  describe('combined filters', () => {
    it('applies status and location filters together', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: '2 active' }));
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Dungeon' } });
      expect(screen.getByText('Find the Dragon')).toBeInTheDocument();
      expect(screen.queryByText('Collect Herbs')).not.toBeInTheDocument();
      expect(screen.queryByText('Rescue the Princess')).not.toBeInTheDocument();
    });

    it('applies search and status filters together', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search quests...'), {
        target: { value: 'herbs' },
      });
      fireEvent.click(screen.getByRole('button', { name: '2 active' }));
      expect(screen.getByText('Collect Herbs')).toBeInTheDocument();
      expect(screen.queryByText('Find the Dragon')).not.toBeInTheDocument();
    });
  });
});
