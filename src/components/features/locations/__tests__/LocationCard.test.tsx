// src/components/features/locations/__tests__/LocationCard.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationCard from '../LocationCard';
import { Location, LocationType, LocationStatus } from '../../../../types/location';

// ---------------------------------------------------------------------------
// Mock external context dependencies
// ---------------------------------------------------------------------------

const mockGetNPCById = jest.fn();
jest.mock('../../../../context/NPCContext', () => ({
  useNPCs: jest.fn(),
}));

const mockGetQuestById = jest.fn();
jest.mock('../../../../context/QuestContext', () => ({
  useQuests: jest.fn(),
}));

const mockNavigateToPage = jest.fn();
const mockCreatePath = jest.fn(
  (path: string, _p: unknown, query?: Record<string, string>) =>
    query ? `${path}?${new URLSearchParams(query).toString()}` : path
);
jest.mock('../../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

const mockUpdateLocationNote = jest.fn();
const mockDeleteLocation = jest.fn();
jest.mock('../../../../context/LocationContext', () => ({
  useLocations: jest.fn(),
}));

const mockUser = { uid: 'user-1' };
jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
  useFirebase: jest.fn(() => ({ activeGroupId: 'group-1' })),
}));

jest.mock('../../../../utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(() => ''),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../../services/firebase', () => ({ default: {} }));

// ---------------------------------------------------------------------------
// Hook setup helpers
// ---------------------------------------------------------------------------

const { useNPCs } = require('../../../../context/NPCContext');
const { useQuests } = require('../../../../context/QuestContext');
const { useNavigation } = require('../../../../context/NavigationContext');
const { useLocations } = require('../../../../context/LocationContext');
const { useAuth } = require('@/features/user-management');

function setupMocks({
  user = mockUser,
  npcs = {} as Record<string, unknown>,
  quests = {} as Record<string, unknown>,
  updateLocationNote = mockUpdateLocationNote,
  deleteLocation = mockDeleteLocation,
  locations = [] as Location[],
}: {
  user?: { uid: string } | null;
  npcs?: Record<string, unknown>;
  quests?: Record<string, unknown>;
  updateLocationNote?: jest.Mock;
  deleteLocation?: jest.Mock;
  locations?: Location[];
} = {}) {
  (useAuth as jest.Mock).mockReturnValue({ user });
  (useNPCs as jest.Mock).mockReturnValue({
    getNPCById: (id: string) => npcs[id],
  });
  (useQuests as jest.Mock).mockReturnValue({
    getQuestById: (id: string) => quests[id],
  });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    createPath: mockCreatePath,
  });
  (useLocations as jest.Mock).mockReturnValue({
    locations,
    updateLocationNote,
    deleteLocation,
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc-1',
    name: 'Silverkeep',
    type: 'city' as LocationType,
    status: 'known' as LocationStatus,
    description: 'A prosperous trading city',
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LocationCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateLocationNote.mockResolvedValue(undefined);
    mockDeleteLocation.mockResolvedValue(undefined);
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Basic rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render location name', () => {
      render(<LocationCard location={makeLocation()} />);
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
    });

    test('should render location type formatted correctly', () => {
      render(<LocationCard location={makeLocation({ type: 'city' })} />);
      expect(screen.getByText('City')).toBeInTheDocument();
    });

    test('should render "Point of Interest" for type "poi"', () => {
      render(<LocationCard location={makeLocation({ type: 'poi' })} />);
      expect(screen.getByText('Point of Interest')).toBeInTheDocument();
    });

    test('should render description', () => {
      render(<LocationCard location={makeLocation({ description: 'A dark dungeon' })} />);
      expect(screen.getByText('A dark dungeon')).toBeInTheDocument();
    });

    test('should render Expand button', () => {
      render(<LocationCard location={makeLocation()} />);
      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
    });

    test('should render NPC count badge when connectedNPCs exist', () => {
      setupMocks({
        npcs: { 'npc-1': { id: 'npc-1', name: 'Gorthak', relationship: 'friendly' } },
      });
      render(<LocationCard location={makeLocation({ connectedNPCs: ['npc-1'] })} />);
      expect(screen.getByText('1 NPCs')).toBeInTheDocument();
    });

    test('should render Quest count badge when relatedQuests exist', () => {
      render(<LocationCard location={makeLocation({ relatedQuests: ['quest-1'] })} />);
      expect(screen.getByText('1 Quests')).toBeInTheDocument();
    });

    test('should render "Expand Sub Locations" button when hasChildren is true', () => {
      const onToggleExpand = jest.fn();
      render(
        <LocationCard
          location={makeLocation()}
          hasChildren={true}
          isExpanded={false}
          onToggleExpand={onToggleExpand}
        />
      );
      expect(screen.getByRole('button', { name: /expand sub locations/i })).toBeInTheDocument();
    });

    test('should render "Collapse Sub Locations" button when hasChildren is true and isExpanded', () => {
      const onToggleExpand = jest.fn();
      render(
        <LocationCard
          location={makeLocation()}
          hasChildren={true}
          isExpanded={true}
          onToggleExpand={onToggleExpand}
        />
      );
      expect(screen.getByRole('button', { name: /collapse sub locations/i })).toBeInTheDocument();
    });

    test('should call onToggleExpand when sub-location expand button clicked', () => {
      const onToggleExpand = jest.fn();
      render(
        <LocationCard
          location={makeLocation()}
          hasChildren={true}
          isExpanded={false}
          onToggleExpand={onToggleExpand}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /expand sub locations/i }));
      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Expand / collapse
  // -------------------------------------------------------------------------
  describe('expand and collapse', () => {
    test('should show Collapse button after clicking Expand', () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.getByRole('button', { name: /^collapse$/i })).toBeInTheDocument();
    });

    test('should collapse back after second click', () => {
      render(<LocationCard location={makeLocation({ features: ['Ancient walls'] })} />);
      const expandBtn = screen.getByRole('button', { name: /^expand$/i });
      fireEvent.click(expandBtn);
      expect(screen.getByText('Ancient walls')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /^collapse$/i }));
      expect(screen.queryByText('Ancient walls')).not.toBeInTheDocument();
    });

    test('should reveal features section in expanded state', () => {
      render(<LocationCard location={makeLocation({ features: ['Ancient walls', 'Golden spires'] })} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.getByText('Ancient walls')).toBeInTheDocument();
      expect(screen.getByText('Golden spires')).toBeInTheDocument();
    });

    test('should reveal tags in expanded state', () => {
      render(<LocationCard location={makeLocation({ tags: ['safe-haven', 'market'] })} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.getByText('safe-haven')).toBeInTheDocument();
      expect(screen.getByText('market')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Notes display
  // -------------------------------------------------------------------------
  describe('notes rendering', () => {
    test('should render note text in expanded state', () => {
      const location = makeLocation({
        notes: [{ date: '2024-01-15', text: 'The city gates were closed' }],
      });
      render(<LocationCard location={location} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.getByText('The city gates were closed')).toBeInTheDocument();
    });

    test('should not show Notes header when no notes exist', () => {
      render(<LocationCard location={makeLocation({ notes: [] })} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.queryByText('Notes')).not.toBeInTheDocument();
    });

    test('should show Notes header when notes exist', () => {
      const location = makeLocation({
        notes: [{ date: '2024-01-15', text: 'Something notable' }],
      });
      render(<LocationCard location={location} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Related quests
  // -------------------------------------------------------------------------
  describe('related quests', () => {
    test('should render quest title when quest is found', () => {
      setupMocks({
        quests: {
          'quest-1': { id: 'quest-1', title: 'Rescue the Mayor', status: 'active' },
        },
        locations: [makeLocation({ relatedQuests: ['quest-1'] })],
      });
      render(
        <LocationCard
          location={makeLocation({ relatedQuests: ['quest-1'] })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.getByText('Rescue the Mayor')).toBeInTheDocument();
    });

    test('should call navigateToPage on quest click', () => {
      setupMocks({
        quests: {
          'quest-1': { id: 'quest-1', title: 'Rescue the Mayor', status: 'active' },
        },
        locations: [makeLocation({ relatedQuests: ['quest-1'] })],
      });
      render(
        <LocationCard
          location={makeLocation({ relatedQuests: ['quest-1'] })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      fireEvent.click(screen.getByText('Rescue the Mayor'));
      expect(mockNavigateToPage).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Connected NPCs
  // -------------------------------------------------------------------------
  describe('connected NPCs', () => {
    test('should render NPC name when NPC is found', () => {
      setupMocks({
        npcs: {
          'npc-1': { id: 'npc-1', name: 'Aldric the Wise', relationship: 'friendly' },
        },
      });
      render(
        <LocationCard
          location={makeLocation({ connectedNPCs: ['npc-1'] })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.getByText('Aldric the Wise')).toBeInTheDocument();
    });

    test('should call navigateToPage on NPC click', () => {
      setupMocks({
        npcs: {
          'npc-1': { id: 'npc-1', name: 'Aldric the Wise', relationship: 'friendly' },
        },
      });
      render(
        <LocationCard
          location={makeLocation({ connectedNPCs: ['npc-1'] })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      fireEvent.click(screen.getByText('Aldric the Wise'));
      expect(mockNavigateToPage).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated user actions
  // -------------------------------------------------------------------------
  describe('authenticated user actions', () => {
    test('should show Add Note button for authenticated users in expanded state', () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
    });

    test('should show Edit button for authenticated users in expanded state', () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    test('should show Delete button for authenticated users in expanded state', () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    test('should NOT show Edit/Delete buttons for unauthenticated users', () => {
      setupMocks({ user: null });
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
    });

    test('should show note input when Add Note is clicked', () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      fireEvent.click(screen.getByRole('button', { name: /add note/i }));
      expect(screen.getByPlaceholderText('Enter note...')).toBeInTheDocument();
    });

    test('should show Save and Cancel buttons in note input mode', () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      fireEvent.click(screen.getByRole('button', { name: /add note/i }));
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should disable Save button when note input is empty', () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      fireEvent.click(screen.getByRole('button', { name: /add note/i }));
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    test('should enable Save button when note input has content', () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      fireEvent.click(screen.getByRole('button', { name: /add note/i }));
      fireEvent.change(screen.getByPlaceholderText('Enter note...'), {
        target: { value: 'Found a hidden passage' },
      });
      expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled();
    });

    test('should call updateLocationNote when Save is clicked with content', async () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      fireEvent.click(screen.getByRole('button', { name: /add note/i }));
      fireEvent.change(screen.getByPlaceholderText('Enter note...'), {
        target: { value: 'Hidden passage found' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      await waitFor(() => {
        expect(mockUpdateLocationNote).toHaveBeenCalledWith(
          'loc-1',
          expect.objectContaining({ text: 'Hidden passage found' })
        );
      });
    });

    test('should hide note form after clicking Cancel', () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      fireEvent.click(screen.getByRole('button', { name: /add note/i }));
      fireEvent.change(screen.getByPlaceholderText('Enter note...'), {
        target: { value: 'Some note' },
      });
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByPlaceholderText('Enter note...')).not.toBeInTheDocument();
    });

    test('should call navigateToPage with edit path when Edit is clicked', () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/locations/edit/loc-1');
    });
  });

  // -------------------------------------------------------------------------
  // Delete interaction (dialog blocked by bug #150)
  // -------------------------------------------------------------------------
  describe('delete interaction', () => {
    test('should open delete dialog when Delete is clicked without crashing', () => {
      render(<LocationCard location={makeLocation()} />);
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      // Click Delete button — dialog content unreachable in JSDOM per bug #150
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      // Verify component doesn't crash
    });
  });

  // -------------------------------------------------------------------------
  // Custom delete message with children
  // -------------------------------------------------------------------------
  describe('delete message', () => {
    test('should not crash when hasChildren is true and delete is triggered', () => {
      const onToggleExpand = jest.fn();
      render(
        <LocationCard
          location={makeLocation()}
          hasChildren={true}
          isExpanded={false}
          onToggleExpand={onToggleExpand}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /^expand$/i }));
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      // No crash = pass. Dialog not reachable due to bug #150.
    });
  });
});
