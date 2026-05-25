// src/components/features/layouts/journal/sections/__tests__/RumorsSection.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RumorsSection from '../RumorsSection';
import { Rumor } from '../../../../../../types/rumor';

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
const BASE_RUMOR: Rumor = {
  id: 'rumor-1',
  title: 'The Dragon Returns',
  content: 'A red dragon has been spotted near the mountains.',
  status: 'unconfirmed',
  sourceType: 'tavern',
  sourceName: 'Old Man Pete',
  relatedNPCs: [],
  relatedLocations: [],
  notes: [],
  createdBy: 'user-1',
  createdByUsername: 'user1',
  dateAdded: '2024-01-01',
};

function makeRumor(overrides: Partial<Rumor> = {}): Rumor {
  return {
    ...BASE_RUMOR,
    id: `rumor-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RumorsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Section heading
  // -------------------------------------------------------------------------
  describe('section heading', () => {
    it('renders the "Recent Rumors" heading', () => {
      render(<RumorsSection rumors={[]} loading={false} />);
      expect(screen.getByText(/Recent Rumors/)).toBeInTheDocument();
    });

    it('shows the count of rumors when not loading', () => {
      const rumors = [makeRumor(), makeRumor()];
      render(<RumorsSection rumors={rumors} loading={false} />);
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    });

    it('shows "..." in heading when loading=true', () => {
      render(<RumorsSection rumors={[]} loading={true} />);
      expect(screen.getByText(/\(\.\.\.\)/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders loading skeleton when loading=true', () => {
      const { container } = render(<RumorsSection rumors={[]} loading={true} />);
      const pulse = container.querySelector('.animate-pulse');
      expect(pulse).toBeInTheDocument();
    });

    it('does not render rumor items while loading', () => {
      const rumors = [makeRumor({ title: 'Secret Rumor' })];
      render(<RumorsSection rumors={rumors} loading={true} />);
      expect(screen.queryByText('Secret Rumor')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    it('shows "No rumors gathered yet" when rumors list is empty', () => {
      render(<RumorsSection rumors={[]} loading={false} />);
      expect(screen.getByText('No rumors gathered yet')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Rumor item content
  // -------------------------------------------------------------------------
  describe('rumor item content', () => {
    it('renders the rumor title', () => {
      const rumors = [makeRumor({ title: 'Dragons in the North' })];
      render(<RumorsSection rumors={rumors} loading={false} />);
      expect(screen.getByText('Dragons in the North')).toBeInTheDocument();
    });

    it('renders the rumor content in quotes', () => {
      const rumors = [makeRumor({ content: 'The king is dead.' })];
      render(<RumorsSection rumors={rumors} loading={false} />);
      expect(screen.getByText(/"The king is dead\."/)).toBeInTheDocument();
    });

    it('renders the source name when provided', () => {
      const rumors = [makeRumor({ sourceName: 'Old Barrister' })];
      render(<RumorsSection rumors={rumors} loading={false} />);
      expect(screen.getByText(/Old Barrister/)).toBeInTheDocument();
    });

    it('does not render source name paragraph when sourceName is absent', () => {
      const rumors = [makeRumor({ sourceName: '' })];
      render(<RumorsSection rumors={rumors} loading={false} />);
      // The em dash + sourceName line should not be present
      expect(screen.queryByText(/^— /)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Status icons — rendered by getStatusIcon()
  // -------------------------------------------------------------------------
  describe('status icon rendering', () => {
    it('renders "confirmed" status icon for confirmed rumors', () => {
      // The Check icon is rendered for confirmed status.
      // We verify by checking the SVG element has the status class.
      const rumors = [makeRumor({ status: 'confirmed' })];
      const { container } = render(<RumorsSection rumors={rumors} loading={false} />);
      const icon = container.querySelector('.rumor-status-confirmed');
      expect(icon).toBeInTheDocument();
    });

    it('renders "false" status icon for debunked rumors', () => {
      const rumors = [makeRumor({ status: 'false' })];
      const { container } = render(<RumorsSection rumors={rumors} loading={false} />);
      const icon = container.querySelector('.rumor-status-false');
      expect(icon).toBeInTheDocument();
    });

    it('renders "unconfirmed" status icon for unconfirmed rumors', () => {
      const rumors = [makeRumor({ status: 'unconfirmed' })];
      const { container } = render(<RumorsSection rumors={rumors} loading={false} />);
      const icon = container.querySelector('.rumor-status-unconfirmed');
      expect(icon).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Sorting behavior
  // -------------------------------------------------------------------------
  describe('sorting behavior', () => {
    it('orders confirmed rumors before unconfirmed ones', () => {
      const rumors = [
        makeRumor({ title: 'Unconfirmed Rumor', status: 'unconfirmed' }),
        makeRumor({ title: 'Confirmed Rumor', status: 'confirmed' }),
      ];
      const { container } = render(<RumorsSection rumors={rumors} loading={false} />);
      const titleSpans = container.querySelectorAll('span.journal-title');
      expect(titleSpans[0].textContent).toBe('Confirmed Rumor');
      expect(titleSpans[1].textContent).toBe('Unconfirmed Rumor');
    });

    it('orders unconfirmed rumors before false ones', () => {
      const rumors = [
        makeRumor({ title: 'False Rumor', status: 'false' }),
        makeRumor({ title: 'Unconfirmed Rumor', status: 'unconfirmed' }),
      ];
      const { container } = render(<RumorsSection rumors={rumors} loading={false} />);
      const titleSpans = container.querySelectorAll('span.journal-title');
      expect(titleSpans[0].textContent).toBe('Unconfirmed Rumor');
      expect(titleSpans[1].textContent).toBe('False Rumor');
    });

    it('orders newer rumors before older ones within the same status', () => {
      const rumors = [
        makeRumor({ title: 'Old Rumor', status: 'unconfirmed', dateAdded: '2023-01-01' }),
        makeRumor({ title: 'New Rumor', status: 'unconfirmed', dateAdded: '2024-06-01' }),
      ];
      const { container } = render(<RumorsSection rumors={rumors} loading={false} />);
      const titleSpans = container.querySelectorAll('span.journal-title');
      expect(titleSpans[0].textContent).toBe('New Rumor');
      expect(titleSpans[1].textContent).toBe('Old Rumor');
    });
  });

  // -------------------------------------------------------------------------
  // Capping at 3 rumors
  // -------------------------------------------------------------------------
  describe('display cap at 3 rumors', () => {
    it('renders at most 3 rumor items', () => {
      const rumors = Array.from({ length: 5 }, (_, i) =>
        makeRumor({ title: `Rumor ${i + 1}`, id: `r-${i}` })
      );
      render(<RumorsSection rumors={rumors} loading={false} />);
      // Rumors 1-3 should be visible, 4-5 should not (they are sliced out before sort)
      // Note: sorting happens first; without explicit status/date all have the same priority
      const allTitles = rumors.map(r => r.title);
      const visibleCount = allTitles.filter(t => screen.queryByText(t) !== null).length;
      expect(visibleCount).toBe(3);
    });

    it('shows "...and N more rumors" when there are more than 3', () => {
      const rumors = Array.from({ length: 5 }, (_, i) =>
        makeRumor({ title: `Rumor ${i + 1}`, id: `r-${i}` })
      );
      render(<RumorsSection rumors={rumors} loading={false} />);
      expect(screen.getByText(/and 2 more rumors/)).toBeInTheDocument();
    });

    it('does not show overflow note when there are exactly 3 or fewer rumors', () => {
      const rumors = Array.from({ length: 3 }, (_, i) =>
        makeRumor({ title: `Rumor ${i + 1}`, id: `r-${i}` })
      );
      render(<RumorsSection rumors={rumors} loading={false} />);
      expect(screen.queryByText(/more rumors/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Click navigation
  // -------------------------------------------------------------------------
  describe('click navigation', () => {
    it('calls navigateToPage with highlight URL when a rumor is clicked', () => {
      const rumor = makeRumor({ id: 'rumor-xyz', title: 'Ancient Prophecy' });
      render(<RumorsSection rumors={[rumor]} loading={false} />);

      const titleEl = screen.getByText('Ancient Prophecy');
      const clickableDiv = titleEl.closest('[class*="cursor-pointer"]');
      expect(clickableDiv).not.toBeNull();
      fireEvent.click(clickableDiv!);

      expect(mockNavigateToPage).toHaveBeenCalledTimes(1);
      expect(mockNavigateToPage).toHaveBeenCalledWith('/rumors?highlight=rumor-xyz');
    });

    it('navigates with the correct id for each individual rumor', () => {
      const rumor1 = makeRumor({ id: 'r-1', title: 'First Rumor' });
      const rumor2 = makeRumor({ id: 'r-2', title: 'Second Rumor' });
      render(<RumorsSection rumors={[rumor1, rumor2]} loading={false} />);

      const titleEl = screen.getByText('Second Rumor');
      const clickableDiv = titleEl.closest('[class*="cursor-pointer"]');
      fireEvent.click(clickableDiv!);

      expect(mockNavigateToPage).toHaveBeenCalledWith('/rumors?highlight=r-2');
    });
  });
});
