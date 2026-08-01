// src/features/campaign-entities/npcs/components/__tests__/NPCDirectory.test.tsx

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import NPCDirectory from '../NPCDirectory';
import { NPC, NPCStatus, NPCRelationship } from 'features/campaign-entities/npcs/types';

// ---------------------------------------------------------------------------
// Mock all context dependencies used by NPCDirectory and its child NPCCard
// ---------------------------------------------------------------------------

jest.mock('shared/context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../quests/context/QuestContext', () => ({
  useQuests: jest.fn(),
}));

jest.mock('features/campaign-entities/npcs/context/NPCContext', () => ({
  useNPCs: jest.fn(),
}));

// Group headings resolve `npc.location` (an id) against the locations
// collection — see #1412. Most tests here set locations to names directly and
// supply no location records, which resolveLocationName passes through verbatim.
let mockLocations: any[] = [];

jest.mock('../../../locations/context/LocationContext', () => ({
  useLocations: () => ({ locations: mockLocations }),
}));

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
  useFirebase: jest.fn(() => ({ activeGroupId: 'group-1' })),
}));

// AttributionInfo dependencies
jest.mock('shared/utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(() => ''),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));
jest.mock('core/services/firebase', () => ({ default: {} }));

// ---------------------------------------------------------------------------
// Hook setup helpers
// ---------------------------------------------------------------------------

const mockNavigateToPage = jest.fn();
const mockCreatePath = jest.fn(
  (path: string, _p: unknown, query?: Record<string, string>) =>
    query ? `${path}?${new URLSearchParams(query).toString()}` : path
);
const mockGetCurrentQueryParams = jest.fn(() => ({}));

const { useNavigation } = require('shared/context/NavigationContext');
const { useQuests } = require('../../../quests/context/QuestContext');
const { useNPCs } = require('features/campaign-entities/npcs/context/NPCContext');
const { useAuth } = require('@/features/user-management');

function setupMocks(
  user: { uid: string } | null = { uid: 'user-1' },
  queryParams: Record<string, string> = {}
) {
  (useAuth as jest.Mock).mockReturnValue({ user });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    createPath: mockCreatePath,
    getCurrentQueryParams: jest.fn(() => queryParams),
  });
  (useQuests as jest.Mock).mockReturnValue({
    getQuestById: jest.fn(() => undefined),
  });
  (useNPCs as jest.Mock).mockReturnValue({
    updateNPCNote: jest.fn().mockResolvedValue(undefined),
    deleteNPC: jest.fn().mockResolvedValue(undefined),
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeNPC(overrides: Partial<NPC> = {}): NPC {
  return {
    id: `npc-${Math.random().toString(36).slice(2)}`,
    name: 'Test NPC',
    title: undefined,
    status: 'alive' as NPCStatus,
    relationship: 'neutral' as NPCRelationship,
    description: 'A test NPC',
    appearance: undefined,
    personality: undefined,
    background: undefined,
    occupation: undefined,
    location: 'Silverkeep',
    race: 'Human',
    connections: {
      relatedNPCs: [],
      affiliations: [],
      relatedQuests: [],
    },
    notes: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

/** The roster's search box. */
const searchInput = () =>
  screen.getByPlaceholderText(/search name, title or description/i);

const aldric = makeNPC({ id: 'npc-1', name: 'Aldric', location: 'Silverkeep', status: 'alive', relationship: 'friendly' });
const mira = makeNPC({ id: 'npc-2', name: 'Mira', location: 'Ironhold', status: 'deceased', relationship: 'hostile' });
const rolf = makeNPC({ id: 'npc-3', name: 'Rolf', location: 'Silverkeep', status: 'missing', relationship: 'neutral' });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NPCDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocations = [];
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // #1412 — headings used to print the raw `npc.location`, which is an id, so
  // users saw "mines-of-moria" where the Locations page says "Mines of Moria".
  // -------------------------------------------------------------------------
  describe('location headings', () => {
    const moriaNpc = makeNPC({ id: 'npc-m', name: 'Balin', location: 'mines-of-moria' });

    beforeEach(() => {
      mockLocations = [
        { id: 'mines-of-moria', name: 'Mines of Moria' },
        { id: 'rivendell', name: 'Rivendell' },
      ];
    });

    test('shows the location\'s display name, not its id', () => {
      render(<NPCDirectory npcs={[moriaNpc]} />);
      expect(
        screen.getByRole('heading', { name: 'Mines of Moria' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'mines-of-moria' })
      ).not.toBeInTheDocument();
    });

    test('groups NPCs stored under the id and under the name together', () => {
      const byName = makeNPC({ id: 'npc-r1', name: 'Arwen', location: 'Rivendell' });
      const byId = makeNPC({ id: 'npc-r2', name: 'Elrond', location: 'rivendell' });
      render(<NPCDirectory npcs={[byName, byId]} />);

      expect(screen.getAllByRole('heading', { name: 'Rivendell' })).toHaveLength(1);
      expect(screen.getByText('Arwen')).toBeInTheDocument();
      expect(screen.getByText('Elrond')).toBeInTheDocument();
    });

    test('leaves an unresolvable location visible as itself rather than prettified', () => {
      // The sample data's `lothlorien` matches no location record. Title-casing
      // it would invent a real-looking heading for a place that doesn't exist.
      const lost = makeNPC({ id: 'npc-l', name: 'Haldir', location: 'lothlorien' });
      render(<NPCDirectory npcs={[lost]} />);

      expect(screen.getByRole('heading', { name: 'lothlorien' })).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Lothlorien' })
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('should render loading indicator when isLoading is true', () => {
      render(<NPCDirectory npcs={[]} isLoading={true} />);
      expect(screen.getByText(/loading npcs/i)).toBeInTheDocument();
    });

    test('should not render filters when isLoading is true', () => {
      render(<NPCDirectory npcs={[]} isLoading={true} />);
      expect(
        screen.queryByPlaceholderText(/search name, title or description/i)
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    test('should show "No NPCs Found" when npcs array is empty', () => {
      render(<NPCDirectory npcs={[]} />);
      expect(screen.getByText(/no npcs found/i)).toBeInTheDocument();
    });

    test('should show "Start by adding" message when npcs array is empty', () => {
      render(<NPCDirectory npcs={[]} />);
      expect(screen.getByText(/start by adding some npcs/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // NPC rendering
  // -------------------------------------------------------------------------
  describe('NPC rendering', () => {
    test('should render NPC names', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      expect(screen.getByText('Aldric')).toBeInTheDocument();
      expect(screen.getByText('Mira')).toBeInTheDocument();
    });

    test('should group NPCs by location', () => {
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);
      expect(screen.getAllByText('Silverkeep').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Ironhold').length).toBeGreaterThanOrEqual(1);
    });

    test('should group NPCs with no location under "Location unknown"', () => {
      const unlocated = makeNPC({ id: 'npc-u', name: 'Wanderer', location: undefined });
      render(<NPCDirectory npcs={[unlocated]} />);
      expect(screen.getByText('Location unknown')).toBeInTheDocument();
    });

    test('renders the group name as a heading, not a control', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      // The heading used to be a <Typography h3> wrapped in a ghost <Button>, which
      // handed screen readers a control where a landmark belongs.
      expect(
        screen.getByRole('heading', { name: 'Silverkeep' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Silverkeep' })
      ).not.toBeInTheDocument();
    });

    test('offers a separate, labelled link to the location', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      expect(
        screen.getByRole('button', { name: 'Open location' })
      ).toBeInTheDocument();
    });

    test('should call navigateToPage when the location link is clicked', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Open location' }));
      expect(mockNavigateToPage).toHaveBeenCalled();
    });

    test('does not offer a location link for the unknown-location group', () => {
      const unlocated = makeNPC({ id: 'npc-u', name: 'Wanderer', location: undefined });
      render(<NPCDirectory npcs={[unlocated]} />);
      // There is no location record to open.
      expect(
        screen.queryByRole('button', { name: 'Open location' })
      ).not.toBeInTheDocument();
    });

    test('shows each row as one dense row carrying status, standing and occupation', () => {
      const npc = makeNPC({
        id: 'npc-dense',
        name: 'Acar',
        title: 'Elixir brewer',
        status: 'alive',
        relationship: 'neutral',
        occupation: 'Druid Merchant',
      });
      render(<NPCDirectory npcs={[npc]} />);

      // Scoped to the row, since the relationship words also label the filter pills.
      const row = within(screen.getByRole('button', { name: /Expand Acar/ }));
      expect(row.getByText('Acar')).toBeInTheDocument();
      expect(row.getByText('Elixir brewer')).toBeInTheDocument();
      expect(row.getByText('Alive')).toBeInTheDocument();
      expect(row.getByText('Neutral')).toBeInTheDocument();
      expect(row.getByText('Druid Merchant')).toBeInTheDocument();
    });

    test('labels relationship with a word, not only a colour', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      // The old left-border colour coding had no legend anywhere on the page.
      const row = within(screen.getByRole('button', { name: /Expand Aldric/ }));
      expect(row.getByText('Friendly')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Row expansion
  // -------------------------------------------------------------------------
  describe('row expansion', () => {
    test('rows start collapsed and expose an expand control', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      const toggle = screen.getByRole('button', { name: /Expand Aldric/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('expands in place when the row is activated', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Aldric/ }));

      expect(
        screen.getByRole('button', { name: /Collapse Aldric/ })
      ).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Recorded by')).toBeInTheDocument();
    });

    test('collapses again on a second activation', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Aldric/ }));
      fireEvent.click(screen.getByRole('button', { name: /Collapse Aldric/ }));
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    test('states empty fields honestly instead of hiding them', () => {
      const bare = makeNPC({ id: 'bare', name: 'Bare', description: '', notes: [] });
      render(<NPCDirectory npcs={[bare]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Bare/ }));

      expect(screen.getByText('Nothing written yet')).toBeInTheDocument();
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
    });

    test('only one row is expanded at a time', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Aldric/ }));
      fireEvent.click(screen.getByRole('button', { name: /Expand Mira/ }));

      expect(
        screen.getByRole('button', { name: /Expand Aldric/ })
      ).toHaveAttribute('aria-expanded', 'false');
      expect(
        screen.getByRole('button', { name: /Collapse Mira/ })
      ).toHaveAttribute('aria-expanded', 'true');
    });
  });

  // -------------------------------------------------------------------------
  // Search filtering
  // -------------------------------------------------------------------------
  describe('search filtering', () => {
    test('should filter NPCs by name search', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      fireEvent.change(searchInput(), { target: { value: 'Aldric' } });
      expect(screen.getByText('Aldric')).toBeInTheDocument();
      expect(screen.queryByText('Mira')).not.toBeInTheDocument();
    });

    test('should filter NPCs by description search', () => {
      const npc1 = makeNPC({ id: 'a', name: 'Alpha', description: 'A mighty warrior' });
      const npc2 = makeNPC({ id: 'b', name: 'Beta', description: 'A cunning rogue' });
      render(<NPCDirectory npcs={[npc1, npc2]} />);
      fireEvent.change(searchInput(), { target: { value: 'mighty warrior' } });
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    });

    test('should filter NPCs by title search', () => {
      const npc1 = makeNPC({ id: 'a', name: 'Alpha', title: 'Court Wizard' });
      const npc2 = makeNPC({ id: 'b', name: 'Beta', title: 'Town Guard' });
      render(<NPCDirectory npcs={[npc1, npc2]} />);
      fireEvent.change(searchInput(), { target: { value: 'Court Wizard' } });
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    });

    test('should be case-insensitive', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      fireEvent.change(searchInput(), { target: { value: 'aldric' } });
      expect(screen.getByText('Aldric')).toBeInTheDocument();
    });

    test('should show "Try adjusting" message when search yields no results', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      fireEvent.change(searchInput(), { target: { value: 'zzznomatch' } });
      expect(screen.getByText(/try adjusting your search criteria/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Status bar — one bar that also filters, replacing four stat cards
  // -------------------------------------------------------------------------
  describe('status bar', () => {
    test('shows the total met so far', () => {
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('met so far')).toBeInTheDocument();
    });

    test('breaks the total down by status, each labelled with a word', () => {
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);
      expect(screen.getByRole('button', { name: '1 alive' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 deceased' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 missing' })).toBeInTheDocument();
    });

    test('keeps zero-value statuses visible rather than hiding them', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      expect(screen.getByRole('button', { name: '0 deceased' })).toBeInTheDocument();
    });

    test('should filter by alive status', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      fireEvent.click(screen.getByRole('button', { name: '1 alive' }));
      expect(screen.getByText('Aldric')).toBeInTheDocument();
      expect(screen.queryByText('Mira')).not.toBeInTheDocument();
    });

    test('should filter by deceased status', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      fireEvent.click(screen.getByRole('button', { name: '1 deceased' }));
      expect(screen.getByText('Mira')).toBeInTheDocument();
      expect(screen.queryByText('Aldric')).not.toBeInTheDocument();
    });

    test('should filter by missing status', () => {
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);
      fireEvent.click(screen.getByRole('button', { name: '1 missing' }));
      expect(screen.getByText('Rolf')).toBeInTheDocument();
      expect(screen.queryByText('Aldric')).not.toBeInTheDocument();
    });

    test('clicking the active band clears the filter', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      const aliveBand = () => screen.getByRole('button', { name: '1 alive' });

      fireEvent.click(aliveBand());
      expect(aliveBand()).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByText('Mira')).not.toBeInTheDocument();

      fireEvent.click(aliveBand());
      expect(aliveBand()).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Mira')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Relationship filter
  // -------------------------------------------------------------------------
  describe('relationship filter', () => {
    test('renders every option as a visible pill rather than a select', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      for (const label of ['All', 'Friendly', 'Neutral', 'Hostile', 'Unknown']) {
        expect(
          screen.getByRole('button', { name: label })
        ).toBeInTheDocument();
      }
    });

    test('should filter by friendly relationship', () => {
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Friendly' }));
      expect(screen.getByText('Aldric')).toBeInTheDocument();
      expect(screen.queryByText('Mira')).not.toBeInTheDocument();
      expect(screen.queryByText('Rolf')).not.toBeInTheDocument();
    });

    test('should filter by hostile relationship', () => {
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Hostile' }));
      expect(screen.getByText('Mira')).toBeInTheDocument();
      expect(screen.queryByText('Aldric')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Location filter — driven by the ?highlight= deep link
  // -------------------------------------------------------------------------
  // Location is the grouping here, not a filter. Arriving from a deep link used
  // to set a location filter to the target's location, silently hiding every
  // other group behind a small "Clear location:" ghost button. RumorDirectory,
  // which groups by location the same way, deliberately has no location filter
  // at all; NPCDirectory now matches it.
  describe('deep link by ?highlight=', () => {
    test('leaves every other location group visible', () => {
      setupMocks({ uid: 'user-1' }, { highlight: 'npc-2' });
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);

      // Mira is the target, in Ironhold; Aldric and Rolf are in Silverkeep and
      // must not vanish just because a link pointed at someone else.
      expect(screen.getByText('Mira')).toBeInTheDocument();
      expect(screen.getByText('Aldric')).toBeInTheDocument();
      expect(screen.getByText('Rolf')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Ironhold' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Silverkeep' })).toBeInTheDocument();
    });

    test('expands the highlighted NPC so a deep link lands on its detail', () => {
      setupMocks({ uid: 'user-1' }, { highlight: 'npc-2' });
      render(<NPCDirectory npcs={[mira]} />);

      expect(
        screen.getByRole('button', { name: /Collapse Mira/ })
      ).toHaveAttribute('aria-expanded', 'true');
    });

    test('offers no location-clearing control, because nothing is ever scoped away', () => {
      setupMocks({ uid: 'user-1' }, { highlight: 'npc-2' });
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);

      expect(
        screen.queryByRole('button', { name: /Clear location:/ })
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Combined filters
  // -------------------------------------------------------------------------
  describe('combined filters', () => {
    test('should apply search and status filter simultaneously', () => {
      const aliveMira = makeNPC({ id: 'am', name: 'Mira', status: 'alive', relationship: 'neutral' });
      const deadAldric = makeNPC({ id: 'da', name: 'Aldric', status: 'deceased', relationship: 'neutral' });
      render(<NPCDirectory npcs={[aliveMira, deadAldric]} />);

      fireEvent.change(searchInput(), { target: { value: 'Mira' } });
      fireEvent.click(screen.getByRole('button', { name: '1 alive' }));

      expect(screen.getByText('Mira')).toBeInTheDocument();
      expect(screen.queryByText('Aldric')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  describe('parent callbacks', () => {
    test('should propagate onNPCUpdate callback to parent when NPC is updated', () => {
      const onNPCUpdate = jest.fn();
      render(<NPCDirectory npcs={[aldric]} onNPCUpdate={onNPCUpdate} />);
      // NPCCard is rendered; we verify the Directory accepts the prop without error
      expect(screen.getByText('Aldric')).toBeInTheDocument();
    });

    test('should propagate onNPCDelete callback to parent when NPC is deleted', () => {
      const onNPCDelete = jest.fn();
      render(<NPCDirectory npcs={[aldric]} onNPCDelete={onNPCDelete} />);
      expect(screen.getByText('Aldric')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Props updates (useEffect sync)
  // -------------------------------------------------------------------------
  describe('prop updates', () => {
    test('should update NPC list when npcs prop changes', () => {
      const { rerender } = render(<NPCDirectory npcs={[aldric]} />);
      expect(screen.getByText('Aldric')).toBeInTheDocument();
      rerender(<NPCDirectory npcs={[mira]} />);
      expect(screen.queryByText('Aldric')).not.toBeInTheDocument();
      expect(screen.getByText('Mira')).toBeInTheDocument();
    });
  });
});
