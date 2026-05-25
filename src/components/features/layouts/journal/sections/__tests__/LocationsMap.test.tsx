// src/components/features/layouts/journal/sections/__tests__/LocationsMap.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationsMap from '../LocationsMap';
import { Location } from '../../../../../../types/location';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../../../../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation } = require('../../../../../../context/NavigationContext');
const mockNavigateToPage = jest.fn();

function setupMocks() {
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------
const BASE_LOCATION: Location = {
  id: 'loc-1',
  name: 'Thornvale',
  type: 'city',
  status: 'visited',
  description: 'A bustling trade city',
  createdBy: 'user-1',
  createdByUsername: 'user1',
  dateAdded: '2024-01-01',
};

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    ...BASE_LOCATION,
    id: `loc-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LocationsMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Section heading
  // -------------------------------------------------------------------------
  describe('section heading', () => {
    it('renders the "Key Locations" heading', () => {
      render(<LocationsMap locations={[]} loading={false} />);
      expect(screen.getByText(/Key Locations/)).toBeInTheDocument();
    });

    it('shows the count of locations when not loading', () => {
      const locations = [makeLocation(), makeLocation()];
      render(<LocationsMap locations={locations} loading={false} />);
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    });

    it('shows loading indicator "..." in heading when loading=true', () => {
      render(<LocationsMap locations={[]} loading={true} />);
      expect(screen.getByText(/\(\.\.\.\)/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders loading skeleton divs when loading=true', () => {
      const { container } = render(<LocationsMap locations={[]} loading={true} />);
      // The loading state renders 3 skeleton divs with the animate-pulse container
      const pulse = container.querySelector('.animate-pulse');
      expect(pulse).toBeInTheDocument();
    });

    it('does not render location items while loading', () => {
      const locations = [makeLocation({ name: 'Hidden City' })];
      render(<LocationsMap locations={locations} loading={true} />);
      expect(screen.queryByText('Hidden City')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    it('shows "No locations discovered yet" when locations list is empty', () => {
      render(<LocationsMap locations={[]} loading={false} />);
      expect(screen.getByText('No locations discovered yet')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Location item rendering
  // -------------------------------------------------------------------------
  describe('location item rendering', () => {
    it('renders the location name', () => {
      const locations = [makeLocation({ name: 'Silvermere' })];
      render(<LocationsMap locations={locations} loading={false} />);
      expect(screen.getByText('Silvermere')).toBeInTheDocument();
    });

    it('renders the location type label for known types', () => {
      const locations = [makeLocation({ type: 'dungeon' })];
      render(<LocationsMap locations={locations} loading={false} />);
      expect(screen.getByText('Dungeon')).toBeInTheDocument();
    });

    it('renders "Point of Interest" for poi type', () => {
      const locations = [makeLocation({ type: 'poi' })];
      render(<LocationsMap locations={locations} loading={false} />);
      expect(screen.getByText('Point of Interest')).toBeInTheDocument();
    });

    it('renders the status display label', () => {
      const locations = [makeLocation({ status: 'explored' })];
      render(<LocationsMap locations={locations} loading={false} />);
      expect(screen.getByText(/Explored/)).toBeInTheDocument();
    });

    it('renders "Known" for known status', () => {
      const locations = [makeLocation({ status: 'known' })];
      render(<LocationsMap locations={locations} loading={false} />);
      expect(screen.getByText(/Known/)).toBeInTheDocument();
    });

    it('renders "Visited" for visited status', () => {
      const locations = [makeLocation({ status: 'visited' })];
      render(<LocationsMap locations={locations} loading={false} />);
      expect(screen.getByText(/Visited/)).toBeInTheDocument();
    });

    it('renders location description when provided', () => {
      const locations = [makeLocation({ description: 'A foggy marsh' })];
      render(<LocationsMap locations={locations} loading={false} />);
      expect(screen.getByText('A foggy marsh')).toBeInTheDocument();
    });

    it('does not render description element when description is absent', () => {
      // description is a required field in Location type, but we can pass empty string
      const locations = [makeLocation({ description: '' })];
      const { container } = render(<LocationsMap locations={locations} loading={false} />);
      // The conditional renders a <p> only when description is truthy
      const descEl = container.querySelector('p.typography-secondary');
      expect(descEl).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Sorting behavior
  // -------------------------------------------------------------------------
  describe('sorting behavior', () => {
    it('displays known-status locations before explored ones', () => {
      const locations = [
        makeLocation({ name: 'Explored City', status: 'explored' }),
        makeLocation({ name: 'Known Town', status: 'known' }),
      ];
      const { container } = render(<LocationsMap locations={locations} loading={false} />);
      // Find all rendered name spans (text-sm font-medium)
      const nameSpans = container.querySelectorAll('span.text-sm.font-medium');
      expect(nameSpans).toHaveLength(2);
      // known should appear before explored
      expect(nameSpans[0].textContent).toBe('Known Town');
      expect(nameSpans[1].textContent).toBe('Explored City');
    });

    it('sorts alphabetically within same status', () => {
      const locations = [
        makeLocation({ name: 'Zephyr Keep', status: 'visited' }),
        makeLocation({ name: 'Amber Cove', status: 'visited' }),
      ];
      render(<LocationsMap locations={locations} loading={false} />);
      const items = screen.getAllByText(/Keep|Cove/);
      expect(items[0].textContent).toBe('Amber Cove');
      expect(items[1].textContent).toBe('Zephyr Keep');
    });
  });

  // -------------------------------------------------------------------------
  // Capping at 5 locations
  // -------------------------------------------------------------------------
  describe('display cap at 5 locations', () => {
    it('renders at most 5 location items', () => {
      const locations = Array.from({ length: 7 }, (_, i) =>
        makeLocation({ name: `Location ${i + 1}`, id: `loc-${i}` })
      );
      render(<LocationsMap locations={locations} loading={false} />);
      // Locations named Location 1..5 should appear, 6 and 7 should not
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(`Location ${i}`)).toBeInTheDocument();
      }
    });

    it('shows "...and N more locations" when there are more than 5', () => {
      const locations = Array.from({ length: 7 }, (_, i) =>
        makeLocation({ name: `Location ${i + 1}`, id: `loc-${i}` })
      );
      render(<LocationsMap locations={locations} loading={false} />);
      expect(screen.getByText(/and 2 more locations/)).toBeInTheDocument();
    });

    it('does not show overflow note when there are exactly 5 or fewer locations', () => {
      const locations = Array.from({ length: 5 }, (_, i) =>
        makeLocation({ name: `Location ${i + 1}`, id: `loc-${i}` })
      );
      render(<LocationsMap locations={locations} loading={false} />);
      expect(screen.queryByText(/more locations/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Click navigation
  // -------------------------------------------------------------------------
  describe('click navigation', () => {
    it('calls navigateToPage with highlight URL when location is clicked', () => {
      const location = makeLocation({ id: 'loc-abc', name: 'Dragon Peak' });
      render(<LocationsMap locations={[location]} loading={false} />);

      // The clickable div wraps the location name
      const nameEl = screen.getByText('Dragon Peak');
      const clickableDiv = nameEl.closest('[class*="cursor-pointer"]');
      expect(clickableDiv).not.toBeNull();
      fireEvent.click(clickableDiv!);

      expect(mockNavigateToPage).toHaveBeenCalledTimes(1);
      expect(mockNavigateToPage).toHaveBeenCalledWith('/locations?highlight=loc-abc');
    });

    it('navigates with the correct id for each individual location', () => {
      const loc1 = makeLocation({ id: 'loc-1', name: 'Iron Fortress' });
      const loc2 = makeLocation({ id: 'loc-2', name: 'Crystal Cave' });
      render(<LocationsMap locations={[loc1, loc2]} loading={false} />);

      const nameEl = screen.getByText('Crystal Cave');
      const clickableDiv = nameEl.closest('[class*="cursor-pointer"]');
      fireEvent.click(clickableDiv!);

      expect(mockNavigateToPage).toHaveBeenCalledWith('/locations?highlight=loc-2');
    });
  });
});
