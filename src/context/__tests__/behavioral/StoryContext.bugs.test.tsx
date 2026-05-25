// src/context/__tests__/behavioral/StoryContext.bugs.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { StoryProvider, useStory } from '../../StoryContext';
import { Chapter } from '../../../types/story';

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
const mockUseChapterData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
}));

jest.mock('../../../hooks/useChapterData', () => ({
  useChapterData: () => mockUseChapterData(),
}));

jest.mock('../../../hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

// Mock Firebase services
jest.mock('../../../services/firebase', () => ({
  __esModule: true,
  default: {
    document: {
      setDocument: jest.fn(),
      getDocument: jest.fn()
    }
  },
}));

// Mock user utilities for proper testing
jest.mock('../../../utils/user-utils', () => ({
  getUserName: jest.fn(),
  getActiveCharacterName: jest.fn()
}));

const { getUserName, getActiveCharacterName } = require('../../../utils/user-utils');

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
    mockFirebaseServices = require('../../../services/firebase').default;

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
    });

    mockFirebaseServices.document.setDocument.mockResolvedValue(undefined);
    mockFirebaseServices.document.getDocument.mockResolvedValue({});
  });

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

      const chapterData: Omit<Chapter, 'id'> = {
        title: 'Test Chapter for Attribution',
        content: 'A test chapter to check user attribution',
        order: 1,
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await storyContext.createChapter(chapterData);
      });

      // BUG DISCOVERY: This test will FAIL until getUserName and getActiveCharacterName utilities are fixed
      // EXPECTED: Proper user attribution metadata should be included
      // ACTUAL: getUserName returns "" and getActiveCharacterName returns null
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        'chapters',
        'chapter-01',
        expect.objectContaining({
          createdByUsername: 'Test User',        // BUG: Currently receives ""
          createdByCharacterName: 'Test Character', // BUG: Currently receives null
          modifiedByUsername: 'Test User',       // BUG: Currently receives ""
          modifiedByCharacterName: 'Test Character' // BUG: Currently receives null
        })
      );

      console.warn('BUG #015: User attribution utilities getUserName/getActiveCharacterName return empty/null values in StoryContext');
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

      // BUG DISCOVERY: This test will FAIL until attribution utilities are fixed
      expect(mockUpdateData).toHaveBeenCalledWith(
        'chapter-01',
        expect.objectContaining({
          modifiedByUsername: 'Test User',       // BUG: Currently receives ""
          modifiedByCharacterName: 'Test Character' // BUG: Currently receives null
        })
      );
    });

    test('BUG: should include proper user attribution in complex reordering operations', async () => {
      const mockChapters = [
        {
          id: 'chapter-01',
          title: 'Chapter 1',
          content: 'First chapter',
          order: 1,
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'chapter-02',
          title: 'Chapter 2',
          content: 'Second chapter',
          order: 2,
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

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      await act(async () => {
        await storyContext.updateChapter('chapter-01', { order: 2 });
      });

      // BUG DISCOVERY: Complex reordering should maintain proper attribution
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        'chapters',
        expect.any(String),
        expect.objectContaining({
          modifiedByUsername: 'Test User',       // BUG: May receive ""
          modifiedByCharacterName: 'Test Character' // BUG: May receive null
        })
      );
    });
  });

  describe('Bug #016: Story Chapter ID Generation System Issues', () => {
    test('BUG: should handle ID generation conflicts with existing chapters', async () => {
      const existingChapters = [
        {
          id: 'chapter-01',
          title: 'Existing Chapter',
          content: 'Already exists',
          order: 1,
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
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

      // Try to create another chapter with order 1 (should insert and shift)
      const conflictingChapterData: Omit<Chapter, 'id'> = {
        title: 'Conflicting Chapter',
        content: 'This should insert before existing',
        order: 1, // Same order as existing chapter
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await storyContext.createChapter(conflictingChapterData);
      });

      // BUG DISCOVERY: Should handle ID conflicts gracefully by shifting existing chapters
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        'chapters',
        'chapter-02', // Existing chapter should be shifted to chapter-02
        expect.objectContaining({
          order: 2 // Order should be incremented
        })
      );

      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        'chapters',
        'chapter-01', // New chapter gets the requested position
        expect.objectContaining({
          title: 'Conflicting Chapter',
          order: 1
        })
      );
    });

    test('BUG: should handle edge cases in chapter ID padding', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      const highOrderChapter: Omit<Chapter, 'id'> = {
        title: 'High Order Chapter',
        content: 'Chapter with high order number',
        order: 999, // Edge case: high order number
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        const chapterId = await storyContext.createChapter(highOrderChapter);
        expect(chapterId).toBe('chapter-999'); // Should handle high numbers
      });

      // BUG DISCOVERY: ID generation should handle edge cases properly
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        'chapters',
        'chapter-999',
        expect.objectContaining({
          id: 'chapter-999',
          order: 999
        })
      );
    });
  });

  describe('Bug #017: Story Chapter Reordering Complexity Issues', () => {
    test('BUG: should handle complex multi-chapter reordering without data loss', async () => {
      const complexChapterSet = [
        {
          id: 'chapter-01',
          title: 'Chapter 1',
          content: 'First chapter with important data',
          order: 1,
          summary: 'Important summary 1',
          subChapters: [{ id: 'sub-1', title: 'Sub 1', content: 'Sub content', order: 1, createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' }],
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'chapter-02',
          title: 'Chapter 2',
          content: 'Second chapter with complex data',
          order: 2,
          summary: 'Important summary 2',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'chapter-03',
          title: 'Chapter 3',
          content: 'Third chapter',
          order: 3,
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
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

      // BUG DISCOVERY: Complex reordering should preserve all chapter data including subChapters and summaries
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        'chapters',
        'chapter-02', // Original chapter 1 should move to position 2
        expect.objectContaining({
          title: 'Chapter 1',
          summary: 'Important summary 1', // BUG: Complex data might be lost
          subChapters: expect.any(Array), // BUG: SubChapters might be lost
          order: 2
        })
      );

      console.warn('BUG #017: Complex chapter reordering may lose subChapters and summary data');
    });

    test('BUG: should handle reordering failure recovery gracefully', async () => {
      const mockChapters = [
        {
          id: 'chapter-01',
          title: 'Chapter 1',
          content: 'First chapter',
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

      // Simulate Firebase failure during reordering
      mockFirebaseServices.document.setDocument.mockRejectedValueOnce(new Error('Firebase write failed'));

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BUG DISCOVERY: Should handle reordering failures gracefully
      await expect(storyContext.updateChapter('chapter-01', { order: 2 })).rejects.toThrow();

      // EXPECTED: System should recover gracefully and not leave database in inconsistent state
      // ACTUAL: May leave database in inconsistent state after partial operations
      console.warn('BUG #017: Reordering failure recovery needs improvement for data consistency');
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
        {
          id: 'chapter-01',
          title: 'Existing Chapter',
          content: 'Already exists with order 1',
          order: 1,
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
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

      const duplicateOrderData: Omit<Chapter, 'id'> = {
        title: 'Duplicate Order Chapter',
        content: 'This chapter also wants order 1',
        order: 1, // Same as existing chapter
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await storyContext.createChapter(duplicateOrderData);
      });

      // BUG DISCOVERY: Should handle duplicate orders by shifting existing chapters
      expect(mockDeleteData).toHaveBeenCalledWith('chapter-01'); // Should delete old position
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        'chapters',
        'chapter-02', // Existing chapter should be moved
        expect.objectContaining({ order: 2 })
      );
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