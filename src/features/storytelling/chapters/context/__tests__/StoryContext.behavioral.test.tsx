// src/features/storytelling/chapters/context/__tests__/StoryContext.behavioral.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { StoryProvider, useStory } from '../StoryContext';
import { Chapter } from 'features/storytelling/chapters/types';

/**
 * Story Context Behavioral Testing
 *
 * Tests ACTUAL Story context behavior with mocked Firebase dependencies.
 * This tests the real Story context logic (black box) while mocking external dependencies.
 *
 * STRATEGY:
 * - Use real StoryProvider and useStory hook
 * - Mock Firebase dependencies (useAuth, useChapterData, etc.)
 * - Test actual Story context behavior and logic
 * - Verify correct data is passed to Firebase (without testing Firebase itself)
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseChapterData = jest.fn();
const mockUseFirebaseData = jest.fn();

// Mock the Firebase context hooks
jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useCampaigns: () => mockUseCampaigns(),
}));

// Mock the data hooks
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
      getDocument: jest.fn()
    }
  },
}));

// Mock user utilities for proper testing
jest.mock('core/utils/user-utils', () => ({
  getUserName: jest.fn(),
  getActiveCharacterName: jest.fn()
}));

const { getUserName, getActiveCharacterName } = require('core/utils/user-utils');

// Test component that uses the Story context
const StoryTestComponent = ({ onContextChange }: { onContextChange: (context: any) => void }) => {
  const storyContext = useStory();
  
  React.useEffect(() => {
    onContextChange(storyContext);
  }, [storyContext, onContextChange]);
  
  return <div data-testid="story-test">Story Context Test</div>;
};

describe('StoryContext Behavioral Testing', () => {
  let storyContext: any;
  let mockUpdateData: jest.Mock;
  let mockDeleteData: jest.Mock;
  let mockUpdateProgressData: jest.Mock;
  let mockRefreshChapters: jest.Mock;
  let mockFirebaseServices: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    storyContext = null;

    // Setup user utilities to return expected values
    getUserName.mockReturnValue('Test User');
    getActiveCharacterName.mockReturnValue('Test Character');

    // Create mock Firebase operations
    mockUpdateData = jest.fn();
    mockDeleteData = jest.fn();
    mockUpdateProgressData = jest.fn();
    mockRefreshChapters = jest.fn();

    // Get mocked Firebase services
    mockFirebaseServices = require('core/services/firebase').default;

    // Setup default mock returns
    mockUseAuth.mockReturnValue({
      user: null, // Start unauthenticated
    });

    mockUseUser.mockReturnValue({
      userProfile: null,
      activeGroupUserProfile: null,
    });

    mockUseCampaigns.mockReturnValue({
      activeCampaignId: null,
    });

    mockUseChapterData.mockReturnValue({
      chapters: [],
      loading: false,
      error: null,
      refreshChapters: mockRefreshChapters,
      hasRequiredContext: false, // Start without context
    });

    // Mock Firebase data operations
    mockUseFirebaseData.mockReturnValue({
      updateData: mockUpdateData,
      deleteData: mockDeleteData,
      // The real hook exposes getData; StoryContext re-fetches progress with it
      // once the campaign context resolves.
      getData: jest.fn().mockResolvedValue([]),
    });

    // Mock Firebase services
    mockFirebaseServices.document.setDocument.mockResolvedValue(undefined);
    mockFirebaseServices.document.createDocument.mockResolvedValue('mock-id');
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

  describe('Story Context Initialization Behavior', () => {
    test('should provide empty chapters list when no data loaded', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BEHAVIOR: Story context should start with empty chapters list
      expect(storyContext.chapters).toEqual([]);
      expect(storyContext.isLoading).toBe(false);
      expect(storyContext.error).toBe('Please select a group and campaign');
      expect(storyContext.hasRequiredContext).toBe(false);
    });

    test('should provide all required story operations', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BEHAVIOR: All story operations should be available as functions
      const requiredOperations = [
        'getChapterById', 'updateChapterProgress', 'updateCurrentChapter',
        'getNextChapter', 'getPreviousChapter', 'markChapterComplete',
        'getReadingProgress', 'createChapter', 'updateChapter', 'deleteChapter',
        'reorderChapters'
      ];

      requiredOperations.forEach(operation => {
        expect(typeof storyContext[operation]).toBe('function');
      });
    });

    test('should provide proper error message when no context available', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BEHAVIOR: Should show appropriate error when no group/campaign selected
      expect(storyContext.error).toBe('Please select a group and campaign');
    });
  });

  describe('Story Authentication Requirements', () => {
    test('should reject createChapter when user not authenticated', async () => {
      mockUseChapterData.mockReturnValue({
        chapters: [],
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true, // Context available but not authenticated
      });

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      const chapterData: Omit<Chapter, 'id'> = {
        title: 'Test Chapter',
        content: 'A test chapter for authentication checking',
        order: 1,
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      // BEHAVIOR: Should reject when not authenticated
      await expect(storyContext.createChapter(chapterData)).rejects.toThrow(
        'You must be signed in to create chapters'
      );

      expect(mockFirebaseServices.document.setDocument).not.toHaveBeenCalled();
    });

    test('should reject updateChapter when user not authenticated', async () => {
      mockUseChapterData.mockReturnValue({
        chapters: [{
          id: 'chapter-01',
          title: 'Test Chapter',
          content: 'Test content',
          order: 1,
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }],
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BEHAVIOR: Should reject when not authenticated
      await expect(storyContext.updateChapter('chapter-01', { title: 'Updated' })).rejects.toThrow(
        'You must be signed in to update chapters'
      );

      expect(mockUpdateData).not.toHaveBeenCalled();
    });

    test('should reject deleteChapter when user not authenticated', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BEHAVIOR: Should reject when not authenticated
      await expect(storyContext.deleteChapter('chapter-01')).rejects.toThrow(
        'You must be signed in to delete chapters'
      );

      expect(mockDeleteData).not.toHaveBeenCalled();
    });

    test('should reject operations when no group/campaign context', async () => {
      // Setup authenticated but no context
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
      });

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      const chapterData: Omit<Chapter, 'id'> = {
        title: 'Test Chapter',
        content: 'Test content',
        order: 1,
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      // BEHAVIOR: Should reject when no active group or campaign
      await expect(storyContext.createChapter(chapterData)).rejects.toThrow(
        'No active group or campaign selected'
      );
    });
  });

  describe('Chapter Creation Behavior', () => {
    beforeEach(() => {
      // Setup authenticated state with context
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
    });

    test('should create chapter with basic data structure', async () => {
      mockFirebaseServices.document.createDocument.mockResolvedValue('chapter-01');
      mockFirebaseServices.document.getDocument.mockResolvedValue({});

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      const chapterData: Omit<Chapter, 'id'> = {
        title: 'The Beginning',
        content: 'Our adventure starts in the tavern...',
        order: 1,
        summary: 'The party meets',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        const chapterId = await storyContext.createChapter(chapterData);
        expect(chapterId).toBe('chapter-01');
      });

      // BEHAVIOR: Should create chapter with generated ID via the attribution-aware
      // create path. Attribution itself (createdBy/modifiedBy/etc.) is now stamped
      // by DocumentService.createDocument, not by StoryContext, so this test only
      // verifies the domain data reaches the write call correctly.
      expect(mockFirebaseServices.document.createDocument).toHaveBeenCalledWith(
        'chapters',
        expect.objectContaining({
          title: 'The Beginning',
          content: 'Our adventure starts in the tavern...',
          order: 1,
          id: 'chapter-01'
        }),
        'chapter-01'
      );
    });

    test('should generate consistent chapter IDs from order', async () => {
      mockFirebaseServices.document.getDocument.mockResolvedValue({});

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      const testCases = [
        { order: 1, expectedId: 'chapter-01' },
        { order: 5, expectedId: 'chapter-05' },
        { order: 12, expectedId: 'chapter-12' },
        { order: 100, expectedId: 'chapter-100' }
      ];

      for (const testCase of testCases) {
        mockFirebaseServices.document.createDocument.mockClear();
        mockFirebaseServices.document.createDocument.mockResolvedValue(testCase.expectedId);

        const chapterData: Omit<Chapter, 'id'> = {
          title: `Chapter ${testCase.order}`,
          content: 'Test content',
          order: testCase.order,
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        };

        await act(async () => {
          const chapterId = await storyContext.createChapter(chapterData);
          expect(chapterId).toBe(testCase.expectedId);
        });

        expect(mockFirebaseServices.document.createDocument).toHaveBeenCalledWith(
          'chapters',
          expect.objectContaining({ id: testCase.expectedId, order: testCase.order }),
          testCase.expectedId
        );
      }
    });

    test('should handle chapter insertion with reordering', async () => {
      const existingChapters = [
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
        chapters: existingChapters,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      mockFirebaseServices.document.setDocument.mockResolvedValue(undefined);
      mockFirebaseServices.document.createDocument.mockResolvedValue('chapter-02');
      mockFirebaseServices.document.getDocument.mockResolvedValue({});

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // Insert chapter at order 2 (should shift existing chapter 2 to order 3)
      const insertChapterData: Omit<Chapter, 'id'> = {
        title: 'Inserted Chapter',
        content: 'This chapter is inserted',
        order: 2,
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        const chapterId = await storyContext.createChapter(insertChapterData);
        expect(chapterId).toBe('chapter-02');
      });

      // BEHAVIOR: Should shift the existing chapter (re-key path, still setDocument)...
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        'chapters',
        'chapter-03',
        expect.objectContaining({ order: 3 }) // Original chapter 2 shifted to 3
      );

      // ...and create the genuinely new chapter via the attribution-aware path.
      expect(mockFirebaseServices.document.createDocument).toHaveBeenCalledWith(
        'chapters',
        expect.objectContaining({
          title: 'Inserted Chapter',
          order: 2
        }),
        'chapter-02'
      );
    });

    test('should route genuine chapter creation through the attribution-aware create path, not the attribution-free write', async () => {
      mockFirebaseServices.document.createDocument.mockResolvedValue('chapter-01');
      mockFirebaseServices.document.getDocument.mockResolvedValue({});

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      const chapterData: Omit<Chapter, 'id'> = {
        title: 'The Beginning',
        content: 'Our adventure starts in the tavern...',
        order: 1,
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await storyContext.createChapter(chapterData);
      });

      // REGRESSION TRIPWIRE: a genuine new chapter must go through
      // DocumentService.createDocument (the attribution-aware path), carrying the
      // caller's domain fields, and must NEVER be written via the attribution-free
      // setDocument path (that path is reserved for the re-key writes in
      // updateChapter/deleteChapter/reorderChapters, which preserve an EXISTING
      // chapter's original attribution rather than stamping new attribution).
      expect(mockFirebaseServices.document.createDocument).toHaveBeenCalledWith(
        'chapters',
        expect.objectContaining({
          title: 'The Beginning',
          content: 'Our adventure starts in the tavern...',
          order: 1,
          id: 'chapter-01'
        }),
        'chapter-01'
      );
      expect(mockFirebaseServices.document.setDocument).not.toHaveBeenCalled();
    });
  });

  describe('Attribution Regression Guard — Reorder Must Not Reattribute Existing Chapters', () => {
    test('reordering a chapter authored by user A, performed by user B, preserves A\'s createdBy/dateAdded on every rewritten chapter and touches only modified* fields', async () => {
      // The acting user for this reorder is B -- a different person than the
      // original author of every chapter involved.
      mockUseAuth.mockReturnValue({
        user: { uid: 'user-b' },
      });

      mockUseUser.mockReturnValue({
        userProfile: { name: 'User B' },
        activeGroupUserProfile: {
          userId: 'user-b',
          username: 'User B',
          role: 'member',
          joinedAt: '2025-06-15T00:00:00.000Z',
          activeCharacterId: 'char-b',
          characters: [
            { id: 'char-b', name: 'Character B' }
          ]
        },
      });

      getUserName.mockReturnValue('User B');
      getActiveCharacterName.mockReturnValue('Character B');

      // All three chapters were created (and never since modified) by user A.
      const chaptersAuthoredByA = [
        {
          id: 'chapter-01',
          title: 'Chapter 1',
          content: 'First chapter',
          order: 1,
          createdBy: 'user-a',
          createdByUsername: 'User A',
          dateAdded: '2025-01-01T00:00:00.000Z',
          modifiedBy: 'user-a',
          modifiedByUsername: 'User A',
          dateModified: '2025-01-01T00:00:00.000Z'
        },
        {
          id: 'chapter-02',
          title: 'Chapter 2',
          content: 'Second chapter',
          order: 2,
          createdBy: 'user-a',
          createdByUsername: 'User A',
          dateAdded: '2025-01-01T00:00:00.000Z',
          modifiedBy: 'user-a',
          modifiedByUsername: 'User A',
          dateModified: '2025-01-01T00:00:00.000Z'
        },
        {
          id: 'chapter-03',
          title: 'Chapter 3',
          content: 'Third chapter',
          order: 3,
          createdBy: 'user-a',
          createdByUsername: 'User A',
          dateAdded: '2025-01-01T00:00:00.000Z',
          modifiedBy: 'user-a',
          modifiedByUsername: 'User A',
          dateModified: '2025-01-01T00:00:00.000Z'
        }
      ];

      mockUseChapterData.mockReturnValue({
        chapters: chaptersAuthoredByA,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      mockUseFirebaseData.mockReturnValue({
        updateData: mockUpdateData,
        deleteData: mockDeleteData,
        getData: jest.fn().mockResolvedValue([]),
      });

      mockFirebaseServices.document.setDocument.mockResolvedValue(undefined);
      mockFirebaseServices.document.getDocument.mockResolvedValue({});

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // User B moves chapter-01 from order 1 to order 3. This affects all three
      // chapters: chapter-01 becomes order 3 (id chapter-03), chapter-02 shifts to
      // order 1 (id chapter-01), chapter-03 shifts to order 2 (id chapter-02).
      await act(async () => {
        await storyContext.updateChapter('chapter-01', { order: 3 });
      });

      // Every chapter written during this reorder must still carry user A's
      // original creation attribution -- reordering must never reattribute
      // creation to whoever performed the reorder.
      const setDocumentCalls = mockFirebaseServices.document.setDocument.mock.calls;
      expect(setDocumentCalls.length).toBeGreaterThan(0);
      setDocumentCalls.forEach(([, , writtenChapter]: [string, string, any]) => {
        expect(writtenChapter.createdBy).toBe('user-a');
        expect(writtenChapter.createdByUsername).toBe('User A');
        expect(writtenChapter.dateAdded).toBe('2025-01-01T00:00:00.000Z');
      });

      // The chapter the user actually moved (originally chapter-01, now living at
      // chapter-03) gets a fresh modification stamp from B -- this is the one
      // legitimate attribution change in this operation.
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        'chapters',
        'chapter-03',
        expect.objectContaining({
          createdBy: 'user-a',
          createdByUsername: 'User A',
          dateAdded: '2025-01-01T00:00:00.000Z',
          modifiedBy: 'user-b',
          modifiedByUsername: 'User B',
          dateModified: expect.any(String),
          order: 3
        })
      );
      const movedChapterCall = setDocumentCalls.find(([, id]: [string, string]) => id === 'chapter-03');
      expect(movedChapterCall![2].dateModified).not.toBe('2025-01-01T00:00:00.000Z');

      // The other two chapters were only re-keyed to a new id/order (mechanical
      // shift, not a content edit by B) -- their modification attribution is left
      // exactly as it was, untouched by this operation.
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        'chapters',
        'chapter-01',
        expect.objectContaining({
          createdBy: 'user-a',
          dateAdded: '2025-01-01T00:00:00.000Z',
          modifiedBy: 'user-a',
          modifiedByUsername: 'User A',
          dateModified: '2025-01-01T00:00:00.000Z',
          order: 1
        })
      );
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        'chapters',
        'chapter-02',
        expect.objectContaining({
          createdBy: 'user-a',
          dateAdded: '2025-01-01T00:00:00.000Z',
          modifiedBy: 'user-a',
          modifiedByUsername: 'User A',
          dateModified: '2025-01-01T00:00:00.000Z',
          order: 2
        })
      );

      // This reorder must never route through the attribution-aware create path --
      // none of these chapters are new.
      expect(mockFirebaseServices.document.createDocument).not.toHaveBeenCalled();
    });
  });

  describe('Chapter Retrieval Behavior', () => {
    beforeEach(() => {
      const mockChapters: Chapter[] = [
        {
          id: 'chapter-01',
          title: 'The Beginning',
          content: 'Our story begins...',
          order: 1,
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'chapter-02',
          title: 'The Journey',
          content: 'The adventure continues...',
          order: 2,
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'chapter-03',
          title: 'The End',
          content: 'Our story concludes...',
          order: 3,
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
    });

    test('should retrieve chapter by ID correctly', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BEHAVIOR: Should find existing chapter
      const chapter = storyContext.getChapterById('chapter-02');
      expect(chapter).toEqual(expect.objectContaining({
        id: 'chapter-02',
        title: 'The Journey',
        order: 2
      }));

      // BEHAVIOR: Should return undefined for non-existent chapter
      const nonExistent = storyContext.getChapterById('non-existent');
      expect(nonExistent).toBeUndefined();
    });

    test('should navigate chapters correctly', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BEHAVIOR: Should get next chapter correctly
      const nextChapter = storyContext.getNextChapter('chapter-01');
      expect(nextChapter).toEqual(expect.objectContaining({
        id: 'chapter-02',
        title: 'The Journey'
      }));

      // BEHAVIOR: Should get previous chapter correctly
      const prevChapter = storyContext.getPreviousChapter('chapter-02');
      expect(prevChapter).toEqual(expect.objectContaining({
        id: 'chapter-01',
        title: 'The Beginning'
      }));

      // BEHAVIOR: Should return undefined for navigation beyond bounds
      expect(storyContext.getNextChapter('chapter-03')).toBeUndefined();
      expect(storyContext.getPreviousChapter('chapter-01')).toBeUndefined();
    });

    test('should calculate reading progress correctly', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BEHAVIOR: Should calculate progress based on completed chapters
      // With no completed chapters, progress should be 0
      const initialProgress = storyContext.getReadingProgress();
      expect(initialProgress).toBe(0);
    });
  });

  describe('Chapter Update Behavior', () => {
    let mockChapters: Chapter[];

    beforeEach(() => {
      mockChapters = [
        {
          id: 'chapter-01',
          title: 'Test Chapter',
          content: 'A test chapter for updates',
          order: 1,
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      // Setup authenticated state with context
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
        chapters: mockChapters,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      mockUpdateData.mockResolvedValue(undefined);
    });

    test('should update chapter with basic metadata', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      await act(async () => {
        await storyContext.updateChapter('chapter-01', {
          title: 'Updated Chapter Title',
          content: 'Updated chapter content'
        });
      });

      // BEHAVIOR: Should update with basic metadata
      expect(mockUpdateData).toHaveBeenCalledWith(
        'chapter-01',
        expect.objectContaining({
          title: 'Updated Chapter Title',
          content: 'Updated chapter content',
          modifiedBy: 'test-user',
          dateModified: expect.any(String)
        })
      );
    });

    test('should reject update for non-existent chapter', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BEHAVIOR: Should reject update for non-existent chapter
      await expect(storyContext.updateChapter('non-existent', { title: 'Updated' })).rejects.toThrow(
        'Chapter not found'
      );

      expect(mockUpdateData).not.toHaveBeenCalled();
    });

    test('should handle complex chapter reordering', async () => {
      const multipleChapters = [
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
        chapters: multipleChapters,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      mockFirebaseServices.document.setDocument.mockResolvedValue(undefined);
      mockFirebaseServices.document.getDocument.mockResolvedValue({});

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // Move chapter 1 to position 3
      await act(async () => {
        await storyContext.updateChapter('chapter-01', { order: 3 });
      });

      // BEHAVIOR: every affected chapter ends up written at its new position.
      //
      // Corrected under explicit authorisation on 2026-07-28, together with the
      // bug #017 fix. This previously asserted `expect(mockDeleteData).toHaveBeenCalled()`,
      // which pinned the *mechanism* of the old implementation rather than the
      // outcome — and no correct implementation can satisfy it. Moving chapter-01
      // to order 3 rotates orders {1,2,3} -> {3,1,2}; because a chapter's id is
      // derived from its order, the new id set {chapter-03, chapter-01,
      // chapter-02} is exactly the old one. Every id is reused, so a reorder that
      // writes before deleting has nothing left to delete. Asserting that a
      // delete happened could therefore only ever be satisfied by the
      // delete-everything-first algorithm that #017 exists to remove.
      //
      // Asserting the outcome instead is strictly stronger: this checks the
      // chapters actually land in the right places, which the old assertion
      // never did.
      const writes = mockFirebaseServices.document.setDocument.mock.calls.map(
        (call: any[]) => [call[1], call[2].order]
      );
      expect(writes).toEqual(
        expect.arrayContaining([
          ['chapter-03', 3],
          ['chapter-01', 1],
          ['chapter-02', 2]
        ])
      );
      expect(mockRefreshChapters).toHaveBeenCalled();
    });

    test('should not delete any chapter when a reorder write fails partway (bug #017)', async () => {
      // Regression test for the atomicity half of bug #017.
      //
      // updateChapter's reorder path used to delete EVERY affected chapter and
      // only then recreate them. A failure in the recreate loop left the
      // already-deleted chapters with no replacement and no rollback — permanent
      // data loss. The fix writes and verifies every new position first, and
      // deletes only afterwards.
      //
      // The observable consequence, and what this pins: when a write fails
      // partway, nothing has been deleted yet. Against the old implementation
      // all three chapters were already gone by this point.
      const multipleChapters = [
        { id: 'chapter-01', title: 'Chapter 1', content: 'First', order: 1, createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' },
        { id: 'chapter-02', title: 'Chapter 2', content: 'Second', order: 2, createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' },
        { id: 'chapter-03', title: 'Chapter 3', content: 'Third', order: 3, createdBy: 'test-user', createdByUsername: 'Test User', dateAdded: '2025-06-15T00:00:00.000Z' }
      ];

      mockUseChapterData.mockReturnValue({
        chapters: multipleChapters,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      // Succeed on the first write, then fail — a partial batch.
      mockFirebaseServices.document.setDocument
        .mockResolvedValueOnce(undefined)
        .mockRejectedValue(new Error('Firestore write failed'));
      mockFirebaseServices.document.getDocument.mockResolvedValue({});

      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      await act(async () => {
        await expect(
          storyContext.updateChapter('chapter-01', { order: 3 })
        ).rejects.toThrow();
      });

      // BEHAVIOR: no chapter may be deleted while any replacement write is
      // still outstanding.
      expect(mockDeleteData).not.toHaveBeenCalled();
    });
  });

  describe('Chapter Deletion Behavior', () => {
    beforeEach(() => {
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

      // Setup authenticated state with context
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
      });

      mockUseChapterData.mockReturnValue({
        chapters: mockChapters,
        loading: false,
        error: null,
        refreshChapters: mockRefreshChapters,
        hasRequiredContext: true,
      });

      mockDeleteData.mockResolvedValue(undefined);
      mockFirebaseServices.document.setDocument.mockResolvedValue(undefined);
      mockFirebaseServices.document.getDocument.mockResolvedValue({});
    });

    test('should delete chapter successfully with reordering', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      await act(async () => {
        await storyContext.deleteChapter('chapter-01');
      });

      // BEHAVIOR: Should delete chapter and reorder remaining ones
      expect(mockDeleteData).toHaveBeenCalledWith('chapter-01');
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalled(); // For reordering
      expect(mockRefreshChapters).toHaveBeenCalled();
    });

    test('should reject deletion for non-existent chapter', async () => {
      renderStoryContext();

      await waitFor(() => {
        expect(storyContext).toBeDefined();
      });

      // BEHAVIOR: Should reject deletion for non-existent chapter
      await expect(storyContext.deleteChapter('non-existent')).rejects.toThrow(
        'Chapter not found'
      );

      expect(mockDeleteData).not.toHaveBeenCalled();
    });
  });

  describe('useStory Hook Behavior', () => {
    test('should throw error when used outside StoryProvider', () => {
      // Create a test component that uses the hook outside of provider
      const TestComponent = () => {
        useStory();
        return <div>Test</div>;
      };

      // BEHAVIOR: Should throw error when used outside provider
      expect(() => render(<TestComponent />)).toThrow(
        'useStory must be used within a StoryProvider'
      );
    });
  });
});