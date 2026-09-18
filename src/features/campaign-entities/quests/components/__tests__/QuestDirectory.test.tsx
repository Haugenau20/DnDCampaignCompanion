// src/features/campaign-entities/quests/components/__tests__/QuestDirectory.test.tsx
import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import QuestDirectory from '../QuestDirectory';
import type { Quest, QuestObjective } from '../../types';
import type { NPC } from '../../../npcs/types';
import type { Location } from '../../../locations/types';

// ---------------------------------------------------------------------------
// Context mocks
//
// QuestDirectory reaches its Firebase-backed data through sibling context
// modules plus the `features/user-management` barrel and
// `shared/hooks/useNavigation`. None of those, once mocked, touch react-router
// or any provider tree, so no router/provider wrapper is needed.
//
// These tests were QuestsPage's until the roster moved out of the page into
// this directory — the same split the other three entities have always had.
// They exercise roster behaviour, so they followed the roster; what stayed
// behind in QuestsPage.test.tsx is the page's own header and context guards.
// ---------------------------------------------------------------------------

let mockUser: { uid: string } | null = { uid: 'user-1' };

jest.mock('features/user-management', () => ({
  useAuth: () => ({ user: mockUser }),
}));

interface QuestContextMock {
  quests: Quest[];
  loading: boolean;
  error: string | null;
  deleteQuest: jest.Mock;
  updateQuest?: jest.Mock;
  updateQuestObjective?: jest.Mock;
}

const mockDeleteQuest = jest.fn().mockResolvedValue(undefined);
// `15-3` wires the row to the two mutations it already had but never called.
const mockUpdateQuest = jest.fn().mockResolvedValue(undefined);
const mockUpdateQuestObjective = jest.fn().mockResolvedValue(undefined);

let mockQuestContext: QuestContextMock = {
  quests: [],
  loading: false,
  error: null,
  deleteQuest: mockDeleteQuest,
  updateQuest: mockUpdateQuest,
  updateQuestObjective: mockUpdateQuestObjective,
};

let mockGetNPCById: (id: string) => NPC | undefined = () => undefined;
let mockLocations: Location[] = [];

jest.mock('../../context/QuestContext', () => ({
  useQuests: () => mockQuestContext,
}));

jest.mock('../../../npcs/context/NPCContext', () => ({
  useNPCs: () => ({ getNPCById: mockGetNPCById }),
}));

jest.mock('../../../locations/context/LocationContext', () => ({
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
  return render(<QuestDirectory quests={mockQuestContext.quests} />);
}

const expandButton = (title: string | RegExp) =>
  screen.getByRole('button', { name: typeof title === 'string' ? new RegExp(`Expand ${title}`) : title });

const collapseButton = (title: string) =>
  screen.getByRole('button', { name: new RegExp(`Collapse ${title}`) });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
/**
 * Open the surplus a quest row keeps behind a second disclosure.
 *
 * `15-3` bounds the expansion to four facts -- description, objectives, who is
 * in it and the status control. Background, leads, complications, rewards,
 * level range, completion date and key locations are prep, and move to
 * `/quests/:questId` in `15-5`; until that page exists they stay reachable
 * here, but closed.
 */
const openPrep = () => {
  fireEvent.click(screen.getByRole('button', { name: /^Prep/ }));
};

/** Open a status group that `15-3` collapses by default (T015). */
const openGroup = (name: RegExp | string) => {
  fireEvent.click(screen.getByRole('button', { name }));
};

describe('QuestDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteQuest.mockResolvedValue(undefined);
    mockUpdateQuest.mockResolvedValue(undefined);
    mockUpdateQuestObjective.mockResolvedValue(undefined);
    mockUser = { uid: 'user-1' };
    mockQuestContext = {
      quests: [...sampleQuests],
      loading: false,
      error: null,
      deleteQuest: mockDeleteQuest,
      updateQuest: mockUpdateQuest,
      updateQuestObjective: mockUpdateQuestObjective,
    };
    mockGetNPCById = (id: string) => (id === 'npc-1' ? makeNPC() : undefined);
    mockLocations = [makeLocation({ name: 'Forest Clearing' })];
    mockGetCurrentQueryParams.mockReturnValue({});
  });

  // -------------------------------------------------------------------------
  // Loading state — the directory's own; the page owns the context guards and
  // the error branch, and covers them in its own suite.
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders a loading indicator and no rows', () => {
      mockQuestContext = { ...mockQuestContext, loading: true, quests: [] };
      const { container } = render(<QuestDirectory quests={[]} isLoading />);
      expect(screen.getByRole('status', { name: /loading quests/i })).toBeInTheDocument();
      expect(container.querySelectorAll('.section-loading').length).toBeGreaterThan(3);
      expect(container.querySelector('.animate-spin')).toBeNull();
      expect(screen.queryByText('Find the Dragon')).not.toBeInTheDocument();
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
      // The completed group's heading now lives inside its collapse control,
      // so the count is a sibling of that button rather than of the heading.
      const completedHeading = screen.getByRole('heading', { name: 'Completed Quests' });
      expect(completedHeading.closest('section')).toHaveTextContent('1');
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
      expect(screen.getByText(/nothing taken on yet/i)).toBeInTheDocument();
      expect(screen.getByText(/what the party agreed to do/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /add the first quest/i })
      ).toBeInTheDocument();
    });

    it('shows a status-specific message when a status filter yields nothing', () => {
      mockQuestContext.quests = [questActiveDragon];
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: '0 failed' }));
      expect(screen.getByText(/no quests match these filters/i)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /add the first quest/i })
      ).not.toBeInTheDocument();
    });

    it('shows a search-specific message when a search yields nothing', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search quests...'), {
        target: { value: 'zzznomatch' },
      });
      expect(screen.getByText(/no quests match these filters/i)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /add the first quest/i })
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Row rendering — collapsed
  // -------------------------------------------------------------------------
  describe('location filter', () => {
    // The options and the filter comparison both key off the resolved name, so
    // picking a human-readable option must actually match slug-stored quests.
    it('offers resolved display names and filters slug-stored quests by them', () => {
      mockLocations = [makeLocation({ id: 'mines-of-moria', name: 'Mines of Moria' })];
      mockQuestContext.quests = [
        makeQuest({ id: 'q-moria', title: 'Escape from Moria', location: 'mines-of-moria' }),
        makeQuest({ id: 'q-other', title: 'Elsewhere Entirely', location: 'somewhere-else' }),
      ];
      renderPage();

      const select = screen.getByRole('combobox', { name: 'Filter by location' });
      expect(within(select).getByRole('option', { name: 'Mines of Moria' })).toBeInTheDocument();

      fireEvent.change(select, { target: { value: 'Mines of Moria' } });
      expect(screen.getByText('Escape from Moria')).toBeInTheDocument();
      expect(screen.queryByText('Elsewhere Entirely')).not.toBeInTheDocument();
    });
  });

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

    // #1412: `quest.location` holds an id, so this cell printed slugs.
    it('shows the location\'s display name, not its id', () => {
      mockLocations = [makeLocation({ id: 'mines-of-moria', name: 'Mines of Moria' })];
      mockQuestContext.quests = [
        makeQuest({ id: 'q-moria', title: 'Escape from Moria', location: 'mines-of-moria' }),
      ];
      renderPage();
      const row = within(expandButton('Escape from Moria'));
      expect(row.getByText('Mines of Moria')).toBeInTheDocument();
      expect(row.queryByText('mines-of-moria')).not.toBeInTheDocument();
    });

    it('leaves an unresolvable location visible as itself rather than prettified', () => {
      mockLocations = [];
      mockQuestContext.quests = [
        makeQuest({ id: 'q-lost', title: 'Lost Quest', location: 'lothlorien' }),
      ];
      renderPage();
      const row = within(expandButton('Lost Quest'));
      expect(row.getByText('lothlorien')).toBeInTheDocument();
    });

    it('shows objective progress as "<completed> of <total> objectives"', () => {
      renderPage();
      const row = within(expandButton('Find the Dragon'));
      expect(row.getByText('1 of 2 objectives')).toBeInTheDocument();
    });

    it('renders a proportional progress bar sized to the completion ratio', () => {
      renderPage();
      const row = expandButton('Find the Dragon');
      // `.progress-bar-open`, not `.progress-bar-active`: the latter stayed on
      // the accent for reading progress in storytelling, which is not a rank.
      const bar = row.querySelector('.progress-bar-open') as HTMLElement;
      expect(bar).toBeTruthy();
      expect(bar.style.width).toBe('50%');
    });

    it('says "No objectives" and omits the progress bar when there are none', () => {
      renderPage();
      openGroup('Failed Quests');
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
      // `15-3` bounds the expansion to four facts. The description is the text
      // itself rather than a labelled field, and the objectives are tickable.
      expect(screen.getByText('A quest about a red dragon terrorizing the valley')).toBeInTheDocument();
      expect(screen.getByText('Objectives')).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /Status of Find the Dragon/ })).toBeInTheDocument();
    });

    it('collapses again on a second activation', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      fireEvent.click(collapseButton('Find the Dragon'));
      expect(screen.queryByText('A quest about a red dragon terrorizing the valley')).not.toBeInTheDocument();
    });

    it('only expands one row at a time', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      // T015 collapses this group by default; open it to reach the row.
      openGroup('Completed Quests');
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
    it('gives every objective a real checkbox, named by the objective (T016)', () => {
      // The marker it replaces was a decorative `<div aria-hidden>`: a keyboard
      // could not reach it and a screen reader never saw it.
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));

      expect(screen.getByRole('checkbox', { name: 'Scout the lair entrance' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Slay the dragon' })).not.toBeChecked();
    });

    it('writes through updateQuestObjective when one is ticked', async () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Slay the dragon' }));

      await waitFor(() =>
        expect(mockUpdateQuestObjective).toHaveBeenCalledWith('q1', 'o2', true)
      );
    });

    it('does not tick optimistically: the box waits for the write', async () => {
      let resolve!: () => void;
      mockUpdateQuestObjective.mockImplementationOnce(
        () => new Promise<void>((r) => { resolve = r; })
      );
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Slay the dragon' }));

      expect(screen.getByRole('checkbox', { name: 'Slay the dragon' })).not.toBeChecked();
      expect(screen.getByText('Saving…')).toBeInTheDocument();
      resolve();
      await waitFor(() => expect(screen.queryByText('Saving…')).not.toBeInTheDocument());
    });

    it('reverts and says why when the write is refused', async () => {
      mockUpdateQuestObjective.mockRejectedValueOnce(new Error('Permission denied'));
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Slay the dragon' }));

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('Permission denied')
      );
      expect(screen.getByRole('checkbox', { name: 'Slay the dragon' })).not.toBeChecked();
    });

    it('keeps the prep disclosure closed, and carries no display class while closed', () => {
      // jsdom applies no CSS, so `toBeVisible()` cannot catch the real bug
      // here: `hidden` is an attribute selector and a `flex` class outranks
      // `[hidden] { display: none }`, so the block stayed on screen in the
      // browser while every test passed. Asserting the class is the part of
      // that a unit test can actually see.
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));

      const trigger = screen.getByRole('button', { name: /^Prep/ });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      const panel = document.getElementById(trigger.getAttribute('aria-controls')!);
      expect(panel).toHaveAttribute('hidden');
      expect(panel?.className ?? '').not.toMatch(/flex/);
    });

    it('shows the prep material once the disclosure is opened', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();

      const trigger = screen.getByRole('button', { name: /^Prep/ });
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('The dragon arrived three winters ago.')).toBeInTheDocument();
    });

    it('offers the status ladder as buttons, not a dropdown', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));

      const ladder = screen.getByRole('group', { name: /Status of Find the Dragon/ });
      expect(within(ladder).getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
      expect(within(ladder).getByRole('button', { name: 'Completed' })).toBeInTheDocument();
      expect(within(ladder).getByRole('button', { name: 'Failed' })).toBeInTheDocument();
    });

    it('changes a quest status from the row, in one click', async () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));

      const ladder = screen.getByRole('group', { name: /Status of Find the Dragon/ });
      fireEvent.click(within(ladder).getByRole('button', { name: 'Completed' }));

      await waitFor(() =>
        expect(mockUpdateQuest).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'q1', status: 'completed' })
        )
      );
    });

    it('shows completed objectives struck through and muted, pending ones plain', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));

      const completedText = screen.getByText('Scout the lair entrance');
      const pendingText = screen.getByText('Slay the dragon');

      expect(completedText.className).toContain('line-through');
      expect(completedText.className).toContain('typography-secondary');
      expect(pendingText.className).not.toContain('line-through');
      // A ticked objective keeps its place: it is not moved to the bottom.
      const descriptions = screen
        .getAllByRole('checkbox')
        .map((box) => box.closest('label')?.textContent);
      expect(descriptions[0]).toContain('Scout the lair entrance');
    });

    it('states "No objectives recorded" honestly instead of hiding the field', () => {
      renderPage();
      // T015 collapses this group by default; open it to reach the row.
      openGroup('Failed Quests');
      fireEvent.click(expandButton('Rescue the Princess'));
      expect(screen.getByText('No objectives recorded')).toBeInTheDocument();
    });
  });

  describe('expanded content — description and background', () => {
    it('always shows the description', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      expect(
        screen.getByText('A quest about a red dragon terrorizing the valley')
      ).toBeInTheDocument();
    });

    it('shows background text when present', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      expect(screen.getByText('The dragon arrived three winters ago.')).toBeInTheDocument();
    });

    it('states "No background written yet" when absent', () => {
      renderPage();
      // T015 collapses this group by default; open it to reach the row.
      openGroup('Failed Quests');
      fireEvent.click(expandButton('Rescue the Princess'));
      openPrep();
      expect(screen.getByText('No background written yet')).toBeInTheDocument();
    });
  });

  describe('expanded content — leads, complications, rewards', () => {
    it('lists leads, complications and rewards when present', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      expect(screen.getByText('Ask the blacksmith about dragon scales')).toBeInTheDocument();
      expect(screen.getByText('The lair is full of traps')).toBeInTheDocument();
      expect(screen.getByText('500 gold')).toBeInTheDocument();
      expect(screen.getByText('Dragon scale armor')).toBeInTheDocument();
    });

    it('states emptiness honestly for leads, complications and rewards', () => {
      renderPage();
      // T015 collapses this group by default; open it to reach the row.
      openGroup('Failed Quests');
      fireEvent.click(expandButton('Rescue the Princess'));
      openPrep();
      expect(screen.getByText('No leads recorded')).toBeInTheDocument();
      expect(screen.getByText('No complications recorded')).toBeInTheDocument();
      expect(screen.getByText('No rewards recorded')).toBeInTheDocument();
    });
  });

  describe('expanded content — level range and completion date', () => {
    it('shows the level range when present, and "Not recorded" when absent', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      expect(screen.getByText('3-5')).toBeInTheDocument();
      fireEvent.click(collapseButton('Find the Dragon'));

      // T015 collapses this group by default; open it to reach the row.
      openGroup('Failed Quests');
      fireEvent.click(expandButton('Rescue the Princess'));
      openPrep();
      expect(screen.getByText('Not recorded')).toBeInTheDocument();
    });

    it('shows "Not yet completed" for an active quest', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      expect(screen.getByText('Not yet completed')).toBeInTheDocument();
    });

    it('shows the recorded date for a completed quest that has one', () => {
      renderPage();
      // T015 collapses this group by default; open it to reach the row.
      openGroup('Completed Quests');
      fireEvent.click(expandButton('Slay the Lich'));
      openPrep();
      expect(screen.getByText('1492-03-10')).toBeInTheDocument();
    });

    it('shows "Date not recorded" for a completed quest with no date', () => {
      mockQuestContext.quests = [
        makeQuest({ id: 'q-nodate', title: 'Undated Victory', status: 'completed' }),
      ];
      renderPage();
      // T015 collapses this group by default; open it to reach the row.
      openGroup('Completed Quests');
      fireEvent.click(expandButton('Undated Victory'));
      openPrep();
      expect(screen.getByText('Date not recorded')).toBeInTheDocument();
    });
  });

  describe('expanded content — key locations', () => {
    it('renders a known location as a clickable button that navigates to it', () => {
      renderPage();
      fireEvent.click(expandButton('Collect Herbs'));
      openPrep();
      fireEvent.click(screen.getByRole('button', { name: /Forest Clearing/ }));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        '/locations?highlight=loc-1'
      );
    });

    it('renders an unknown location as plain, non-interactive text', () => {
      renderPage();
      fireEvent.click(expandButton('Collect Herbs'));
      openPrep();
      expect(screen.getByText('Unknown Ruins')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Unknown Ruins/ })
      ).not.toBeInTheDocument();
    });

    it('states "No key locations recorded" when there are none', () => {
      renderPage();
      // T015 collapses this group by default; open it to reach the row.
      openGroup('Failed Quests');
      fireEvent.click(expandButton('Rescue the Princess'));
      openPrep();
      expect(screen.getByText('No key locations recorded')).toBeInTheDocument();
    });
  });

  describe('expanded content — related and important NPCs', () => {
    it('renders a resolvable related NPC as a clickable button that navigates to it', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      fireEvent.click(screen.getByRole('button', { name: /Elder Willow/ }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/npcs?highlight=npc-1');
    });

    it('flags a related NPC id that does not resolve, instead of silently dropping it', () => {
      renderPage();
      fireEvent.click(expandButton('Collect Herbs'));
      openPrep();
      expect(
        screen.getByText('Someone no longer in the directory')
      ).toBeInTheDocument();
    });

    it('renders important NPCs (name + description) when present', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      expect(screen.getByText('Old Hunter')).toBeInTheDocument();
      expect(screen.getByText("Knows the dragon's habits")).toBeInTheDocument();
    });

    it('states emptiness honestly for related and important NPCs', () => {
      renderPage();
      // T015 collapses this group by default; open it to reach the row.
      openGroup('Failed Quests');
      fireEvent.click(expandButton('Rescue the Princess'));
      openPrep();
      expect(screen.getByText('Nobody attached yet')).toBeInTheDocument();
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
      openPrep();
      expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    it('hides Edit and Delete when there is no user', () => {
      mockUser = null;
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('navigates to the edit page when Edit is clicked', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/quests/edit/q1');
    });

    it('opens a confirmation dialog naming the quest when Delete is clicked', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(
        screen.getByText('“Find the Dragon” is removed for everyone. This cannot be undone.')
      ).toBeInTheDocument();
    });

    it('does not delete when the confirmation is cancelled', () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockDeleteQuest).not.toHaveBeenCalled();
    });

    it('calls deleteQuest with the quest id when the deletion is confirmed', async () => {
      renderPage();
      fireEvent.click(expandButton('Find the Dragon'));
      openPrep();
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      // The row's Delete and the dialog's confirm used to read identically,
      // so this had to reach for the last match in document order. Since 14.5
      // the confirm carries the verb -- "Delete Quest" -- and the two are
      // simply different controls.
      fireEvent.click(screen.getByRole('button', { name: 'Delete Quest' }));

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

    // Bug #1415's regression test. It used to pin the defective behaviour
    // (matching only the raw relatedNPCIds string, never the NPC's resolved
    // name). Inverted here to assert the fix: searching a related NPC's
    // *name* finds every quest that NPC is related to.
    it('matches search text against the related NPC\'s resolved name, not just its raw id', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search quests...'), {
        target: { value: 'willow' },
      });
      // Both quests relate to npc-1, which mockGetNPCById resolves to "Elder Willow".
      expect(screen.getByText('Find the Dragon')).toBeInTheDocument();
      expect(screen.getByText('Collect Herbs')).toBeInTheDocument();
      // Unrelated to that NPC, and no other clause matches "willow".
      expect(screen.queryByText('Slay the Lich')).not.toBeInTheDocument();
      expect(screen.queryByText('Rescue the Princess')).not.toBeInTheDocument();
    });

    // The id check is kept as a fallback (`||`), not replaced, so a deep
    // link or a copy-pasted id still finds the quest even though the typed
    // text isn't the NPC's name.
    it('also matches a raw NPC id typed verbatim, as a fallback for deep links and copy-pasted ids', () => {
      renderPage();
      fireEvent.change(screen.getByPlaceholderText('Search quests...'), {
        target: { value: 'npc-1' },
      });
      expect(screen.getByText('Find the Dragon')).toBeInTheDocument();
      expect(screen.getByText('Collect Herbs')).toBeInTheDocument();
    });

    // An id that no longer resolves to an NPC (e.g. the NPC was deleted)
    // must not be silently dropped from search -- it still matches on its
    // raw text via the same fallback, mirroring the expanded "Related NPCs"
    // row, which surfaces an unresolvable id instead of hiding it.
    it('still matches an unresolvable (deleted) NPC id via the raw-id fallback', () => {
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

  // -------------------------------------------------------------------------
  // Row anatomy — one encoding per fact
  // -------------------------------------------------------------------------
  describe('row anatomy', () => {
    test('carries exactly one identity mark, derived from the id', () => {
      renderPage();
      const row = within(expandButton('Find the Dragon'));
      const marks = row.getAllByTestId('entity-sigil');
      expect(marks).toHaveLength(1);
      expect(marks[0]).toHaveTextContent('F');
    });

    test('states status as a word and nothing else', () => {
      renderPage();
      const row = expandButton('Find the Dragon');
      expect(within(row).getByText('Active')).toBeInTheDocument();
      expect(row.querySelectorAll('.bg-status-active')).toHaveLength(0);
      expect(row.querySelectorAll('.bg-status-completed')).toHaveLength(0);
      expect(row.querySelectorAll('.bg-status-failed')).toHaveLength(0);
    });
  });

});
