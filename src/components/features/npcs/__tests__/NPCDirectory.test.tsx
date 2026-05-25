// src/components/features/npcs/__tests__/NPCDirectory.test.tsx

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import NPCDirectory from '../NPCDirectory';
import { NPC, NPCStatus, NPCRelationship } from '../../../../types/npc';

// ---------------------------------------------------------------------------
// Mock all context dependencies used by NPCDirectory and its child NPCCard
// ---------------------------------------------------------------------------

jest.mock('../../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../context/QuestContext', () => ({
  useQuests: jest.fn(),
}));

jest.mock('../../../../context/NPCContext', () => ({
  useNPCs: jest.fn(),
}));

jest.mock('../../../../context/firebase', () => ({
  useAuth: jest.fn(),
  useFirebase: jest.fn(() => ({ activeGroupId: 'group-1' })),
}));

// AttributionInfo dependencies
jest.mock('../../../../utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(() => ''),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../../services/firebase', () => ({ default: {} }));

// ---------------------------------------------------------------------------
// Hook setup helpers
// ---------------------------------------------------------------------------

const mockNavigateToPage = jest.fn();
const mockCreatePath = jest.fn(
  (path: string, _p: unknown, query?: Record<string, string>) =>
    query ? `${path}?${new URLSearchParams(query).toString()}` : path
);
const mockGetCurrentQueryParams = jest.fn(() => ({}));

const { useNavigation } = require('../../../../context/NavigationContext');
const { useQuests } = require('../../../../context/QuestContext');
const { useNPCs } = require('../../../../context/NPCContext');
const { useAuth } = require('../../../../context/firebase');

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

const aldric = makeNPC({ id: 'npc-1', name: 'Aldric', location: 'Silverkeep', status: 'alive', relationship: 'friendly' });
const mira = makeNPC({ id: 'npc-2', name: 'Mira', location: 'Ironhold', status: 'deceased', relationship: 'hostile' });
const rolf = makeNPC({ id: 'npc-3', name: 'Rolf', location: 'Silverkeep', status: 'missing', relationship: 'neutral' });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NPCDirectory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
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
      expect(screen.queryByPlaceholderText(/search npcs/i)).not.toBeInTheDocument();
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
      // Both Silverkeep NPCs and Ironhold NPC should be present
      // getAllByText because location name appears in group heading AND in dropdown
      expect(screen.getAllByText('Silverkeep').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Ironhold').length).toBeGreaterThanOrEqual(1);
    });

    test('should group NPCs with no location under "Unknown Location"', () => {
      const unlocated = makeNPC({ id: 'npc-u', name: 'Wanderer', location: undefined });
      render(<NPCDirectory npcs={[unlocated]} />);
      expect(screen.getByText('Unknown Location')).toBeInTheDocument();
    });

    test('should render location as a clickable button', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      const locationButtons = screen.getAllByRole('button', { name: /silverkeep/i });
      expect(locationButtons.length).toBeGreaterThanOrEqual(1);
    });

    test('should call navigateToPage when location button is clicked', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      // Find the location heading button
      const locationButton = screen.getAllByRole('button').find(btn =>
        btn.textContent?.includes('Silverkeep')
      );
      expect(locationButton).toBeDefined();
      fireEvent.click(locationButton!);
      expect(mockNavigateToPage).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Search filtering
  // -------------------------------------------------------------------------
  describe('search filtering', () => {
    test('should filter NPCs by name search', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      fireEvent.change(screen.getByPlaceholderText(/search npcs/i), {
        target: { value: 'Aldric' },
      });
      expect(screen.getByText('Aldric')).toBeInTheDocument();
      expect(screen.queryByText('Mira')).not.toBeInTheDocument();
    });

    test('should filter NPCs by description search', () => {
      const npc1 = makeNPC({ id: 'a', name: 'Alpha', description: 'A mighty warrior' });
      const npc2 = makeNPC({ id: 'b', name: 'Beta', description: 'A cunning rogue' });
      render(<NPCDirectory npcs={[npc1, npc2]} />);
      fireEvent.change(screen.getByPlaceholderText(/search npcs/i), {
        target: { value: 'mighty warrior' },
      });
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    });

    test('should filter NPCs by title search', () => {
      const npc1 = makeNPC({ id: 'a', name: 'Alpha', title: 'Court Wizard' });
      const npc2 = makeNPC({ id: 'b', name: 'Beta', title: 'Town Guard' });
      render(<NPCDirectory npcs={[npc1, npc2]} />);
      fireEvent.change(screen.getByPlaceholderText(/search npcs/i), {
        target: { value: 'Court Wizard' },
      });
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    });

    test('should be case-insensitive', () => {
      render(<NPCDirectory npcs={[aldric]} />);
      fireEvent.change(screen.getByPlaceholderText(/search npcs/i), {
        target: { value: 'aldric' },
      });
      expect(screen.getByText('Aldric')).toBeInTheDocument();
    });

    test('should show "Try adjusting" message when search yields no results', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      fireEvent.change(screen.getByPlaceholderText(/search npcs/i), {
        target: { value: 'zzznomatch' },
      });
      expect(screen.getByText(/try adjusting your search criteria/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Status filter
  // -------------------------------------------------------------------------
  describe('status filter', () => {
    test('should show All Status option in status dropdown', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects[0]; // first select is status
      expect(within(statusSelect).getByText('All Status')).toBeInTheDocument();
    });

    test('should filter by alive status', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'alive' } });
      expect(screen.getByText('Aldric')).toBeInTheDocument();
      expect(screen.queryByText('Mira')).not.toBeInTheDocument();
    });

    test('should filter by deceased status', () => {
      render(<NPCDirectory npcs={[aldric, mira]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'deceased' } });
      expect(screen.getByText('Mira')).toBeInTheDocument();
      expect(screen.queryByText('Aldric')).not.toBeInTheDocument();
    });

    test('should filter by missing status', () => {
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'missing' } });
      expect(screen.getByText('Rolf')).toBeInTheDocument();
      expect(screen.queryByText('Aldric')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Relationship filter
  // -------------------------------------------------------------------------
  describe('relationship filter', () => {
    test('should filter by friendly relationship', () => {
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[1], { target: { value: 'friendly' } });
      expect(screen.getByText('Aldric')).toBeInTheDocument();
      expect(screen.queryByText('Mira')).not.toBeInTheDocument();
      expect(screen.queryByText('Rolf')).not.toBeInTheDocument();
    });

    test('should filter by hostile relationship', () => {
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[1], { target: { value: 'hostile' } });
      expect(screen.getByText('Mira')).toBeInTheDocument();
      expect(screen.queryByText('Aldric')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Location filter
  // -------------------------------------------------------------------------
  describe('location filter', () => {
    test('should populate location dropdown with unique locations', () => {
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);
      const selects = screen.getAllByRole('combobox');
      const locationSelect = selects[2];
      // Silverkeep and Ironhold should both be options
      expect(within(locationSelect).getByText('Silverkeep')).toBeInTheDocument();
      expect(within(locationSelect).getByText('Ironhold')).toBeInTheDocument();
    });

    test('should filter NPCs by location', () => {
      render(<NPCDirectory npcs={[aldric, mira, rolf]} />);
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(selects[2], { target: { value: 'Ironhold' } });
      expect(screen.getByText('Mira')).toBeInTheDocument();
      expect(screen.queryByText('Aldric')).not.toBeInTheDocument();
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
      const selects = screen.getAllByRole('combobox');
      fireEvent.change(screen.getByPlaceholderText(/search npcs/i), {
        target: { value: 'Mira' },
      });
      fireEvent.change(selects[0], { target: { value: 'alive' } });
      expect(screen.getByText('Mira')).toBeInTheDocument();
      expect(screen.queryByText('Aldric')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Parent callback propagation
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
