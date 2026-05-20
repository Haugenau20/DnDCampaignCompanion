// src/components/features/locations/__tests__/LocationDirectory.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationDirectory from '../LocationDirectory';
import { Location } from '../../../../types/location';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

// LocationDirectory uses useFirebaseData for real-time updates
jest.mock('../../../../hooks/useFirebaseData', () => ({
  useFirebaseData: jest.fn(() => ({ data: [] })),
}));

jest.mock('../../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

// LocationCard has many deps — mock them all
jest.mock('../../../../context/NPCContext', () => ({
  useNPCs: jest.fn(() => ({ getNPCById: jest.fn(() => undefined) })),
}));

jest.mock('../../../../context/QuestContext', () => ({
  useQuests: jest.fn(() => ({ getQuestById: jest.fn(() => undefined) })),
}));

jest.mock('../../../../context/LocationContext', () => ({
  useLocations: jest.fn(() => ({
    locations: [],
    updateLocationNote: jest.fn(),
    deleteLocation: jest.fn(),
  })),
}));

jest.mock('../../../../context/firebase', () => ({
  useAuth: jest.fn(() => ({ user: { uid: 'user-1' } })),
  useFirebase: jest.fn(() => ({ activeGroupId: 'group-1' })),
}));

jest.mock('../../../../utils/attribution-utils', () => ({
  determineAttributionActor: jest.fn(() => ''),
  fetchAttributionUsernames: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../../../services/firebase', () => ({ default: {} }));

const { useNavigation } = require('../../../../context/NavigationContext');
const { useLocations } = require('../../../../context/LocationContext');
const { useFirebaseData } = require('../../../../hooks/useFirebaseData');

function setupMocks(locations: Location[] = []) {
  (useFirebaseData as jest.Mock).mockReturnValue({ data: [] });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: jest.fn(),
    createPath: jest.fn((p: string) => p),
    getCurrentQueryParams: jest.fn(() => ({})),
  });
  (useLocations as jest.Mock).mockReturnValue({
    locations,
    updateLocationNote: jest.fn(),
    deleteLocation: jest.fn(),
  });
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
      expect(screen.getByText(/There are no locations to display/i)).toBeInTheDocument();
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
      expect(screen.getByPlaceholderText('Search locations...')).toBeInTheDocument();
    });

    test('should render Type filter select', () => {
      render(<LocationDirectory locations={[]} />);
      const selects = screen.getAllByRole('combobox');
      // First select is Type filter
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    test('should render Status filter select', () => {
      render(<LocationDirectory locations={[]} />);
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
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
      const searchInput = screen.getByPlaceholderText('Search locations...');
      fireEvent.change(searchInput, { target: { value: 'Silver' } });
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.queryByText('Ironhold')).not.toBeInTheDocument();
    });

    test('should show empty state when search matches nothing', () => {
      const locations = [makeLocation('loc-1', 'Silverkeep')];
      render(<LocationDirectory locations={locations} />);
      const searchInput = screen.getByPlaceholderText('Search locations...');
      fireEvent.change(searchInput, { target: { value: 'zzznomatch' } });
      expect(screen.getByText('No Locations Found')).toBeInTheDocument();
    });

    test('should show search-specific empty message when no results', () => {
      const locations = [makeLocation('loc-1', 'Silverkeep')];
      render(<LocationDirectory locations={locations} />);
      const searchInput = screen.getByPlaceholderText('Search locations...');
      fireEvent.change(searchInput, { target: { value: 'zzznomatch' } });
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
      const selects = screen.getAllByRole('combobox');
      // Type filter is first select
      fireEvent.change(selects[0], { target: { value: 'city' } });
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.queryByText('Dark Cave')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Status filter
  // -------------------------------------------------------------------------
  describe('status filter', () => {
    test('should filter locations by status', () => {
      const locations = [
        makeLocation('loc-1', 'Silverkeep', { status: 'known' }),
        makeLocation('loc-2', 'Ironhold', { status: 'explored' }),
      ];
      render(<LocationDirectory locations={locations} />);
      const selects = screen.getAllByRole('combobox');
      // Status filter is second select
      fireEvent.change(selects[1], { target: { value: 'known' } });
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
      expect(screen.queryByText('Ironhold')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Hierarchical layout
  // -------------------------------------------------------------------------
  describe('hierarchical layout', () => {
    test('should render parent location', () => {
      const locations = [makeLocation('parent-1', 'Kingdom of Valor')];
      render(<LocationDirectory locations={locations} />);
      expect(screen.getByText('Kingdom of Valor')).toBeInTheDocument();
    });

    test('should render child location when parent is expanded', () => {
      const parent = makeLocation('parent-1', 'Kingdom of Valor');
      const child = makeLocation('child-1', 'Silverkeep', { parentId: 'parent-1' });

      // useLocations returns all locations for hierarchy
      (useLocations as jest.Mock).mockReturnValue({
        locations: [parent, child],
        updateLocationNote: jest.fn(),
        deleteLocation: jest.fn(),
      });

      const locations = [parent, child];
      render(<LocationDirectory locations={locations} />);

      // Parent should be visible
      expect(screen.getByText('Kingdom of Valor')).toBeInTheDocument();

      // Expand the parent to show children
      const expandSubBtn = screen.getByRole('button', { name: /expand sub locations/i });
      fireEvent.click(expandSubBtn);

      // Child should now be visible
      expect(screen.getByText('Silverkeep')).toBeInTheDocument();
    });
  });
});
