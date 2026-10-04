// src/features/storytelling/chapters/context/__tests__/StoryContext.bugs.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { StoryProvider, useStory } from '../StoryContext';
import { Chapter } from 'features/storytelling/chapters/types';

/**
 * StoryContext Bug Discovery Testing
 *
 * Tests that INTENTIONALLY FAIL to document and track real implementation bugs.
 * These tests define the EXPECTED behavior and will pass once bugs are fixed.
 *
 * IMPORTANT: These tests are designed to fail until bugs are resolved.
 * Do not modify these tests to make them pass - fix the implementation instead.
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseChapterData = jest.fn();
const mockUseFirebaseData = jest.fn();

// No reader in these suites has saved progress.
const mockStoryFirestore = { getDocument: async () => null };

jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useCampaigns: () => mockUseCampaigns(),
  // StoryContext reads the reader's own progress document (T073). One object,
  // so `getDocument` is as stable as the real hook's `useCallback`.
  useGroups: () => ({ activeGroupId: 'group-1' }),
  useFirestore: () => mockStoryFirestore,
}));

jest.mock('features/storytelling/chapters/hooks/useChapterData', () => ({
  useChapterData: () => mockUseChapterData(),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

// Mock Firebase services
jest.mock('core/services/firebase', () => ({
  __esModule: true,
  default: {
    document: {
      setDocument: jest.fn(),
      createDocument: jest.fn(),
      getDocument: jest.fn(),
      batchOperations: jest.fn()
    }
  },
}));

// Mock user utilities for proper testing
jest.mock('core/utils/user-utils', () => ({
  getUserName: jest.fn(),
  getActiveCharacterName: jest.fn()
}));

const { getUserName, getActiveCharacterName } = require('core/utils/user-utils');

const StoryTestComponent = ({ onContextChange }: { onContextChange: (context: any) => void }) => {
  const storyContext = useStory();
  
  React.useEffect(() => {
    onContextChange(storyContext);
  }, [storyContext, onContextChange]);
  
  return <div data-testid="story-bugs-test">Story Bug Tests</div>;
};

describe('StoryContext Bug Discovery Tests', () => {
  let storyContext: any;
  let mockUpdateData: jest.Mock;
  let mockDeleteData: jest.Mock;
  let mockRefreshChapters: jest.Mock;
  let mockFirebaseServices: any;

  beforeEach(() => {
    jest.clearAllMocks();
    storyContext = null;

    // Setup user utilities to return expected values
    getUserName.mockReturnValue('Test User');
    getActiveCharacterName.mockReturnValue('Test Character');

    mockUpdateData = jest.fn();
    mockDeleteData = jest.fn();
    mockRefreshChapters = jest.fn();

    // Get mocked Firebase services
    mockFirebaseServices = require('core/services/firebase').default;

    // Setup authenticated state for bug testing
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user' },
    });

    mockUseUser.mockReturnValue({
      userProfile: { name: 'Test User' },
      activeGroupUserProfile: {
        userId: 'test-user',
        username: 'Test User',
        role: 'member',
        joinedAt: '2025-06-15T00:00:00.000Z',
        activeCharacterId: 'char-1',
        characters: [
          { id: 'char-1', name: 'Test Character' }
        ]
      },
    });

    mockUseCampaigns.mockReturnValue({
      activeCampaignId: 'campaign-1',
    });

    mockUseChapterData.mockReturnValue({
      chapters: [],
      loading: false,
      error: null,
      refreshChapters: mockRefreshChapters,
      hasRequiredContext: true,
    });

    mockUseFirebaseData.mockReturnValue({
      updateData: mockUpdateData,
      deleteData: mockDeleteData,
      // The real hook exposes getData; StoryContext re-fetches progress with it
      // once the campaign context resolves.
      getData: jest.fn().mockResolvedValue([]),
    });

    mockFirebaseServices.document.setDocument.mockResolvedValue(undefined);
    mockFirebaseServices.document.createDocument.mockResolvedValue('chapter-01');
    mockFirebaseServices.document.getDocument.mockResolvedValue({});
    mockFirebaseServices.document.batchOperations.mockResolvedValue(undefined);
  });

  /**
   * The writes of the one batch the last structural change committed (T032).
   * Insert, delete and move are each exactly one `batchOperations` call, so a
   * partial change cannot be left behind.
   */
  const committedBatch = (): Array<{ type: string; collection: string; id: string; data?: any }> => {
    const calls = mockFirebaseServices.document.batchOperations.mock.calls;
    expect(calls).toHaveLength(1);
    return calls[0][0];
  };

  /** The `order` each chapter is moved to by the committed batch, by id. */
  const movesIn = (batch: Array<{ type: string; id: string; data?: any }>) =>
    Object.fromEntries(
      batch.filter((write) => write.type === 'update').map((write) => [write.id, write.data.order])
    );

  const renderStoryContext = () => {
    const handleContextChange = (context: any) => {
      storyContext = context;
    };

    return render(
      <StoryProvider>
        <StoryTestComponent onContextChange={handleContextChange} />
      </StoryProvider>
    );
  };

  describe('Bug #015: Story User Attribution Metadata Issues', () => {
    test('BUG: should include proper user attribution in chapter creation', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      let chapterId = '';
      await act(async () => {
        chapterId = await storyContext.createChapter({
          title: 'Test Chapter for Attribution',
          content: 'A test chapter to check user attribution',
          order: 1,
        });
      });

      // Since T032 the new chapter is written in the batch that also shifts
      // any chapters after it, so its attribution is built here -- with the
      // same builder `createDocument` uses -- and is visible to this test.
      expect(committedBatch()).toContainEqual({
        type: 'set',
        collection: 'groups/group-1/campaigns/campaign-1/chapters',
        id: chapterId,
        data: expect.objectContaining({
          title: 'Test Chapter for Attribution',
          content: 'A test chapter to check user attribution',
          order: 1,
          createdByUsername: 'Test User',
          createdByCharacterName: 'Test Character'
        })
      });
    });

    test('BUG: should include proper user attribution in chapter updates', async () => {
      const mockChapters = [
        {
          id: 'chapter-01',
          title: 'Test Chapter',
          content: 'A test chapter',
          order: 1,
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      mockUseChapterData.mockReturnValue({
        chapters: mockChapters,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      mockUpdateData.mockResolvedValue(undefined);
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      await act(async () => {
        await storyContext.updateChapter('chapter-01', {
          content: 'Updated content'
        });
      });

      // Specifies the correct attribution values; currently passes. The former
      // "will FAIL until attribution utilities are fixed" note referred to the
      // Pattern 1 premise struck on 2026-07-28 — it was never a real defect.
      expect(mockUpdateData).toHaveBeenCalledWith(
        'chapter-01',
        expect.objectContaining({
          modifiedByUsername: 'Test User',
          modifiedByCharacterName: 'Test Character'
        })
      );
    });

    test('BUG: should include proper user attribution in complex reordering operations', async () => {
      const mockChapters = [
        { id: 'chapter-01', title: 'Chapter 1', content: 'First chapter', order: 1, createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' },
        { id: 'chapter-02', title: 'Chapter 2', content: 'Second chapter', order: 2, createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' }
      ];

      mockUseChapterData.mockReturnValue({
        chapters: mockChapters,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      await act(async () => {
        await storyContext.updateChapter('chapter-01', { order: 2 });
      });

      // The moved chapter carries the mover's modification attribution.
      expect(committedBatch()).toContainEqual({
        type: 'update',
        collection: 'groups/group-1/campaigns/campaign-1/chapters',
        id: 'chapter-01',
        data: expect.objectContaining({
          order: 2,
          modifiedByUsername: 'Test User',
          modifiedByCharacterName: 'Test Character'
        })
      });
    });
  });

  describe('Bug #016: Story Chapter ID Generation System Issues', () => {
    test('BUG: should handle ID generation conflicts with existing chapters', async () => {
      const existingChapters = [
        { id: 'chapter-01', title: 'Existing Chapter', content: 'Already exists', order: 1, createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' }
      ];

      mockUseChapterData.mockReturnValue({
        chapters: existingChapters,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // Create another chapter with order 1 (should insert and shift)
      let chapterId = '';
      await act(async () => {
        chapterId = await storyContext.createChapter({
          title: 'Conflicting Chapter',
          content: 'This should insert before existing',
          order: 1,
        });
      });

      // Rewritten for T032: ids no longer come from order, so a second chapter
      // at order 1 cannot collide with `chapter-01`. The existing chapter keeps
      // its id and moves to order 2; the new one gets an id of its own.
      expect(chapterId).not.toBe('chapter-01');
      const batch = committedBatch();
      expect(movesIn(batch)).toEqual({ 'chapter-01': 2 });
      expect(batch).toContainEqual({
        type: 'set',
        collection: 'groups/group-1/campaigns/campaign-1/chapters',
        id: chapterId,
        data: expect.objectContaining({ title: 'Conflicting Chapter', order: 1 })
      });
    });

    // REWRITTEN (T032): ids are no longer padded order numbers, so there is
    // no padding edge case left. What remains of the requirement is that a
    // high order is stored as given.
    test('BUG: should handle a high order number', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      let chapterId = '';
      await act(async () => {
        chapterId = await storyContext.createChapter({
          title: 'High Order Chapter',
          content: 'Chapter with high order number',
          order: 999,
        });
      });

      expect(committedBatch()).toEqual([
        {
          type: 'set',
          collection: 'groups/group-1/campaigns/campaign-1/chapters',
          id: chapterId,
          data: expect.objectContaining({ id: chapterId, order: 999 })
        }
      ]);
    });
  });

  describe('Bug #017: Story Chapter Reordering Complexity Issues', () => {
    test('BUG: should handle complex multi-chapter reordering without data loss', async () => {
      const complexChapterSet = [
        { id: 'chapter-01', title: 'Chapter 1', content: 'First chapter with important data', order: 1, summary: 'Important summary 1', createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' },
        { id: 'chapter-02', title: 'Chapter 2', content: 'Second chapter with complex data', order: 2, summary: 'Important summary 2', createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' },
        { id: 'chapter-03', title: 'Chapter 3', content: 'Third chapter', order: 3, createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' }
      ];

      mockUseChapterData.mockReturnValue({
        chapters: complexChapterSet,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // Move chapter 3 to position 1 (complex reordering)
      await act(async () => {
        await storyContext.updateChapter('chapter-03', { order: 1 });
      });

      // Rewritten for T032. Reordering used to rewrite each chapter's whole
      // document under a new id, so its summary had to be carried along. Now
      // only `order` is written to the chapters it passes, and no document is
      // rewritten or deleted -- there is nothing a reorder could drop.
      const batch = committedBatch();
      expect(batch).toContainEqual({ type: 'update', collection: 'groups/group-1/campaigns/campaign-1/chapters', id: 'chapter-01', data: { order: 2 } });
      expect(batch).toContainEqual({ type: 'update', collection: 'groups/group-1/campaigns/campaign-1/chapters', id: 'chapter-02', data: { order: 3 } });
      expect(batch.every((write) => write.type === 'update')).toBe(true);
      expect(mockFirebaseServices.document.setDocument).not.toHaveBeenCalled();
      expect(mockDeleteData).not.toHaveBeenCalled();
    });

    test('BUG: should handle reordering failure recovery gracefully', async () => {
      const mockChapters = [
        { id: 'chapter-01', title: 'Chapter 1', content: 'First chapter', order: 1, createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' }
      ];

      mockUseChapterData.mockReturnValue({
        chapters: mockChapters,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      // Simulate Firebase failure during reordering
      mockFirebaseServices.document.batchOperations.mockRejectedValueOnce(new Error('Firebase write failed'));

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // The failure reaches the caller...
      await expect(storyContext.updateChapter('chapter-01', { order: 2 })).rejects.toThrow('Firebase write failed');

      // ...and, the batch being atomic, it was the only write attempted: the
      // database cannot be left half-reordered.
      expect(mockFirebaseServices.document.batchOperations).toHaveBeenCalledTimes(1);
      expect(mockFirebaseServices.document.setDocument).not.toHaveBeenCalled();
      expect(mockDeleteData).not.toHaveBeenCalled();
    });
  });

  describe('Bug #018: Story Progress Tracking Integration Issues', () => {
    test('BUG: should properly integrate progress tracking with chapter operations', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // Mock chapters data with hasRequiredContext
      mockUseChapterData.mockReturnValue({
        chapters: [],
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      // BUG DISCOVERY: Progress tracking should be properly initialized
      expect(storyContext.storyProgress).toEqual(
        expect.objectContaining({
          currentChapter: '',
          lastRead: expect.any(Date),
          chapterProgress: {}
        })
      );

      // Progress methods should be available and functional
      expect(typeof storyContext.updateChapterProgress).toBe('function');
      expect(typeof storyContext.markChapterComplete).toBe('function');
      expect(typeof storyContext.getReadingProgress).toBe('function');
    });

    test('BUG: should handle progress updates without proper context gracefully', async () => {
      mockUseChapterData.mockReturnValue({
        chapters: [],
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: false, // No context available
      });

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BUG DISCOVERY: Progress updates should handle missing context gracefully
      await act(async () => {
        await storyContext.updateChapterProgress('chapter-01', { lastPosition: 50 });
      });

      // Should not crash and should log appropriate warning
      // EXPECTED: Graceful handling with appropriate user feedback
      // ACTUAL: May silently fail or cause issues
      console.warn('BUG #018: Progress tracking may not handle missing context gracefully');
    });
  });

  describe('Bug #019: Story Chapter Order Validation Issues', () => {
    test('BUG: should validate chapter order constraints properly', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      const invalidChapterData: Omit<Chapter, 'id'> = {
        title: 'Invalid Order Chapter',
        content: 'Chapter with invalid order',
        order: 0, // BUG: Order 0 should be invalid
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      // BUG DISCOVERY: Should validate order constraints
      await expect(storyContext.createChapter(invalidChapterData)).rejects.toThrow();

      // Negative orders should also be rejected
      const negativeOrderData = { ...invalidChapterData, order: -1 };
      await expect(storyContext.createChapter(negativeOrderData)).rejects.toThrow();
    });

    test('BUG: should handle duplicate order assignments correctly', async () => {
      const existingChapters = [
        { id: 'chapter-01', title: 'Existing Chapter', content: 'Already exists with order 1', order: 1, createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' }
      ];

      mockUseChapterData.mockReturnValue({
        chapters: existingChapters,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      await act(async () => {
        await storyContext.createChapter({
          title: 'Duplicate Order Chapter',
          content: 'This chapter also wants order 1',
          order: 1,
        });
      });

      // Duplicate orders are resolved by moving the existing chapter on by
      // one. Rewritten for T032: it moves by its `order` alone, keeping its id,
      // instead of being deleted and rewritten as `chapter-02`.
      expect(movesIn(committedBatch())).toEqual({ 'chapter-01': 2 });
      expect(mockDeleteData).not.toHaveBeenCalled();
    });
  });

  describe('Bug Documentation: Error Boundary Integration', () => {
    test('BUG: useStory hook error should integrate properly with React error boundaries', () => {
      // This test documents the React error boundary integration issue
      // The hook throws correctly but error boundary integration could be improved
      
      const TestComponent = () => {
        try {
          useStory();
          return <div>Should not reach here</div>;
        } catch (error) {
          // BUG: Error boundary integration could be improved
          console.warn('BUG: React error boundary integration issue documented for StoryContext');
          throw error; // Re-throw for proper error boundary handling
        }
      };

      // Document the expected behavior vs actual behavior
      expect(() => render(<TestComponent />)).toThrow(
        'useStory must be used within a StoryProvider'
      );
    });
  });
});

/**
 * Bug Test Summary
 * 
 * These tests are INTENTIONALLY FAILING to serve as:
 * 1. Bug documentation and tracking
 * 2. Regression prevention once bugs are fixed
 * 3. Specification of expected behavior
 * 
 * DO NOT modify these tests to make them pass.
 * Fix the implementation to make the tests pass.
 * 
 * Bugs Tracked:
 * - #015: Story User Attribution Metadata Issues (High Priority)
 * - #016: Story Chapter ID Generation System Issues (Medium Priority)  
 * - #017: Story Chapter Reordering Complexity Issues (Medium Priority)
 * - #018: Story Progress Tracking Integration Issues (Medium Priority)
 * - #019: Story Chapter Order Validation Issues (Low Priority)
 * - React Error Boundary Integration (Low Priority)
 */