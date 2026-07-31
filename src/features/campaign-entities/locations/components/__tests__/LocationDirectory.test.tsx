// src/features/campaign-entities/locations/components/__tests__/LocationDirectory.test.tsx

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import LocationDirectory from '../LocationDirectory';
import { Location } from '../../types';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

// LocationDirectory uses useFirebaseData for real-time updates
jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: jest.fn(() => ({ data: [] })),
}));

jest.mock('shared/context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../npcs/context/NPCContext', () => ({
  useNPCs: jest.fn(() => ({ getNPCById: jest.fn(() => undefined) })),
}));
jest.mock('../../../quests/context/QuestContext', () => ({
  useQuests: jest.fn(() => ({ getQuestById: jest.fn(() => undefined) })),
}));

jest.mock('../../context/LocationContext', () => ({
  useLocations: jest.fn(() => ({
    deleteLocation: jest.fn(),
  })),
}));

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'user-1' } })),
  useFirebase: jest.fn(() => ({ activeGroupId: 'group-1' })),
}));

jest.mock('shared/utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(() => ''),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));
jest.mock('core/services/firebase', () => ({ default: {} }));

const { useNavigation } = require('shared/context/NavigationContext');
const { useLocations } = require('../../context/LocationContext');
const { useFirebaseData } = require('shared/hooks/useFirebaseData');
const { useNPCs } = require('../../../npcs/context/NPCContext');
const { useQuests } = require('../../../quests/context/QuestContext');
const { useAuth } = require('@/features/user-management');

const mockNavigateToPage = jest.fn();
const mockCreatePath = jest.fn(
  (path: string, _p: unknown, query?: Record<string, string>) =>
    query ? `${path}?${new URLSearchParams(query).toString()}` : path
);

function setupMocks(
  user: { uid: string } | null = { uid: 'user-1' },
  queryParams: Record<string, string> = {}
) {
  (useFirebaseData as jest.Mock).mockReturnValue({ data: [] });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    createPath: mockCreatePath,
    getCurrentQueryParams: jest.fn(() => queryParams),
  });
  (useLocations as jest.Mock).mockReturnValue({
    deleteLocation: jest.fn().mockResolvedValue(undefined),
  });
  (useNPCs as jest.Mock).mockReturnValue({ getNPCById: jest.fn(() => undefined) });
  (useQuests as jest.Mock).mockReturnValue({ getQuestById: jest.fn(() => undefined) });
  (useAuth as jest.Mock).mockReturnValue({ user });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeLocation(id: string, name: string, overrides: Partial<Location> = {}): Location {
  return {
    id,
    name,
    type: 'city',
    status: 'known',
    description: `Description for ${name}`,
    features: [],
    connectedNPCs: [],
    relatedQuests: [],
    notes: [],
    tags: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

/** The roster's search box. */
const searchInput = () => screen.getByPlaceholderText('Search locations...');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LocationDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('should render loading message when isLoading is true', () => {
      render(<LocationDirectory locations={[]} isLoading={true} />);
      expect(screen.getByText('Loading locations...')).toBeInTheDocument();
    });

    test('should not render search bar when isLoading is true', () => {
      render(<LocationDirectory locations={[]} isLoading={true} />);
      expect(screen.queryByPlaceholderText('Search locations...')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    test('should render "No Locations Found" when no locations provided', () => {
      render(<LocationDirectory locations={[]} />);
      expect(screen.getByText('No Locations Found')).toBeInTheDocument();
    });

    test('should show empty state message', () => {
      render(<LocationDirectory locations={[]} />);
      expect(screen.getByText('There are no locations to display')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Rendering locations
  // -------------------------------------------------------------------------
  describe('rendering locations', () => {
    test('should render location name', () => {
      const locations = [makeLocation('loc-1', 'Silverkeep')];
      render(<LocationDirectory locations={locations} />);
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
    });

    test('should render multiple locations', () => {
      const locations = [
        makeLocation('loc-1', 'Silverkeep'),
        makeLocation('loc-2', 'Ironhold'),
      ];
      render(<LocationDirectory locations={locations} />);
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.getByText('Ironhold')).toBeInTheDocument();
    });

    test('should render search input', () => {
      render(<LocationDirectory locations={[]} />);
      expect(searchInput()).toBeInTheDocument();
    });

    test('renders type filters as visible pills rather than a select', () => {
      render(<LocationDirectory locations={[]} />);
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      for (const label of ['All', 'Regions', 'Cities', 'Towns', 'Villages', 'Dungeons', 'Landmarks', 'Buildings', 'POIs']) {
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
      }
    });

    test('renders the group name as a real heading, not a control', () => {
      const locations = [makeLocation('loc-1', 'Silverkeep')];
      render(<LocationDirectory locations={locations} />);
      expect(screen.getByRole('heading', { name: 'Locations' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Locations' })).not.toBeInTheDocument();
    });

    test('shows each row as one dense row carrying status, type and connection counts', () => {
      const npcId = 'npc-1';
      (useNPCs as jest.Mock).mockReturnValue({
        getNPCById: jest.fn(() => ({ id: npcId, name: 'Aldric', relationship: 'friendly' })),
      });
      const location = makeLocation('loc-1', 'Silverkeep', {
        type: 'city',
        status: 'visited',
        connectedNPCs: [npcId],
        relatedQuests: ['q-1'],
      });
      render(<LocationDirectory locations={[location]} />);

      const row = within(screen.getByRole('button', { name: /Expand Silverkeep/ }));
      expect(row.getByText('Silverkeep')).toBeInTheDocument();
      expect(row.getByText('Visited')).toBeInTheDocument();
      expect(row.getByText('City')).toBeInTheDocument();
      expect(row.getByText('1 NPCs · 1 Quests')).toBeInTheDocument();
    });

    test('shows a placeholder for connections when a location has none', () => {
      const location = makeLocation('loc-1', 'Silverkeep');
      render(<LocationDirectory locations={[location]} />);
      const row = within(screen.getByRole('button', { name: /Expand Silverkeep/ }));
      expect(row.getByText('—')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Row expansion
  // -------------------------------------------------------------------------
  describe('row expansion', () => {
    test('rows start collapsed and expose an expand control', () => {
      render(<LocationDirectory locations={[makeLocation('loc-1', 'Silverkeep')]} />);
      const toggle = screen.getByRole('button', { name: /Expand Silverkeep/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('expands in place when the row is activated', () => {
      render(<LocationDirectory locations={[makeLocation('loc-1', 'Silverkeep')]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));

      expect(
        screen.getByRole('button', { name: /Collapse Silverkeep/ })
      ).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Recorded by')).toBeInTheDocument();
    });

    test('collapses again on a second activation', () => {
      render(<LocationDirectory locations={[makeLocation('loc-1', 'Silverkeep')]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));
      fireEvent.click(screen.getByRole('button', { name: /Collapse Silverkeep/ }));
      expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    test('each row toggles independently', () => {
      render(
        <LocationDirectory
          locations={[makeLocation('loc-1', 'Silverkeep'), makeLocation('loc-2', 'Ironhold')]}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));

      expect(
        screen.getByRole('button', { name: /Collapse Silverkeep/ })
      ).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen.getByRole('button', { name: /Expand Ironhold/ })
      ).toHaveAttribute('aria-expanded', 'false');
    });

    test('states empty fields honestly instead of hiding them', () => {
      const bare = makeLocation('bare', 'Bare Rock', {
        description: '',
        features: [],
        notes: [],
        tags: [],
        connectedNPCs: [],
        relatedQuests: [],
        lastVisited: undefined,
        createdByUsername: undefined,
      });
      render(<LocationDirectory locations={[bare]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Bare Rock/ }));

      expect(screen.getByText('Nothing written yet')).toBeInTheDocument();
      expect(screen.getByText('None recorded')).toBeInTheDocument();
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
      expect(screen.getByText('No tags yet')).toBeInTheDocument();
      expect(screen.getByText('Not recorded')).toBeInTheDocument();
      expect(screen.getByText('No NPCs linked')).toBeInTheDocument();
      expect(screen.getByText('No quests linked')).toBeInTheDocument();
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    test('shows edit and delete controls when a user is signed in', () => {
      render(<LocationDirectory locations={[makeLocation('loc-1', 'Silverkeep')]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    });

    test('hides edit and delete controls when signed out', () => {
      setupMocks(null);
      render(<LocationDirectory locations={[makeLocation('loc-1', 'Silverkeep')]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    test('navigates to the edit page when Edit is clicked', () => {
      render(<LocationDirectory locations={[makeLocation('loc-1', 'Silverkeep')]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/locations/edit/loc-1');
    });

    test('calls deleteLocation when Delete is clicked', () => {
      const deleteLocation = jest.fn().mockResolvedValue(undefined);
      (useLocations as jest.Mock).mockReturnValue({ deleteLocation });
      render(<LocationDirectory locations={[makeLocation('loc-1', 'Silverkeep')]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(deleteLocation).toHaveBeenCalledWith('loc-1');
    });

    test('navigates to an NPC when a connected NPC is clicked', () => {
      (useNPCs as jest.Mock).mockReturnValue({
        getNPCById: jest.fn(() => ({ id: 'npc-1', name: 'Aldric', relationship: 'friendly' })),
      });
      render(
        <LocationDirectory
          locations={[makeLocation('loc-1', 'Silverkeep', { connectedNPCs: ['npc-1'] })]}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));
      fireEvent.click(screen.getByRole('button', { name: /Aldric/ }));
      expect(mockNavigateToPage).toHaveBeenCalled();
    });

    test('navigates to a quest when a related quest is clicked', () => {
      (useQuests as jest.Mock).mockReturnValue({
        getQuestById: jest.fn(() => ({ id: 'q-1', title: 'Find the Amulet', status: 'active' })),
      });
      render(
        <LocationDirectory
          locations={[makeLocation('loc-1', 'Silverkeep', { relatedQuests: ['q-1'] })]}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));
      fireEvent.click(screen.getByRole('button', { name: /Find the Amulet/ }));
      expect(mockNavigateToPage).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Search filtering
  // -------------------------------------------------------------------------
  describe('search filtering', () => {
    test('should filter locations by name when searching', () => {
      const locations = [
        makeLocation('loc-1', 'Silverkeep'),
        makeLocation('loc-2', 'Ironhold'),
      ];
      render(<LocationDirectory locations={locations} />);
      fireEvent.change(searchInput(), { target: { value: 'Silver' } });
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.queryByText('Ironhold')).not.toBeInTheDocument();
    });

    test('should filter locations by description', () => {
      const locations = [
        makeLocation('loc-1', 'Silverkeep', { description: 'A mighty fortress' }),
        makeLocation('loc-2', 'Ironhold', { description: 'A quiet mining town' }),
      ];
      render(<LocationDirectory locations={locations} />);
      fireEvent.change(searchInput(), { target: { value: 'mighty fortress' } });
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.queryByText('Ironhold')).not.toBeInTheDocument();
    });

    test('should be case-insensitive', () => {
      render(<LocationDirectory locations={[makeLocation('loc-1', 'Silverkeep')]} />);
      fireEvent.change(searchInput(), { target: { value: 'silverkeep' } });
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
    });

    test('should show empty state when search matches nothing', () => {
      const locations = [makeLocation('loc-1', 'Silverkeep')];
      render(<LocationDirectory locations={locations} />);
      fireEvent.change(searchInput(), { target: { value: 'zzznomatch' } });
      expect(screen.getByText('No Locations Found')).toBeInTheDocument();
    });

    test('should show search-specific empty message when no results', () => {
      const locations = [makeLocation('loc-1', 'Silverkeep')];
      render(<LocationDirectory locations={locations} />);
      fireEvent.change(searchInput(), { target: { value: 'zzznomatch' } });
      expect(screen.getByText('No locations match your search criteria')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Type filter
  // -------------------------------------------------------------------------
  describe('type filter', () => {
    test('should filter locations by type', () => {
      const locations = [
        makeLocation('loc-1', 'Silverkeep', { type: 'city' }),
        makeLocation('loc-2', 'Dark Cave', { type: 'dungeon' }),
      ];
      render(<LocationDirectory locations={locations} />);
      fireEvent.click(screen.getByRole('button', { name: 'Cities' }));
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.queryByText('Dark Cave')).not.toBeInTheDocument();
    });

    test('clicking "All" after a type filter restores every location', () => {
      const locations = [
        makeLocation('loc-1', 'Silverkeep', { type: 'city' }),
        makeLocation('loc-2', 'Dark Cave', { type: 'dungeon' }),
      ];
      render(<LocationDirectory locations={locations} />);
      fireEvent.click(screen.getByRole('button', { name: 'Dungeons' }));
      expect(screen.queryByText('Silverkeep')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'All' }));
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.getByText('Dark Cave')).toBeInTheDocument();
    });

    test('marks the active pill as pressed', () => {
      render(<LocationDirectory locations={[makeLocation('loc-1', 'Silverkeep', { type: 'city' })]} />);
      const cities = screen.getByRole('button', { name: 'Cities' });
      expect(cities).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(cities);
      expect(cities).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // -------------------------------------------------------------------------
  // Status bar — one bar that also filters, replacing the "All Status" dropdown
  // -------------------------------------------------------------------------
  describe('status bar', () => {
    const known = makeLocation('loc-1', 'Silverkeep', { status: 'known' });
    const explored = makeLocation('loc-2', 'Ironhold', { status: 'explored' });
    const visited = makeLocation('loc-3', 'Deephaven', { status: 'visited' });

    test('shows the total charted so far', () => {
      render(<LocationDirectory locations={[known, explored, visited]} />);
      // Scoped to the h4 total, since the "Locations" group heading's count
      // badge can render the same digit (3 locations, 3 charted).
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('3');
      expect(screen.getByText('charted so far')).toBeInTheDocument();
    });

    test('breaks the total down by status, each labelled with a word', () => {
      render(<LocationDirectory locations={[known, explored, visited]} />);
      expect(screen.getByRole('button', { name: '1 known' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 explored' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 visited' })).toBeInTheDocument();
    });

    test('keeps zero-value statuses visible rather than hiding them', () => {
      render(<LocationDirectory locations={[known]} />);
      expect(screen.getByRole('button', { name: '0 explored' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '0 visited' })).toBeInTheDocument();
    });

    test('should filter by known status', () => {
      render(<LocationDirectory locations={[known, explored]} />);
      fireEvent.click(screen.getByRole('button', { name: '1 known' }));
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.queryByText('Ironhold')).not.toBeInTheDocument();
    });

    test('should filter by visited status', () => {
      render(<LocationDirectory locations={[known, explored, visited]} />);
      fireEvent.click(screen.getByRole('button', { name: '1 visited' }));
      expect(screen.getByText('Deephaven')).toBeInTheDocument();
      expect(screen.queryByText('Silverkeep')).not.toBeInTheDocument();
      expect(screen.queryByText('Ironhold')).not.toBeInTheDocument();
    });

    test('clicking the active band clears the filter', () => {
      render(<LocationDirectory locations={[known, explored]} />);
      const knownBand = () => screen.getByRole('button', { name: '1 known' });

      fireEvent.click(knownBand());
      expect(knownBand()).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByText('Ironhold')).not.toBeInTheDocument();

      fireEvent.click(knownBand());
      expect(knownBand()).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Ironhold')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Combined filters
  // -------------------------------------------------------------------------
  describe('combined filters', () => {
    test('should apply search and status filter simultaneously', () => {
      const knownIronhold = makeLocation('loc-1', 'Ironhold', { status: 'known' });
      const exploredSilverkeep = makeLocation('loc-2', 'Silverkeep', { status: 'explored' });
      render(<LocationDirectory locations={[knownIronhold, exploredSilverkeep]} />);

      fireEvent.change(searchInput(), { target: { value: 'Iron' } });
      fireEvent.click(screen.getByRole('button', { name: '1 known' }));

      expect(screen.getByText('Ironhold')).toBeInTheDocument();
      expect(screen.queryByText('Silverkeep')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Hierarchical layout — the main regression risk: flattening parent/child
  // -------------------------------------------------------------------------
  describe('hierarchical layout', () => {
    test('should render parent location', () => {
      const locations = [makeLocation('parent-1', 'Kingdom of Valor')];
      render(<LocationDirectory locations={locations} />);
      expect(screen.getByText('Kingdom of Valor')).toBeInTheDocument();
    });

    test('renders a top-level location without a sub-location count', () => {
      const locations = [makeLocation('parent-1', 'Kingdom of Valor')];
      render(<LocationDirectory locations={locations} />);
      const row = within(screen.getByRole('button', { name: /Expand Kingdom of Valor/ }));
      expect(row.queryByText(/sub-location/)).not.toBeInTheDocument();
    });

    test('advertises how many sub-locations a parent has, singular and plural', () => {
      const parent = makeLocation('parent-1', 'Kingdom of Valor');
      const child = makeLocation('child-1', 'Silverkeep', { parentId: 'parent-1' });
      render(<LocationDirectory locations={[parent, child]} />);
      const row = within(screen.getByRole('button', { name: /Expand Kingdom of Valor/ }));
      expect(row.getByText('1 sub-location')).toBeInTheDocument();
    });

    test('does not render the child until its parent is expanded, then reveals it', () => {
      const parent = makeLocation('parent-1', 'Kingdom of Valor');
      const child = makeLocation('child-1', 'Silverkeep', { parentId: 'parent-1' });
      render(<LocationDirectory locations={[parent, child]} />);

      expect(screen.getByText('Kingdom of Valor')).toBeInTheDocument();
      expect(screen.queryByText('Silverkeep')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Expand Kingdom of Valor/ }));
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
    });

    test('nests the children under their own group heading, naming the parent', () => {
      const parent = makeLocation('parent-1', 'Kingdom of Valor');
      const child = makeLocation('child-1', 'Silverkeep', { parentId: 'parent-1' });
      render(<LocationDirectory locations={[parent, child]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Kingdom of Valor/ }));

      expect(
        screen.getByRole('heading', { name: 'Locations in Kingdom of Valor' })
      ).toBeInTheDocument();
    });

    test('a child can itself be expanded once revealed, independently of its parent', () => {
      const parent = makeLocation('parent-1', 'Kingdom of Valor');
      const child = makeLocation('child-1', 'Silverkeep', { parentId: 'parent-1' });
      render(<LocationDirectory locations={[parent, child]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Kingdom of Valor/ }));
      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));

      expect(
        screen.getByRole('button', { name: /Collapse Silverkeep/ })
      ).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen.getByRole('button', { name: /Collapse Kingdom of Valor/ })
      ).toHaveAttribute('aria-expanded', 'true');
    });

    test('preserves multiple levels of nesting', () => {
      const region = makeLocation('region-1', 'Kingdom of Valor');
      const city = makeLocation('city-1', 'Silverkeep', { parentId: 'region-1' });
      const building = makeLocation('building-1', 'The Rusty Anchor', {
        parentId: 'city-1',
        type: 'building',
      });
      render(<LocationDirectory locations={[region, city, building]} />);

      fireEvent.click(screen.getByRole('button', { name: /Expand Kingdom of Valor/ }));
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.queryByText('The Rusty Anchor')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));
      expect(screen.getByText('The Rusty Anchor')).toBeInTheDocument();
    });

    // REGRESSION TEST for #1414 (previously pinned the defective behaviour;
    // inverted once the bug was fixed — see the tracker entry for history).
    //
    // Root cause was that `locationMatchesFilters`'s `isChild` branch (used by
    // `renderRows` for every nested level whenever the parent's own type already
    // satisfies the type filter — i.e. almost always, since typeFilter defaults
    // to 'all') returned `matchesStatus && matchesSearch` for that node ALONE,
    // without ever falling through to the descendant-match check the non-child
    // branch had. The auto-expand `useEffect`, by contrast, always calls with
    // `isChild=false`, so it correctly marked a two-level-deep match's ancestors
    // for expansion. The result: a middle ancestor was flagged "should be
    // expanded" in state, but `renderRows` filtered that same ancestor OUT of
    // the list it was rendering for its own parent — so the row never appeared,
    // and the deep match it was meant to reveal was unreachable. The fix lets
    // the `isChild` branch fall through to the same descendant check the
    // non-child branch uses, so the two callers agree again.
    test('a search match nested two levels deep is reachable — the connecting ancestor renders and auto-expands', () => {
      const region = makeLocation('region-1', 'Kingdom of Valor');
      const city = makeLocation('city-1', 'Silverkeep', { parentId: 'region-1' });
      const building = makeLocation('building-1', 'The Rusty Anchor', {
        parentId: 'city-1',
        type: 'building',
      });
      render(<LocationDirectory locations={[region, city, building]} />);

      fireEvent.change(searchInput(), { target: { value: 'Rusty Anchor' } });

      // The top-level ancestor is found and auto-expands.
      expect(
        screen.getByRole('button', { name: /Collapse Kingdom of Valor/ })
      ).toHaveAttribute('aria-expanded', 'true');

      // The connecting middle ancestor now renders (rather than being filtered
      // out of its own parent's list) and is itself auto-expanded...
      expect(
        screen.getByRole('button', { name: /Collapse Silverkeep/ })
      ).toHaveAttribute('aria-expanded', 'true');

      // ...which reveals the actual match.
      expect(screen.getByText('The Rusty Anchor')).toBeInTheDocument();
    });

    test('a search match nested three levels deep is reachable through every connecting ancestor', () => {
      const region = makeLocation('region-1', 'Kingdom of Valor');
      const city = makeLocation('city-1', 'Silverkeep', { parentId: 'region-1' });
      const district = makeLocation('district-1', 'Old Town', {
        parentId: 'city-1',
        type: 'landmark',
      });
      const building = makeLocation('building-1', 'The Rusty Anchor', {
        parentId: 'district-1',
        type: 'building',
      });
      render(
        <LocationDirectory locations={[region, city, district, building]} />
      );

      fireEvent.change(searchInput(), { target: { value: 'Rusty Anchor' } });

      // Every connecting ancestor down the three-level chain auto-expands...
      expect(
        screen.getByRole('button', { name: /Collapse Kingdom of Valor/ })
      ).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen.getByRole('button', { name: /Collapse Silverkeep/ })
      ).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen.getByRole('button', { name: /Collapse Old Town/ })
      ).toHaveAttribute('aria-expanded', 'true');

      // ...all the way down to the actual match.
      expect(screen.getByText('The Rusty Anchor')).toBeInTheDocument();
    });

    test('every location auto-expanded by a filter is actually rendered in the DOM (expander and renderer agree)', () => {
      // A 3-level chain where only the leaf matches the status filter, mirroring
      // the #1414 reproduction but asserting the general invariant: whatever
      // the auto-expand effect decides to expand must be a row that renderRows
      // actually drew, not one that was filtered out of its own parent's list.
      const region = makeLocation('region-1', 'Kingdom of Valor', { status: 'known' });
      const city = makeLocation('city-1', 'Silverkeep', {
        parentId: 'region-1',
        status: 'known',
      });
      const building = makeLocation('building-1', 'The Rusty Anchor', {
        parentId: 'city-1',
        type: 'building',
        status: 'visited',
      });
      render(<LocationDirectory locations={[region, city, building]} />);

      fireEvent.click(screen.getByRole('button', { name: '1 visited' }));

      // Every ancestor that ends up expanded must have a corresponding
      // "Collapse <name>" toggle actually present in the DOM — i.e. it was
      // rendered by renderRows, not merely flagged in expandedLocations state
      // with nothing to show for it.
      expect(
        screen.getByRole('button', { name: /Collapse Kingdom of Valor/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Collapse Silverkeep/ })
      ).toBeInTheDocument();

      // And the leaf match that motivated the expansion is itself visible.
      expect(screen.getByText('The Rusty Anchor')).toBeInTheDocument();
    });

    test('a status match nested under a parent keeps the parent visible via descendant match', () => {
      const parent = makeLocation('parent-1', 'Kingdom of Valor', { status: 'known' });
      const child = makeLocation('child-1', 'Silverkeep', {
        parentId: 'parent-1',
        status: 'visited',
      });
      render(<LocationDirectory locations={[parent, child]} />);

      fireEvent.click(screen.getByRole('button', { name: '1 visited' }));

      // The parent itself is 'known', not 'visited', but stays visible because its
      // child matches — and gets auto-expanded to reveal that child.
      expect(screen.getByText('Kingdom of Valor')).toBeInTheDocument();
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
    });

    test('a child keeps showing under a parent that matches the active type filter, even if its own type differs', () => {
      const parentCity = makeLocation('parent-1', 'Silverkeep', { type: 'city' });
      const childBuilding = makeLocation('child-1', 'The Rusty Anchor', {
        parentId: 'parent-1',
        type: 'building',
      });
      render(<LocationDirectory locations={[parentCity, childBuilding]} />);

      fireEvent.click(screen.getByRole('button', { name: 'Cities' }));
      fireEvent.click(screen.getByRole('button', { name: /Expand Silverkeep/ }));

      expect(screen.getByText('The Rusty Anchor')).toBeInTheDocument();
    });

    test('expands a highlighted location and its ancestors from a deep link', () => {
      const parent = makeLocation('parent-1', 'Kingdom of Valor');
      const child = makeLocation('child-1', 'Silverkeep', { parentId: 'parent-1' });
      setupMocks({ uid: 'user-1' }, { highlight: 'child-1' });
      render(<LocationDirectory locations={[parent, child]} />);

      expect(
        screen.getByRole('button', { name: /Collapse Kingdom of Valor/ })
      ).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen.getByRole('button', { name: /Collapse Silverkeep/ })
      ).toHaveAttribute('aria-expanded', 'true');
    });

    // ------------------------------------------------------------------
    // Unresolvable parentId ("orphans") — a dangling parentId (e.g. #303,
    // a parent renamed or deleted out from under a child) used to leave
    // the location bucketed under a hierarchy key nobody ever visits: it
    // rendered nowhere, wasn't counted in any group, and didn't trigger
    // the empty state, while still counting toward the status bar's total.
    // ------------------------------------------------------------------
    test('a location whose parentId is unresolvable renders under "Unplaced"', () => {
      const orphan = makeLocation('orphan-1', 'Lost Outpost', { parentId: 'nonexistent-parent' });
      render(<LocationDirectory locations={[orphan]} />);

      expect(screen.getByRole('heading', { name: 'Unplaced' })).toBeInTheDocument();
      expect(screen.getByText('Lost Outpost')).toBeInTheDocument();
    });

    test('an orphan\'s own children still nest under it when it is expanded', () => {
      const orphan = makeLocation('orphan-1', 'Lost Outpost', { parentId: 'nonexistent-parent' });
      const child = makeLocation('child-1', 'Cellar', { parentId: 'orphan-1' });
      render(<LocationDirectory locations={[orphan, child]} />);

      expect(screen.queryByText('Cellar')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Expand Lost Outpost/ }));

      expect(screen.getByText('Cellar')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Locations in Lost Outpost' })
      ).toBeInTheDocument();
    });

    test('root rows and unplaced rows together account for every location', () => {
      const rootLoc = makeLocation('root-1', 'Silverkeep');
      const orphan = makeLocation('orphan-1', 'Lost Outpost', { parentId: 'nonexistent-parent' });
      render(<LocationDirectory locations={[rootLoc, orphan]} />);

      expect(screen.getByRole('heading', { name: 'Locations' })).toBeInTheDocument();
      const locationsGroup = screen.getByRole('heading', { name: 'Locations' }).closest('section');
      expect(within(locationsGroup as HTMLElement).getByText('1')).toBeInTheDocument();

      const unplacedGroup = screen.getByRole('heading', { name: 'Unplaced' }).closest('section');
      expect(within(unplacedGroup as HTMLElement).getByText('1')).toBeInTheDocument();

      // Every location supplied is visible somewhere — none silently dropped.
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.getByText('Lost Outpost')).toBeInTheDocument();

      // The status bar's total still reflects both locations combined.
      expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('2');
    });

    test('the empty state still appears when there are genuinely no locations', () => {
      render(<LocationDirectory locations={[]} />);
      expect(screen.getByText('No Locations Found')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Unplaced' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Locations' })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Prop updates
  // -------------------------------------------------------------------------
  describe('prop updates', () => {
    test('should update location list when locations prop changes', () => {
      const { rerender } = render(
        <LocationDirectory locations={[makeLocation('loc-1', 'Silverkeep')]} />
      );
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();

      rerender(<LocationDirectory locations={[makeLocation('loc-2', 'Ironhold')]} />);
      expect(screen.queryByText('Silverkeep')).not.toBeInTheDocument();
      expect(screen.getByText('Ironhold')).toBeInTheDocument();
    });
  });
});
