// src/components/features/layouts/common/hooks/__tests__/useLayoutData.test.ts
import { renderHook, act } from '@testing-library/react';
import { useLayoutData } from '../useLayoutData';
import type { Chapter } from 'features/storytelling';
import { Quest } from '../../../../../../types/quest';
import { Rumor } from '../../../../../../types/rumor';
import { NPC } from '../../../../../../types/npc';
import { Location } from '../../../../../../types/location';
import { Activity } from '../../../../../../pages/HomePage';

// ---------------------------------------------------------------------------
// No external dependencies to mock — useLayoutData is pure computation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: `ch-${Math.random().toString(36).slice(2)}`,
    title: 'A Chapter',
    content: 'Some content',
    order: 1,
    createdBy: 'user-1',
    createdByUsername: 'user1',
    dateAdded: '2024-01-01',
    ...overrides,
  };
}

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: `q-${Math.random().toString(36).slice(2)}`,
    title: 'A Quest',
    description: 'Quest description',
    status: 'active',
    objectives: [],
    createdBy: 'user-1',
    createdByUsername: 'user1',
    dateAdded: '2024-01-01',
    ...overrides,
  };
}

function makeRumor(overrides: Partial<Rumor> = {}): Rumor {
  return {
    id: `r-${Math.random().toString(36).slice(2)}`,
    title: 'A Rumor',
    content: 'Rumor content',
    status: 'unconfirmed',
    sourceType: 'tavern',
    sourceName: 'Barkeep',
    relatedNPCs: [],
    relatedLocations: [],
    notes: [],
    createdBy: 'user-1',
    createdByUsername: 'user1',
    dateAdded: '2024-01-01',
    ...overrides,
  };
}

function makeNPC(overrides: Partial<NPC> = {}): NPC {
  return {
    id: `npc-${Math.random().toString(36).slice(2)}`,
    name: 'Gandalf',
    status: 'alive',
    relationship: 'friendly',
    description: 'A wizard',
    connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
    notes: [],
    createdBy: 'user-1',
    createdByUsername: 'user1',
    dateAdded: '2024-01-01',
    ...overrides,
  };
}

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: `loc-${Math.random().toString(36).slice(2)}`,
    name: 'A Location',
    type: 'city',
    status: 'visited',
    description: 'A description',
    createdBy: 'user-1',
    createdByUsername: 'user1',
    dateAdded: '2024-01-01',
    ...overrides,
  };
}

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: `act-${Math.random().toString(36).slice(2)}`,
    type: 'npc',
    title: 'An Activity',
    actor: 'user1',
    timestamp: new Date('2024-01-15T12:00:00Z'),
    link: '/npcs',
    ...overrides,
  };
}

// Default minimal props
const defaultProps = {
  chapters: [],
  quests: [],
  rumors: [],
  npcs: [],
  locations: [],
  activities: [],
  chaptersLoading: false,
  questsLoading: false,
  rumorsLoading: false,
  npcsLoading: false,
  locationsLoading: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLayoutData', () => {
  // -------------------------------------------------------------------------
  // Return shape
  // -------------------------------------------------------------------------
  describe('return shape', () => {
    it('exposes all expected keys', () => {
      const { result } = renderHook(() => useLayoutData(defaultProps));
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('activeQuests');
      expect(result.current).toHaveProperty('sortedChapters');
      expect(result.current).toHaveProperty('latestChapter');
      expect(result.current).toHaveProperty('sortedRumors');
      expect(result.current).toHaveProperty('sortedLocations');
      expect(result.current).toHaveProperty('recentActivities');
    });
  });

  // -------------------------------------------------------------------------
  // loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('is true when any loading flag is true', () => {
      const { result } = renderHook(() =>
        useLayoutData({ ...defaultProps, chaptersLoading: true })
      );
      expect(result.current.loading).toBe(true);
    });

    it('is true when npcsLoading is true', () => {
      const { result } = renderHook(() =>
        useLayoutData({ ...defaultProps, npcsLoading: true })
      );
      expect(result.current.loading).toBe(true);
    });

    it('is true when questsLoading is true', () => {
      const { result } = renderHook(() =>
        useLayoutData({ ...defaultProps, questsLoading: true })
      );
      expect(result.current.loading).toBe(true);
    });

    it('is true when rumorsLoading is true', () => {
      const { result } = renderHook(() =>
        useLayoutData({ ...defaultProps, rumorsLoading: true })
      );
      expect(result.current.loading).toBe(true);
    });

    it('is true when locationsLoading is true', () => {
      const { result } = renderHook(() =>
        useLayoutData({ ...defaultProps, locationsLoading: true })
      );
      expect(result.current.loading).toBe(true);
    });

    it('is false when all loading flags are false', () => {
      const { result } = renderHook(() => useLayoutData(defaultProps));
      expect(result.current.loading).toBe(false);
    });

    it('updates to false when loading flags switch from true to false', () => {
      const { result, rerender } = renderHook(
        (props) => useLayoutData(props),
        { initialProps: { ...defaultProps, chaptersLoading: true } }
      );
      expect(result.current.loading).toBe(true);

      rerender({ ...defaultProps, chaptersLoading: false });
      expect(result.current.loading).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // activeQuests
  // -------------------------------------------------------------------------
  describe('activeQuests', () => {
    it('returns only quests with status "active"', () => {
      const quests = [
        makeQuest({ status: 'active' }),
        makeQuest({ status: 'completed' }),
        makeQuest({ status: 'failed' }),
        makeQuest({ status: 'active' }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, quests }));
      expect(result.current.activeQuests).toHaveLength(2);
      result.current.activeQuests.forEach(q => expect(q.status).toBe('active'));
    });

    it('returns empty array when no quests are active', () => {
      const quests = [makeQuest({ status: 'completed' })];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, quests }));
      expect(result.current.activeQuests).toHaveLength(0);
    });

    it('returns empty array when quests list is empty', () => {
      const { result } = renderHook(() => useLayoutData(defaultProps));
      expect(result.current.activeQuests).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // sortedChapters
  // -------------------------------------------------------------------------
  describe('sortedChapters', () => {
    it('sorts chapters by order number ascending', () => {
      const chapters = [
        makeChapter({ title: 'C', order: 3 }),
        makeChapter({ title: 'A', order: 1 }),
        makeChapter({ title: 'B', order: 2 }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, chapters }));
      const titles = result.current.sortedChapters.map(c => c.title);
      expect(titles).toEqual(['A', 'B', 'C']);
    });

    it('sorts chapters without order by dateAdded ascending', () => {
      const chapters = [
        makeChapter({ title: 'Newer', order: undefined as any, dateAdded: '2024-06-01' }),
        makeChapter({ title: 'Older', order: undefined as any, dateAdded: '2024-01-01' }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, chapters }));
      expect(result.current.sortedChapters[0].title).toBe('Older');
      expect(result.current.sortedChapters[1].title).toBe('Newer');
    });

    it('sorts by dateModified when available (preferred over dateAdded)', () => {
      const chapters = [
        makeChapter({
          title: 'RecentlyModified',
          order: undefined as any,
          dateAdded: '2024-01-01',
          dateModified: '2024-06-01',
        }),
        makeChapter({
          title: 'OldlyModified',
          order: undefined as any,
          dateAdded: '2024-05-01',
          dateModified: '2024-01-01',
        }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, chapters }));
      expect(result.current.sortedChapters[0].title).toBe('OldlyModified');
      expect(result.current.sortedChapters[1].title).toBe('RecentlyModified');
    });

    it('returns empty array when no chapters provided', () => {
      const { result } = renderHook(() => useLayoutData(defaultProps));
      expect(result.current.sortedChapters).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // latestChapter
  // -------------------------------------------------------------------------
  describe('latestChapter', () => {
    it('returns null when there are no chapters', () => {
      const { result } = renderHook(() => useLayoutData(defaultProps));
      expect(result.current.latestChapter).toBeNull();
    });

    it('returns the chapter with the highest order number', () => {
      const chapters = [
        makeChapter({ title: 'First', order: 1 }),
        makeChapter({ title: 'Third', order: 3 }),
        makeChapter({ title: 'Second', order: 2 }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, chapters }));
      expect(result.current.latestChapter?.title).toBe('Third');
    });

    it('returns the single chapter when only one exists', () => {
      const chapters = [makeChapter({ title: 'Only Chapter', order: 1 })];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, chapters }));
      expect(result.current.latestChapter?.title).toBe('Only Chapter');
    });
  });

  // -------------------------------------------------------------------------
  // sortedRumors
  // -------------------------------------------------------------------------
  describe('sortedRumors', () => {
    it('orders confirmed rumors before unconfirmed', () => {
      const rumors = [
        makeRumor({ title: 'Unconfirmed', status: 'unconfirmed' }),
        makeRumor({ title: 'Confirmed', status: 'confirmed' }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, rumors }));
      expect(result.current.sortedRumors[0].title).toBe('Confirmed');
    });

    it('orders unconfirmed before false', () => {
      const rumors = [
        makeRumor({ title: 'False', status: 'false' }),
        makeRumor({ title: 'Unconfirmed', status: 'unconfirmed' }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, rumors }));
      expect(result.current.sortedRumors[0].title).toBe('Unconfirmed');
    });

    it('orders newer rumors before older ones within same status', () => {
      const rumors = [
        makeRumor({ title: 'Old', status: 'unconfirmed', dateAdded: '2023-01-01' }),
        makeRumor({ title: 'New', status: 'unconfirmed', dateAdded: '2024-06-01' }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, rumors }));
      expect(result.current.sortedRumors[0].title).toBe('New');
    });

    it('returns empty array when no rumors provided', () => {
      const { result } = renderHook(() => useLayoutData(defaultProps));
      expect(result.current.sortedRumors).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // sortedLocations
  // -------------------------------------------------------------------------
  describe('sortedLocations', () => {
    it('orders explored locations first (before visited and known)', () => {
      const locations = [
        makeLocation({ name: 'Known Place', status: 'known' }),
        makeLocation({ name: 'Explored Place', status: 'explored' }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, locations }));
      expect(result.current.sortedLocations[0].name).toBe('Explored Place');
    });

    it('orders visited before known', () => {
      const locations = [
        makeLocation({ name: 'Known Place', status: 'known' }),
        makeLocation({ name: 'Visited Place', status: 'visited' }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, locations }));
      expect(result.current.sortedLocations[0].name).toBe('Visited Place');
    });

    it('sorts alphabetically within the same status', () => {
      const locations = [
        makeLocation({ name: 'Zephyr Keep', status: 'visited' }),
        makeLocation({ name: 'Amber Cove', status: 'visited' }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, locations }));
      expect(result.current.sortedLocations[0].name).toBe('Amber Cove');
    });

    it('returns empty array when no locations provided', () => {
      const { result } = renderHook(() => useLayoutData(defaultProps));
      expect(result.current.sortedLocations).toHaveLength(0);
    });

    it('note: useLayoutData sorts explored FIRST (opposite of LocationsMap component)', () => {
      // DOCUMENTATION TEST: useLayoutData puts explored first (lines 106-107),
      // while LocationsMap.tsx component sorts explored last (lines 24-27).
      // This is an inconsistency in the codebase — documented here for visibility.
      const locations = [
        makeLocation({ name: 'Explored', status: 'explored' }),
        makeLocation({ name: 'Known', status: 'known' }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, locations }));
      // In useLayoutData: explored comes first
      expect(result.current.sortedLocations[0].status).toBe('explored');
    });
  });

  // -------------------------------------------------------------------------
  // recentActivities
  // -------------------------------------------------------------------------
  describe('recentActivities', () => {
    it('returns at most 4 activities', () => {
      const activities = Array.from({ length: 6 }, (_, i) =>
        makeActivity({ id: `act-${i}`, timestamp: new Date(2024, 0, i + 1) })
      );
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, activities }));
      expect(result.current.recentActivities).toHaveLength(4);
    });

    it('returns activities sorted newest first', () => {
      const older = makeActivity({ id: 'old', timestamp: new Date('2024-01-01') });
      const newer = makeActivity({ id: 'new', timestamp: new Date('2024-06-01') });
      const { result } = renderHook(() =>
        useLayoutData({ ...defaultProps, activities: [older, newer] })
      );
      expect(result.current.recentActivities[0].id).toBe('new');
    });

    it('keeps only the 4 newest activities when there are more than 4', () => {
      const activities = [
        makeActivity({ id: 'a1', timestamp: new Date('2024-01-01') }),
        makeActivity({ id: 'a2', timestamp: new Date('2024-02-01') }),
        makeActivity({ id: 'a3', timestamp: new Date('2024-03-01') }),
        makeActivity({ id: 'a4', timestamp: new Date('2024-04-01') }),
        makeActivity({ id: 'a5', timestamp: new Date('2024-05-01') }),
      ];
      const { result } = renderHook(() => useLayoutData({ ...defaultProps, activities }));
      const ids = result.current.recentActivities.map(a => a.id);
      expect(ids).toEqual(['a5', 'a4', 'a3', 'a2']);
      expect(ids).not.toContain('a1');
    });

    it('returns empty array when no activities provided', () => {
      const { result } = renderHook(() => useLayoutData(defaultProps));
      expect(result.current.recentActivities).toHaveLength(0);
    });
  });
});
