// src/components/features/layouts/common/hooks/__tests__/useActivityDisplay.test.ts
import { renderHook, act } from '@testing-library/react';
import { useActivityDisplay } from '../useActivityDisplay';
import { Activity } from '../../../../../../pages/HomePage';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../../../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

// Mock only getRelativeTime and formatJournalDate from dateFormatter
jest.mock('../../utils/dateFormatter', () => ({
  getRelativeTime: jest.fn((date: Date) => `relative:${date.toISOString()}`),
  formatJournalDate: jest.fn((date: Date) => `journal:${date.toISOString()}`),
}));

// Mock getContentTypeLabel from contentTypeUtils
jest.mock('../../utils/contentTypeUtils', () => ({
  getContentTypeLabel: jest.fn((type: string) => `label:${type}`),
}));

const { useNavigation } = require('../../../../../../context/NavigationContext');
const { getRelativeTime, formatJournalDate } = require('../../utils/dateFormatter');
const { getContentTypeLabel } = require('../../utils/contentTypeUtils');

const mockNavigateToPage = jest.fn();

function setupMocks() {
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: `act-${Math.random().toString(36).slice(2)}`,
    type: 'npc',
    title: 'Test Activity',
    actor: 'user1',
    timestamp: new Date('2024-01-15T12:00:00Z'),
    link: '/npcs?highlight=npc-1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useActivityDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------
  describe('return shape', () => {
    it('exposes activities, formatDate, handleActivityClick, and getTypeLabel', () => {
      const { result } = renderHook(() =>
        useActivityDisplay({ activities: [] })
      );
      expect(result.current).toHaveProperty('activities');
      expect(result.current).toHaveProperty('formatDate');
      expect(result.current).toHaveProperty('handleActivityClick');
      expect(result.current).toHaveProperty('getTypeLabel');
    });
  });

  // -------------------------------------------------------------------------
  // Default limit
  // -------------------------------------------------------------------------
  describe('default limit (4)', () => {
    it('returns at most 4 activities when no limit is specified', () => {
      const activities = Array.from({ length: 7 }, (_, i) =>
        makeActivity({ id: `act-${i}`, timestamp: new Date(2024, 0, i + 1) })
      );
      const { result } = renderHook(() =>
        useActivityDisplay({ activities })
      );
      expect(result.current.activities).toHaveLength(4);
    });

    it('returns all activities when fewer than 4 exist', () => {
      const activities = [makeActivity(), makeActivity()];
      const { result } = renderHook(() =>
        useActivityDisplay({ activities })
      );
      expect(result.current.activities).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Custom limit
  // -------------------------------------------------------------------------
  describe('custom limit', () => {
    it('respects a limit of 2', () => {
      const activities = Array.from({ length: 5 }, (_, i) =>
        makeActivity({ id: `act-${i}` })
      );
      const { result } = renderHook(() =>
        useActivityDisplay({ activities, limit: 2 })
      );
      expect(result.current.activities).toHaveLength(2);
    });

    it('respects a limit larger than the list size', () => {
      const activities = [makeActivity()];
      const { result } = renderHook(() =>
        useActivityDisplay({ activities, limit: 10 })
      );
      expect(result.current.activities).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Sorting (newest first)
  // -------------------------------------------------------------------------
  describe('sorting by timestamp (newest first)', () => {
    it('returns activities sorted newest first', () => {
      const older = makeActivity({ id: 'old', timestamp: new Date('2024-01-01T00:00:00Z') });
      const newer = makeActivity({ id: 'new', timestamp: new Date('2024-06-01T00:00:00Z') });
      const { result } = renderHook(() =>
        useActivityDisplay({ activities: [older, newer] })
      );
      expect(result.current.activities[0].id).toBe('new');
      expect(result.current.activities[1].id).toBe('old');
    });

    it('applies limit AFTER sorting so the newest items are kept', () => {
      const old1 = makeActivity({ id: 'old1', timestamp: new Date('2024-01-01') });
      const old2 = makeActivity({ id: 'old2', timestamp: new Date('2024-01-02') });
      const new1 = makeActivity({ id: 'new1', timestamp: new Date('2024-06-01') });
      const new2 = makeActivity({ id: 'new2', timestamp: new Date('2024-06-02') });
      const new3 = makeActivity({ id: 'new3', timestamp: new Date('2024-06-03') });

      const { result } = renderHook(() =>
        useActivityDisplay({ activities: [old1, old2, new1, new2, new3], limit: 3 })
      );
      const ids = result.current.activities.map(a => a.id);
      expect(ids).toEqual(['new3', 'new2', 'new1']);
      expect(ids).not.toContain('old1');
      expect(ids).not.toContain('old2');
    });
  });

  // -------------------------------------------------------------------------
  // Type filter
  // -------------------------------------------------------------------------
  describe('type filter', () => {
    it('returns only activities matching the filter type', () => {
      const activities = [
        makeActivity({ type: 'npc', title: 'NPC Activity' }),
        makeActivity({ type: 'quest', title: 'Quest Activity' }),
        makeActivity({ type: 'npc', title: 'Another NPC' }),
      ];
      const { result } = renderHook(() =>
        useActivityDisplay({ activities, filter: 'npc' })
      );
      expect(result.current.activities).toHaveLength(2);
      result.current.activities.forEach(a => expect(a.type).toBe('npc'));
    });

    it('returns all activities when filter is null', () => {
      const activities = [
        makeActivity({ type: 'npc' }),
        makeActivity({ type: 'quest' }),
        makeActivity({ type: 'rumor' }),
      ];
      const { result } = renderHook(() =>
        useActivityDisplay({ activities, filter: null })
      );
      expect(result.current.activities).toHaveLength(3);
    });

    it('returns empty array when no activities match the filter', () => {
      const activities = [makeActivity({ type: 'npc' })];
      const { result } = renderHook(() =>
        useActivityDisplay({ activities, filter: 'quest' })
      );
      expect(result.current.activities).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // formatDate function
  // -------------------------------------------------------------------------
  describe('formatDate function', () => {
    it('calls getRelativeTime when journalStyle=false (default)', () => {
      const { result } = renderHook(() =>
        useActivityDisplay({ activities: [], journalStyle: false })
      );
      const date = new Date('2024-03-10');
      result.current.formatDate(date);
      expect(getRelativeTime).toHaveBeenCalledWith(date);
      expect(formatJournalDate).not.toHaveBeenCalled();
    });

    it('calls formatJournalDate when journalStyle=true', () => {
      const { result } = renderHook(() =>
        useActivityDisplay({ activities: [], journalStyle: true })
      );
      const date = new Date('2024-03-10');
      result.current.formatDate(date);
      expect(formatJournalDate).toHaveBeenCalledWith(date);
      expect(getRelativeTime).not.toHaveBeenCalled();
    });

    it('returns the result from getRelativeTime in default mode', () => {
      (getRelativeTime as jest.Mock).mockReturnValue('2 hours ago');
      const { result } = renderHook(() =>
        useActivityDisplay({ activities: [] })
      );
      const formatted = result.current.formatDate(new Date());
      expect(formatted).toBe('2 hours ago');
    });

    it('returns the result from formatJournalDate in journal mode', () => {
      (formatJournalDate as jest.Mock).mockReturnValue('the 10th of March');
      const { result } = renderHook(() =>
        useActivityDisplay({ activities: [], journalStyle: true })
      );
      const formatted = result.current.formatDate(new Date('2024-03-10'));
      expect(formatted).toBe('the 10th of March');
    });
  });

  // -------------------------------------------------------------------------
  // handleActivityClick
  // -------------------------------------------------------------------------
  describe('handleActivityClick', () => {
    it('calls navigateToPage with the activity link', () => {
      const { result } = renderHook(() =>
        useActivityDisplay({ activities: [] })
      );
      const activity = makeActivity({ link: '/quests?highlight=q-1' });
      result.current.handleActivityClick(activity);
      expect(mockNavigateToPage).toHaveBeenCalledWith('/quests?highlight=q-1');
    });

    it('calls navigateToPage with the exact link from the activity', () => {
      const { result } = renderHook(() =>
        useActivityDisplay({ activities: [] })
      );
      const activity1 = makeActivity({ link: '/npcs?highlight=npc-1' });
      const activity2 = makeActivity({ link: '/rumors?highlight=r-99' });
      result.current.handleActivityClick(activity1);
      result.current.handleActivityClick(activity2);
      expect(mockNavigateToPage).toHaveBeenNthCalledWith(1, '/npcs?highlight=npc-1');
      expect(mockNavigateToPage).toHaveBeenNthCalledWith(2, '/rumors?highlight=r-99');
    });
  });

  // -------------------------------------------------------------------------
  // getTypeLabel
  // -------------------------------------------------------------------------
  describe('getTypeLabel', () => {
    it('is the getContentTypeLabel utility function', () => {
      const { result } = renderHook(() =>
        useActivityDisplay({ activities: [] })
      );
      result.current.getTypeLabel('quest');
      expect(getContentTypeLabel).toHaveBeenCalledWith('quest');
    });

    it('returns the label produced by getContentTypeLabel', () => {
      (getContentTypeLabel as jest.Mock).mockReturnValue('Quest');
      const { result } = renderHook(() =>
        useActivityDisplay({ activities: [] })
      );
      expect(result.current.getTypeLabel('quest')).toBe('Quest');
    });
  });
});
