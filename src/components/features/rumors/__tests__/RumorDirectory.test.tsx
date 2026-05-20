// src/components/features/rumors/__tests__/RumorDirectory.test.tsx

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import RumorDirectory from '../RumorDirectory';
import { Rumor, RumorStatus, SourceType } from '../../../../types/rumor';

// ---------------------------------------------------------------------------
// Mock Dialog to render inline (bug #150)
// ---------------------------------------------------------------------------
jest.mock('../../../core/Dialog', () => {
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
// Polyfill crypto.randomUUID for JSDOM (used by ConvertToQuestDialog)
// ---------------------------------------------------------------------------
if (!crypto.randomUUID) {
  Object.defineProperty(crypto, 'randomUUID', {
    value: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
}

// ---------------------------------------------------------------------------
// Mock all context dependencies
// ---------------------------------------------------------------------------

jest.mock('../../../../hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../context/firebase', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'user-1' } })),
  useFirebase: jest.fn(() => ({ activeGroupId: 'group-1' })),
}));

jest.mock('../../../../context/RumorContext', () => ({
  useRumors: jest.fn(),
}));

jest.mock('../../../../context/NPCContext', () => ({
  useNPCs: jest.fn(() => ({ getNPCById: jest.fn(() => undefined) })),
}));

jest.mock('../../../../context/LocationContext', () => ({
  useLocations: jest.fn(() => ({ getLocationById: jest.fn(() => undefined) })),
}));

jest.mock('../../../../utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(() => ''),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../../services/firebase', () => ({ default: {} }));

const mockNavigateToPage = jest.fn();
const mockGetCurrentQueryParams = jest.fn(() => ({}));

const { useNavigation } = require('../../../../hooks/useNavigation');
const { useRumors } = require('../../../../context/RumorContext');

function setupMocks() {
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    createPath: jest.fn((path: string) => path),
    getCurrentQueryParams: mockGetCurrentQueryParams,
  });
  (useRumors as jest.Mock).mockReturnValue({
    rumors: [],
    updateRumorNote: jest.fn().mockResolvedValue(undefined),
    updateRumorStatus: jest.fn().mockResolvedValue(undefined),
    deleteRumor: jest.fn().mockResolvedValue(undefined),
    combineRumors: jest.fn().mockResolvedValue('new-rumor-id'),
    convertToQuest: jest.fn().mockResolvedValue('quest-id'),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RumorDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentQueryParams.mockReturnValue({});
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
  // Rumor rendering
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
  });

  // -------------------------------------------------------------------------
  // Search filtering
  // -------------------------------------------------------------------------
  describe('search filtering', () => {
    test('should filter rumors by title search', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.change(screen.getByPlaceholderText(/search rumors/i), {
        target: { value: 'Dragon' },
      });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should filter rumors by content search', () => {
      const r = makeRumor({ id: 'r-content', title: 'Alpha Rumor', content: 'A wizard appeared.' });
      const r2b = makeRumor({ id: 'r-other', title: 'Beta Rumor', content: 'A knight left town.' });
      render(<RumorDirectory rumors={[r, r2b]} />);
      fireEvent.change(screen.getByPlaceholderText(/search rumors/i), {
        target: { value: 'wizard appeared' },
      });
      expect(screen.getByText('Alpha Rumor')).toBeInTheDocument();
      expect(screen.queryByText('Beta Rumor')).not.toBeInTheDocument();
    });

    test('should filter by source name', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.change(screen.getByPlaceholderText(/search rumors/i), {
        target: { value: 'Aldric' },
      });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should be case-insensitive', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.change(screen.getByPlaceholderText(/search rumors/i), {
        target: { value: 'dragon spotted' },
      });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
    });

    test('should show "Try adjusting your search" when search yields no results', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.change(screen.getByPlaceholderText(/search rumors/i), {
        target: { value: 'zzznomatch' },
      });
      expect(screen.getByText(/try adjusting your search criteria/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Status filter
  // -------------------------------------------------------------------------
  describe('status filter', () => {
    test('should filter by confirmed status', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'confirmed' } });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should filter by unconfirmed status', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'unconfirmed' } });
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.queryByText('Dragon spotted')).not.toBeInTheDocument();
    });

    test('should filter by false status', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'false' } });
      expect(screen.getByText('Treasure map')).toBeInTheDocument();
      expect(screen.queryByText('Dragon spotted')).not.toBeInTheDocument();
    });

    test('should show all rumors when "All Status" is selected', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'confirmed' } });
      fireEvent.change(selects[0], { target: { value: 'all' } });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.getByText('Treasure map')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Source filter
  // -------------------------------------------------------------------------
  describe('source filter', () => {
    test('should filter by NPC source type', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[1], { target: { value: 'npc' } });
      expect(screen.getByText('Dragon spotted')).toBeInTheDocument();
      expect(screen.queryByText('Missing merchant')).not.toBeInTheDocument();
    });

    test('should filter by tavern source type', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[1], { target: { value: 'tavern' } });
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.queryByText('Dragon spotted')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Location filter
  // -------------------------------------------------------------------------
  describe('location filter', () => {
    test('should show location filter when rumors have locations', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      const selects = screen.getAllByRole('combobox');
      // Location filter is the 3rd select (after status and source)
      expect(selects.length).toBeGreaterThanOrEqual(3);
    });

    test('should populate location options from rumor locations', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      const selects = screen.getAllByRole('combobox');
      const locationSelect = selects[2];
      expect(within(locationSelect).getByText('Silverkeep')).toBeInTheDocument();
      expect(within(locationSelect).getByText('Ironhold')).toBeInTheDocument();
    });

    test('should filter by location', () => {
      render(<RumorDirectory rumors={[r1, r2, r3]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[2], { target: { value: 'Ironhold' } });
      expect(screen.getByText('Missing merchant')).toBeInTheDocument();
      expect(screen.queryByText('Dragon spotted')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Selection mode
  // -------------------------------------------------------------------------
  describe('selection mode', () => {
    test('should show "Select Rumors" button', () => {
      render(<RumorDirectory rumors={[r1]} />);
      expect(screen.getByRole('button', { name: /select rumors/i })).toBeInTheDocument();
    });

    test('should toggle to "Exit Selection" when Select Rumors is clicked', () => {
      render(<RumorDirectory rumors={[r1]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      expect(screen.getByRole('button', { name: /exit selection/i })).toBeInTheDocument();
    });

    test('should show checkboxes on rumor cards in selection mode', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      // Each rumor card shows a checkbox in selection mode
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBe(2);
    });

    test('should show "X rumors selected" when rumors are selected', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(screen.getByText(/1 rumors selected/i)).toBeInTheDocument();
    });

    test('should show batch actions bar when rumors are selected', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(screen.getByRole('button', { name: /mark confirmed/i })).toBeInTheDocument();
    });

    test('should exit selection mode and clear selections when Exit Selection is clicked', () => {
      render(<RumorDirectory rumors={[r1, r2]} />);
      fireEvent.click(screen.getByRole('button', { name: /select rumors/i }));
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(screen.getByRole('button', { name: /exit selection/i }));
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
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
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(screen.getByPlaceholderText(/search rumors/i), { target: { value: 'Alpha' } });
      fireEvent.change(selects[0], { target: { value: 'confirmed' } });
      // Both have same title; only confirmed should show
      expect(screen.getAllByText('Alpha').length).toBe(1);
    });
  });
});
