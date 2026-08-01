// src/features/campaign-entities/rumors/components/__tests__/RumorDirectory.test.tsx

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import RumorDirectory from '../RumorDirectory';
import { Rumor, RumorStatus, SourceType } from '../../types';

// ---------------------------------------------------------------------------
// Mock Dialog to render inline — RumorBatchActions mounts CombineRumorsDialog
// and ConvertToQuestDialog unconditionally (gated on `open`), and the real
// Dialog uses a portal that jsdom doesn't need to exercise for these tests.
// ---------------------------------------------------------------------------
jest.mock('../../../../../core/components/Dialog', () => {
  const MockDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    title?: string;
    children?: React.ReactNode;
  }> = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
      <div data-testid="mock-dialog">
        {title && <h3>{title}</h3>}
        <button onClick={onClose} aria-label="Close dialog">X</button>
        {children}
      </div>
    );
  };
  return MockDialog;
});

// ---------------------------------------------------------------------------
// Polyfill crypto.randomUUID for JSDOM (used by ConvertToQuestDialog's
// initial state, which runs even while the dialog is closed)
// ---------------------------------------------------------------------------
if (!crypto.randomUUID) {
  Object.defineProperty(crypto, 'randomUUID', {
    value: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
}

// ---------------------------------------------------------------------------
// Mock all context dependencies used by RumorDirectory
// ---------------------------------------------------------------------------

jest.mock('shared/hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'user-1' } })),
  useFirebase: jest.fn(() => ({ activeGroupId: 'group-1' })),
}));

jest.mock('../../context/RumorContext', () => ({
  useRumors: jest.fn(),
}));

jest.mock('../../../npcs/context/NPCContext', () => ({
  useNPCs: jest.fn(() => ({ getNPCById: jest.fn(() => undefined) })),
}));

// `locations` feeds the group-heading resolution added for #1412. These tests
// set `rumor.location` to display names and supply no location records, which
// resolveLocationName passes through verbatim.
jest.mock('../../../locations/context/LocationContext', () => ({
  useLocations: jest.fn(() => ({
    locations: [],
    getLocationById: jest.fn(() => undefined),
  })),
}));

jest.mock('shared/utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(() => ''),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));

jest.mock('core/services/firebase', () => ({ default: {} }));

const mockNavigateToPage = jest.fn();
const mockCreatePath = jest.fn(
  (path: string, _p: unknown, query?: Record<string, string>) =>
    query ? `${path}?${new URLSearchParams(query).toString()}` : path
);
const mockDeleteRumor = jest.fn().mockResolvedValue(undefined);
const mockUpdateRumorStatus = jest.fn().mockResolvedValue(undefined);
const mockCombineRumors = jest.fn().mockResolvedValue('new-rumor-id');
const mockConvertToQuest = jest.fn().mockResolvedValue('quest-id');

const { useNavigation } = require('shared/hooks/useNavigation');
const { useRumors } = require('../../context/RumorContext');
const { useAuth } = require('@/features/user-management');

function setupMocks(
  user: { uid: string } | null = { uid: 'user-1' },
  queryParams: Record<string, string> = {},
  rumorList: Rumor[] = []
) {
  (useAuth as jest.Mock).mockReturnValue({ user });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    createPath: mockCreatePath,
    getCurrentQueryParams: jest.fn(() => queryParams),
  });
  (useRumors as jest.Mock).mockReturnValue({
    rumors: rumorList,
    deleteRumor: mockDeleteRumor,
    updateRumorStatus: mockUpdateRumorStatus,
    combineRumors: mockCombineRumors,
    convertToQuest: mockConvertToQuest,
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeRumor(overrides: Partial<Rumor> = {}): Rumor {
  return {
    id: `rumor-${Math.random().toString(36).slice(2)}`,
    title: 'Test Rumor',
    content: 'A test rumor about something.',
    status: 'unconfirmed' as RumorStatus,
    sourceType: 'tavern' as SourceType,
    sourceName: 'The Rusty Flagon',
    location: 'Silverkeep',
    relatedNPCs: [],
    relatedLocations: [],
    notes: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

const r1 = makeRumor({ id: 'r1', title: 'Dragon spotted', status: 'confirmed', sourceType: 'npc', sourceName: 'Aldric', location: 'Silverkeep' });
const r2 = makeRumor({ id: 'r2', title: 'Missing merchant', status: 'unconfirmed', sourceType: 'tavern', sourceName: 'The Flagon', location: 'Ironhold' });
const r3 = makeRumor({ id: 'r3', title: 'Treasure map', status: 'false', sourceType: 'notice', sourceName: 'Town board', location: 'Silverkeep' });

/** The roster's search box. */
const searchInput = () => screen.getByPlaceholderText(/search rumors/i);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RumorDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('should render loading indicator when isLoading is true', () => {
      render(<RumorDirectory rumors={[]} isLoading={true} />);
      expect(screen.getByText(/loading rumors/i)).toBeInTheDocument();
    });

    test('should not render search box when isLoading is true', () => {
      render(<RumorDirectory rumors={[]} isLoading={true} />);
      expect(screen.queryByPlaceholderText(/search rumors/i)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    test('should show "No Rumors Found" when rumors array is empty', () => {
      render(<RumorDirectory rumors={[]} />);
      expect(screen.getByText('No Rumors Found')).toBeInTheDocument();
    });

    test('should show "add your first rumor" message when list is empty', () => {
      render(<RumorDirectory rumors={[]} />);
      expect(screen.getByText(/add your first rumor to get started/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Rumor rendering / grouping
  // -------------------------------------------------------------------------
  describe('rumor rendering', () => {
    test('should render rumor titles', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
    });

    test('should render all provided rumors', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.getByText('Treasure map')).toBeInTheDocument();
    });

    test('should group rumors by location', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      expect(screen.getByRole('heading', { name: 'Silverkeep' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Ironhold' })).toBeInTheDocument();
    });

    test('should group rumors with no location under "Location unknown"', () => {
      const unlocated = makeRumor({ id: 'r-nowhere', title: 'Odd noises', location: undefined });
      render(<RumorDirectory rumors={[unlocated]} />);
      expect(screen.getByText('Location unknown')).toBeInTheDocument();
    });

    test('renders the group name as a heading, not a control', () => {
      render(<RumorDirectory rumors={[r1]} />);
      expect(screen.getByRole('heading', { name: 'Silverkeep' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Silverkeep' })).not.toBeInTheDocument();
    });

    test('shows each row as one dense row carrying status and source', () => {
      render(<RumorDirectory rumors={[r1]} />);
      // Scoped to the row, since "Confirmed" also labels a status-bar segment.
      const row = within(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      expect(row.getByText('Dragon spotted')).toBeInTheDocument();
      expect(row.getByText('Confirmed')).toBeInTheDocument();
      expect(row.getByText('NPC')).toBeInTheDocument();
      expect(row.getByText('Aldric')).toBeInTheDocument();
    });

    test('labels status with a word, not only a colour', () => {
      render(<RumorDirectory rumors={[r2]} />);
      const row = within(screen.getByRole('button', { name: /Expand Missing merchant/ }));
      expect(row.getByText('Unconfirmed')).toBeInTheDocument();
    });

    test('surfaces convertedToQuestId as a quest indicator on the row', () => {
      const converted = makeRumor({ id: 'r-quest', title: 'Bandit trouble', convertedToQuestId: 'quest-1' });
      render(<RumorDirectory rumors={[converted]} />);
      const row = within(screen.getByRole('button', { name: /Expand Bandit trouble/ }));
      expect(row.getByText('Converted to quest')).toBeInTheDocument();
    });

    test('shows a plain dash on the row when a rumor was not converted', () => {
      render(<RumorDirectory rumors={[r1]} />);
      const row = within(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      expect(row.getByText('—')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Row expansion
  // -------------------------------------------------------------------------
  describe('row expansion', () => {
    test('rows start collapsed and expose an expand control', () => {
      render(<RumorDirectory rumors={[r1]} />);
      const toggle = screen.getByRole('button', { name: /Expand Dragon spotted/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    test('expands in place when the row is activated', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));

      expect(
        screen.getByRole('button', { name: /Collapse Dragon spotted/ })
      ).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Recorded by')).toBeInTheDocument();
    });

    test('collapses again on a second activation', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      fireEvent.click(screen.getByRole('button', { name: /Collapse Dragon spotted/ }));
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    test('only one row is expanded at a time', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      fireEvent.click(screen.getByRole('button', { name: /Expand Missing merchant/ }));

      expect(
        screen.getByRole('button', { name: /Expand Dragon spotted/ })
      ).toHaveAttribute('aria-expanded', 'false');
      expect(
        screen.getByRole('button', { name: /Collapse Missing merchant/ })
      ).toHaveAttribute('aria-expanded', 'true');
    });

    test('states empty fields honestly instead of hiding them', () => {
      const bare = makeRumor({ id: 'bare', title: 'Bare rumor', content: '', notes: [], relatedNPCs: [], relatedLocations: [] });
      render(<RumorDirectory rumors={[bare]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Bare rumor/ }));

      expect(screen.getByText('No details recorded')).toBeInTheDocument();
      expect(screen.getByText('No notes yet')).toBeInTheDocument();
      expect(screen.getByText('No NPCs linked')).toBeInTheDocument();
      expect(screen.getByText('No locations linked')).toBeInTheDocument();
      expect(screen.getByText('Not converted to a quest')).toBeInTheDocument();
    });

    test('shows a live link to the quest when a rumor was converted', () => {
      const converted = makeRumor({ id: 'r-quest', title: 'Bandit trouble', convertedToQuestId: 'quest-1' });
      render(<RumorDirectory rumors={[converted]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Bandit trouble/ }));

      fireEvent.click(screen.getByRole('button', { name: /view quest/i }));
      expect(mockNavigateToPage).toHaveBeenCalledWith(
        expect.stringContaining('highlight=quest-1')
      );
    });
  });

  // -------------------------------------------------------------------------
  // Search filtering
  // -------------------------------------------------------------------------
  describe('search filtering', () => {
    test('should filter rumors by title search', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.change(searchInput(), { target: { value: 'Dragon' } });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should filter rumors by content search', () => {
      const r = makeRumor({ id: 'r-content', title: 'Alpha Rumor', content: 'A wizard appeared.' });
      const r2b = makeRumor({ id: 'r-other', title: 'Beta Rumor', content: 'A knight left town.' });
      render(<RumorDirectory rumors={[r, r2b]} />);
      fireEvent.change(searchInput(), { target: { value: 'wizard appeared' } });
      expect(screen.getByText('Alpha Rumor')).toBeInTheDocument();
      expect(screen.queryByText('Beta Rumor')).not.toBeInTheDocument();
    });

    test('should filter by source name', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.change(searchInput(), { target: { value: 'Aldric' } });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should be case-insensitive', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.change(searchInput(), { target: { value: 'dragon spotted' } });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
    });

    test('should show "Try adjusting your search" when search yields no results', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.change(searchInput(), { target: { value: 'zzznomatch' } });
      expect(screen.getByText(/try adjusting your search criteria/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Status bar — one bar that also filters, replacing the "All Status" dropdown
  // -------------------------------------------------------------------------
  describe('status bar', () => {
    test('shows the total rumors gathered', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('rumors gathered')).toBeInTheDocument();
    });

    test('breaks the total down by status, each labelled with a word', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      expect(screen.getByRole('button', { name: '1 confirmed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 unconfirmed' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1 false' })).toBeInTheDocument();
    });

    test('keeps zero-value statuses visible rather than hiding them', () => {
      render(<RumorDirectory rumors={[r1]} />);
      expect(screen.getByRole('button', { name: '0 false' })).toBeInTheDocument();
    });

    test('should filter by confirmed status', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      fireEvent.click(screen.getByRole('button', { name: '1 confirmed' }));
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should filter by unconfirmed status', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      fireEvent.click(screen.getByRole('button', { name: '1 unconfirmed' }));
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.queryByText('Dragon spotted')).not.toBeInTheDocument();
    });

    test('should filter by false status', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      fireEvent.click(screen.getByRole('button', { name: '1 false' }));
      expect(screen.getByText('Treasure map')).toBeInTheDocument();
      expect(screen.queryByText('Dragon spotted')).not.toBeInTheDocument();
    });

    test('clicking the active band clears the filter', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      const confirmedBand = () => screen.getByRole('button', { name: '1 confirmed' });

      fireEvent.click(confirmedBand());
      expect(confirmedBand()).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();

      fireEvent.click(confirmedBand());
      expect(confirmedBand()).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.getByText('Treasure map')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Source filter — small fixed set as visible pills, not a <select>
  // -------------------------------------------------------------------------
  describe('source filter', () => {
    test('renders every option as a visible pill rather than a select', () => {
      render(<RumorDirectory rumors={[r1]} />);
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      for (const label of ['All', 'NPC', 'Tavern', 'Notice', 'Traveler', 'Other']) {
        expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
      }
    });

    test('should filter by NPC source type', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: 'NPC' }));
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should filter by tavern source type', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Tavern' }));
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.queryByText('Dragon spotted')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Combined filters
  // -------------------------------------------------------------------------
  describe('combined filters', () => {
    test('should apply search and status filter simultaneously', () => {
      const confirmed1 = makeRumor({ id: 'c1', title: 'Alpha', status: 'confirmed' });
      const unconfirmed1 = makeRumor({ id: 'u1', title: 'Alpha', status: 'unconfirmed' });
      render(<RumorDirectory rumors={[confirmed1, unconfirmed1]} />);

      fireEvent.change(searchInput(), { target: { value: 'Alpha' } });
      fireEvent.click(screen.getByRole('button', { name: '1 confirmed' }));

      expect(screen.getAllByText('Alpha').length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Delete / edit actions in the expanded row
  // -------------------------------------------------------------------------
  describe('row actions', () => {
    test('navigates to the edit page when Edit is clicked', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/rumors/edit/r1');
    });

    test('calls deleteRumor when Delete is clicked', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(mockDeleteRumor).toHaveBeenCalledWith('r1');
    });

    test('does not render Edit or Delete controls when signed out', () => {
      setupMocks(null);
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /Expand Dragon spotted/ }));
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Selection mode — select-then-batch (confirm / unconfirm / mark false /
  // combine / convert to quest), restored via RosterRow's `leadingControl`.
  // -------------------------------------------------------------------------
  describe('selection mode', () => {
    test('shows a "Select Rumors" button, with no checkboxes until it is used', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      expect(screen.getByRole('button', { name: /select rumors/i })).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    test('entering selection mode reveals one accessible checkbox per rumor', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));

      expect(screen.getByRole('checkbox', { name: 'Select Dragon spotted' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Select Missing merchant' })).toBeInTheDocument();
    });

    test('toggles to "Exit Selection" once selection mode is active', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      expect(screen.getByRole('button', { name: /exit selection/i })).toBeInTheDocument();
    });

    test('checking a row does not expand it — the checkbox is outside the toggle button', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));

      expect(
        screen.getByRole('button', { name: /Expand Dragon spotted/ })
      ).toHaveAttribute('aria-expanded', 'false');
    });

    test('selecting rumors accumulates them and shows the batch actions bar', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));

      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));
      expect(screen.getByText(/1 rumors selected/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Missing merchant' }));
      expect(screen.getByText(/2 rumors selected/i)).toBeInTheDocument();
    });

    test('unchecking a rumor removes it from the batch', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));

      const dragonCheckbox = screen.getByRole('checkbox', { name: 'Select Dragon spotted' });
      fireEvent.click(dragonCheckbox);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Missing merchant' }));
      expect(screen.getByText(/2 rumors selected/i)).toBeInTheDocument();

      fireEvent.click(dragonCheckbox);
      expect(screen.getByText(/1 rumors selected/i)).toBeInTheDocument();
    });

    test('the batch actions bar only appears once selection mode is on and something is selected', () => {
      render(<RumorDirectory rumors={[r1]} />);
      expect(screen.queryByText(/rumors selected/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      // Selection mode is on but nothing is checked yet — no bar.
      expect(screen.queryByText(/rumors selected/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));
      expect(screen.getByText(/1 rumors selected/i)).toBeInTheDocument();
    });

    test('exposes the batch status actions once a rumor is selected', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));

      expect(screen.getByRole('button', { name: /mark confirmed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mark unconfirmed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /mark false/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /convert to quest/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^combine$/i })).toBeInTheDocument();
    });

    test('running a batch status update calls updateRumorStatus and clears the selection on completion', async () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));

      fireEvent.click(screen.getByRole('button', { name: /mark confirmed/i }));
      expect(mockUpdateRumorStatus).toHaveBeenCalledWith('r1', 'confirmed');

      // onComplete exits selection mode and clears the selection, so the
      // checkboxes and the batch bar both disappear.
      await screen.findByRole('button', { name: /select rumors/i });
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByText(/rumors selected/i)).not.toBeInTheDocument();
    });

    test('leaving selection mode via "Exit Selection" hides checkboxes and the batch bar', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Select Dragon spotted' }));
      expect(screen.getByText(/1 rumors selected/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /exit selection/i }));

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByText(/rumors selected/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select rumors/i })).toBeInTheDocument();
    });
  });
});
