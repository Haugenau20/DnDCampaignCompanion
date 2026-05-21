// src/components/features/layouts/journal/sections/__tests__/RecentActivityChronicle.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecentActivityChronicle from '../RecentActivityChronicle';
import { Activity } from '../../../../../../pages/HomePage';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
// useActivityDisplay uses useNavigation internally — mock at the context level
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
let idCounter = 0;
function makeActivity(overrides: Partial<Activity> = {}): Activity {
  idCounter += 1;
  return {
    id: `activity-${idCounter}`,
    type: 'npc',
    title: `Activity ${idCounter}`,
    description: undefined,
    actor: 'user-1',
    timestamp: new Date('2024-06-15T10:00:00Z'),
    link: `/npcs?highlight=activity-${idCounter}`,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RecentActivityChronicle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    idCounter = 0;
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Section heading
  // -------------------------------------------------------------------------
  describe('section heading', () => {
    it('renders "Recent Events" heading', () => {
      render(<RecentActivityChronicle activities={[]} loading={false} />);
      expect(screen.getByText('Recent Events')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders a spinner when loading=true', () => {
      const { container } = render(
        <RecentActivityChronicle activities={[]} loading={true} />
      );
      // Loader2 renders as an svg with animate-spin class
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('does not render activity items while loading', () => {
      const activities = [makeActivity({ title: 'Hidden Activity' })];
      render(<RecentActivityChronicle activities={activities} loading={true} />);
      expect(screen.queryByText('Hidden Activity')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    it('shows "No recent events recorded" message when no activities', () => {
      render(<RecentActivityChronicle activities={[]} loading={false} />);
      expect(screen.getByText('No recent events recorded')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Activity items rendering
  // -------------------------------------------------------------------------
  describe('activity items rendering', () => {
    it('renders the title of each activity', () => {
      const activities = [
        makeActivity({ title: 'Met the King', type: 'npc' }),
        makeActivity({ title: 'Discovered a Ruin', type: 'location' }),
      ];
      render(<RecentActivityChronicle activities={activities} loading={false} />);
      expect(screen.getByText('Met the King')).toBeInTheDocument();
      expect(screen.getByText('Discovered a Ruin')).toBeInTheDocument();
    });

    it('renders the type label for each activity', () => {
      const activities = [makeActivity({ type: 'npc', title: 'NPC Activity' })];
      render(<RecentActivityChronicle activities={activities} loading={false} />);
      // getContentTypeLabel('npc') === 'NPC'
      expect(screen.getByText('NPC')).toBeInTheDocument();
    });

    it('renders the type label "Quest" for quest-type activities', () => {
      const activities = [makeActivity({ type: 'quest', title: 'A Quest' })];
      render(<RecentActivityChronicle activities={activities} loading={false} />);
      expect(screen.getByText('Quest')).toBeInTheDocument();
    });

    it('renders the type label "Location" for location-type activities', () => {
      const activities = [makeActivity({ type: 'location', title: 'A Location' })];
      render(<RecentActivityChronicle activities={activities} loading={false} />);
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('renders the type label "Rumor" for rumor-type activities', () => {
      const activities = [makeActivity({ type: 'rumor', title: 'A Rumor' })];
      render(<RecentActivityChronicle activities={activities} loading={false} />);
      expect(screen.getByText('Rumor')).toBeInTheDocument();
    });

    it('renders activity description when provided', () => {
      const activities = [
        makeActivity({ title: 'A Visit', description: 'The party met a mysterious stranger' }),
      ];
      render(<RecentActivityChronicle activities={activities} loading={false} />);
      expect(
        screen.getByText(/"The party met a mysterious stranger"/)
      ).toBeInTheDocument();
    });

    it('does not render a description element when description is absent', () => {
      const activities = [makeActivity({ title: 'No Desc', description: undefined })];
      const { container } = render(
        <RecentActivityChronicle activities={activities} loading={false} />
      );
      const descEl = container.querySelector('.journal-activity-description');
      expect(descEl).not.toBeInTheDocument();
    });

    it('renders the journal-formatted date for each activity', () => {
      // June 15 → "the 15th of <month>" (locale-neutral assertion on day ordinal)
      const activities = [
        makeActivity({
          title: 'Dated Event',
          timestamp: new Date('2024-06-15T10:00:00'),
        }),
      ];
      render(<RecentActivityChronicle activities={activities} loading={false} />);
      // formatJournalDate produces "the Nth of <MonthName>"
      // We assert on the day ordinal portion which is locale-neutral
      expect(screen.getByText(/the 15th of /)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Limit: only shows first 4 activities (most recent first)
  // -------------------------------------------------------------------------
  describe('activity limit and ordering', () => {
    it('shows at most 4 activities even when more are provided', () => {
      // Create 6 activities with different timestamps so ordering is deterministic
      const activities = Array.from({ length: 6 }, (_, i) =>
        makeActivity({
          title: `Activity ${i + 1}`,
          timestamp: new Date(2024, 0, i + 1, 10, 0, 0),
        })
      );
      render(<RecentActivityChronicle activities={activities} loading={false} />);
      // The hook limits to 4, newest first
      // Timestamps: Jan 1 → Jan 6 – newest are 6,5,4,3
      expect(screen.getByText('Activity 6')).toBeInTheDocument();
      expect(screen.getByText('Activity 5')).toBeInTheDocument();
      expect(screen.getByText('Activity 4')).toBeInTheDocument();
      expect(screen.getByText('Activity 3')).toBeInTheDocument();
      expect(screen.queryByText('Activity 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Activity 1')).not.toBeInTheDocument();
    });

    it('displays activities ordered from newest to oldest', () => {
      const activities = [
        makeActivity({ title: 'Older Event', timestamp: new Date('2024-01-01') }),
        makeActivity({ title: 'Newer Event', timestamp: new Date('2024-06-15') }),
      ];
      const { container } = render(
        <RecentActivityChronicle activities={activities} loading={false} />
      );
      // Find the activity title spans specifically (not the heading)
      const titleSpans = container.querySelectorAll('.journal-activity-title');
      expect(titleSpans[0]).toHaveTextContent('Newer Event');
      expect(titleSpans[1]).toHaveTextContent('Older Event');
    });
  });

  // -------------------------------------------------------------------------
  // Separator element between activity items
  // -------------------------------------------------------------------------
  describe('separator between items', () => {
    it('renders a separator between multiple activities', () => {
      const activities = [
        makeActivity({ title: 'First' }),
        makeActivity({ title: 'Second' }),
      ];
      const { container } = render(
        <RecentActivityChronicle activities={activities} loading={false} />
      );
      // The separator is a div with class journal-activity-separator
      const separators = container.querySelectorAll('.journal-activity-separator');
      expect(separators).toHaveLength(1); // between 2 items = 1 separator
    });

    it('does not render a separator after the last activity', () => {
      const activities = [makeActivity({ title: 'Only One' })];
      const { container } = render(
        <RecentActivityChronicle activities={activities} loading={false} />
      );
      const separators = container.querySelectorAll('.journal-activity-separator');
      expect(separators).toHaveLength(0);
    });

    it('renders N-1 separators for N activities', () => {
      const activities = [
        makeActivity({ title: 'One' }),
        makeActivity({ title: 'Two' }),
        makeActivity({ title: 'Three' }),
      ];
      const { container } = render(
        <RecentActivityChronicle activities={activities} loading={false} />
      );
      const separators = container.querySelectorAll('.journal-activity-separator');
      expect(separators).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Click navigation
  // -------------------------------------------------------------------------
  describe('activity click navigation', () => {
    it('calls navigateToPage with the activity link when an item is clicked', () => {
      const activity = makeActivity({
        title: 'Click Me',
        link: '/npcs?highlight=npc-abc',
      });
      render(<RecentActivityChronicle activities={[activity]} loading={false} />);

      const item = screen.getByText('Click Me').closest('div[class*="cursor-pointer"]');
      expect(item).not.toBeNull();
      fireEvent.click(item!);

      expect(mockNavigateToPage).toHaveBeenCalledTimes(1);
      expect(mockNavigateToPage).toHaveBeenCalledWith('/npcs?highlight=npc-abc');
    });

    it('navigates to the correct link for each individual activity', () => {
      const activity1 = makeActivity({ title: 'Alpha', link: '/npcs?highlight=a' });
      const activity2 = makeActivity({ title: 'Beta', link: '/quests?highlight=b' });
      render(
        <RecentActivityChronicle activities={[activity1, activity2]} loading={false} />
      );

      const item2 = screen.getByText('Beta').closest('div[class*="cursor-pointer"]');
      fireEvent.click(item2!);

      expect(mockNavigateToPage).toHaveBeenCalledWith('/quests?highlight=b');
    });
  });
});
