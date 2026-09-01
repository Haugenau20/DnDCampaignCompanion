// src/features/storytelling/chapters/context/__tests__/StoryContext.progress.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { StoryProvider, useStory } from '../StoryContext';

/**
 * StoryContext Reading Progress Regression Tests (bug #018)
 *
 * StoryContext used to read reading progress from a frozen module-level
 * constant (`defaultProgress`). `updateChapterProgress`/`updateCurrentChapter`
 * wrote to Firestore but discarded the result, so nothing ever accumulated in
 * memory: `getReadingProgress()` always returned 0 and
 * `storyProgress.currentChapter` was always ''. Progress now lives in
 * component state, seeded from the persisted `current-progress` document
 * exposed by `useFirebaseData`'s `data`.
 *
 * IMPORTANT: `StoryContext.bugs.test.tsx` and `StoryContext.behavioral.test.tsx`
 * both mock `useFirebaseData` with `useFirebaseData: () => mockUseFirebaseData()`
 * -- the options argument (and therefore the `collection` field) is never
 * forwarded, so both mocked instances (one for 'chapters', one for
 * 'story-progress') return the exact same object, and that object never
 * includes a `data` array. That is precisely why those suites kept passing
 * throughout the bug's lifetime: the read-back effect in StoryContext never
 * had anything to read. This file forwards the options argument so the two
 * `useFirebaseData` call sites can be told apart by `collection`, which is
 * required to exercise the read-back path at all.
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseChapterData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useCampaigns: () => mockUseCampaigns(),
}));

jest.mock('features/storytelling/chapters/hooks/useChapterData', () => ({
  useChapterData: () => mockUseChapterData(),
}));

// Unlike the other StoryContext suites, this mock forwards its `options`
// argument through to `mockUseFirebaseData` so the implementation set up in
// `beforeEach` below can distinguish the 'chapters' call site from the
// 'story-progress' call site by `options.collection`.
jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: (options: { collection: string }) => mockUseFirebaseData(options),
}));

// Mock Firebase services (StoryContext imports this at module scope even
// though these two functions under test never call into it directly)
jest.mock('core/services/firebase', () => ({
  __esModule: true,
  default: {
    document: {
      setDocument: jest.fn(),
      createDocument: jest.fn(),
      getDocument: jest.fn(),
    },
  },
}));

jest.mock('core/utils/user-utils', () => ({
  getUserName: jest.fn(),
  getActiveCharacterName: jest.fn(),
}));

const { getUserName, getActiveCharacterName } = require('core/utils/user-utils');

const StoryTestComponent = ({ onContextChange }: { onContextChange: (context: any) => void }) => {
  const storyContext = useStory();

  React.useEffect(() => {
    onContextChange(storyContext);
  }, [storyContext, onContextChange]);

  return <div data-testid="story-progress-test">Story Progress Test</div>;
};

describe('StoryContext Reading Progress (bug #018)', () => {
  let storyContext: any;
  let mockUpdateData: jest.Mock;
  let mockDeleteData: jest.Mock;
  let mockUpdateProgressData: jest.Mock;
  let mockRefreshChapters: jest.Mock;
  // Backing store for the 'story-progress' collection's `data` array -- set
  // per-test (before render) to control what the persisted-document read-back
  // effect finds.
  let progressCollectionData: any[];
  // Stable identity across every render, matching the real useFirebaseData
  // contract (its getData is a useCallback with an empty dependency array).
  // A fresh jest.fn() per render would make a call-count assertion measure
  // render churn rather than the effect's actual dependency behaviour.
  let mockRefreshProgress: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    storyContext = null;
    progressCollectionData = [];

    getUserName.mockReturnValue('Test User');
    getActiveCharacterName.mockReturnValue('Test Character');

    mockUpdateData = jest.fn().mockResolvedValue(undefined);
    mockDeleteData = jest.fn().mockResolvedValue(undefined);
    mockUpdateProgressData = jest.fn().mockResolvedValue(undefined);
    mockRefreshChapters = jest.fn();
    mockRefreshProgress = jest.fn().mockResolvedValue([]);

    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user' },
    });

    mockUseCampaigns.mockReturnValue({
      activeCampaignId: 'campaign-1',
    });

    mockUseUser.mockReturnValue({
      userProfile: { name: 'Test User' },
      activeGroupUserProfile: {
        userId: 'test-user',
        username: 'Test User',
        role: 'member',
        joinedAt: '2025-06-15T00:00:00.000Z',
        activeCharacterId: 'char-1',
        characters: [{ id: 'char-1', name: 'Test Character' }],
      },
    });

    mockUseChapterData.mockReturnValue({
      chapters: [],
      loading: false,
      error: null,
      refreshChapters: mockRefreshChapters,
      hasRequiredContext: true,
    });

    // Distinguish the two useFirebaseData call sites in StoryContext by
    // `collection`, so the 'story-progress' instance can supply a `data`
    // array (which the other suites' shared mock never does).
    mockUseFirebaseData.mockImplementation((options: { collection: string }) => {
      if (options.collection === 'story-progress') {
        return {
          data: progressCollectionData,
          updateData: mockUpdateProgressData,
          getData: mockRefreshProgress,
        };
      }
      return {
        updateData: mockUpdateData,
        deleteData: mockDeleteData,
        getData: jest.fn().mockResolvedValue([]),
      };
    });
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

  // Like renderStoryContext, but exposes a `rerender` that can change
  // useCampaigns()'s activeCampaignId between renders, to drive the
  // campaign-switch effect under test below.
  const renderStoryProvider = ({ activeCampaignId }: { activeCampaignId?: string } = {}) => {
    mockUseCampaigns.mockReturnValue({ activeCampaignId: activeCampaignId ?? 'campaign-1' });

    const handleContextChange = (context: any) => {
      storyContext = context;
    };

    const result = render(
      <StoryProvider>
        <StoryTestComponent onContextChange={handleContextChange} />
      </StoryProvider>
    );

    return {
      ...result,
      rerender: (next: { activeCampaignId?: string }) => {
        mockUseCampaigns.mockReturnValue({ activeCampaignId: next.activeCampaignId });
        result.rerender(
          <StoryProvider>
            <StoryTestComponent onContextChange={handleContextChange} />
          </StoryProvider>
        );
      },
    };
  };

  test('accumulates chapter progress across successive updateChapterProgress calls for different chapters (bug #018)', async () => {
    renderStoryContext();

    await waitFor(() => {
      expect(storyContext).toBeDefined();
    });

    await act(async () => {
      await storyContext.updateChapterProgress('chapter-01', {
        lastPosition: 50,
        isComplete: true,
      });
    });

    await waitFor(() => {
      expect(storyContext.storyProgress.chapterProgress['chapter-01']).toBeDefined();
    });

    await act(async () => {
      await storyContext.updateChapterProgress('chapter-02', {
        lastPosition: 20,
        isComplete: false,
      });
    });

    await waitFor(() => {
      expect(storyContext.storyProgress.chapterProgress['chapter-02']).toBeDefined();
    });

    // The second call must not have discarded the first -- both chapter
    // entries must survive together in the accumulated progress map.
    expect(storyContext.storyProgress.chapterProgress['chapter-01']).toEqual(
      expect.objectContaining({
        chapterId: 'chapter-01',
        lastPosition: 50,
        isComplete: true,
      })
    );
    expect(storyContext.storyProgress.chapterProgress['chapter-02']).toEqual(
      expect.objectContaining({
        chapterId: 'chapter-02',
        lastPosition: 20,
        isComplete: false,
      })
    );
  });

  test('seeds storyProgress from a persisted current-progress document supplied by useFirebaseData (bug #018)', async () => {
    progressCollectionData = [
      {
        id: 'current-progress',
        currentChapter: 'chapter-03',
        lastRead: new Date('2025-01-01T00:00:00.000Z'),
        chapterProgress: {
          'chapter-01': {
            chapterId: 'chapter-01',
            lastPosition: 100,
            isComplete: true,
            lastRead: new Date('2025-01-01T00:00:00.000Z'),
          },
        },
      },
    ];

    renderStoryContext();

    await waitFor(() => {
      expect(storyContext).toBeDefined();
    });

    // storyProgress must reflect the persisted document's currentChapter,
    // not the '' fallback -- this is what makes StoryPage's
    // "resume where you left off" branch reachable.
    await waitFor(() => {
      expect(storyContext.storyProgress.currentChapter).toBe('chapter-03');
    });

    expect(storyContext.storyProgress.chapterProgress['chapter-01']).toEqual(
      expect.objectContaining({ chapterId: 'chapter-01', isComplete: true })
    );
  });

  test('preserves isComplete when a later update supplies only lastPosition (bug #852)', async () => {
    // updateChapterProgress takes Partial<ChapterProgress>, but its body used
    // to rebuild the entry from scratch and default every field the caller
    // omitted -- so any position-only update silently cleared a stored
    // completion. Combined with BookViewer firing onPageChange(page) with no
    // flag on every page turn, re-reading a finished chapter un-completed it.
    //
    // This was inert until bug #018 was fixed: before that, progress lived in
    // a frozen module constant and none of these writes were read back, so the
    // overwrite had no observable effect. Fixing #018 made it live.
    renderStoryContext();

    await waitFor(() => {
      expect(storyContext).toBeDefined();
    });

    // Finish the chapter.
    await act(async () => {
      await storyContext.updateChapterProgress('chapter-01', {
        lastPosition: 100,
        isComplete: true,
      });
    });

    await waitFor(() => {
      expect(
        storyContext.storyProgress.chapterProgress['chapter-01'].isComplete
      ).toBe(true);
    });

    // Re-read it: an ordinary page turn reports position only.
    await act(async () => {
      await storyContext.updateChapterProgress('chapter-01', {
        lastPosition: 1,
      });
    });

    await waitFor(() => {
      expect(
        storyContext.storyProgress.chapterProgress['chapter-01'].lastPosition
      ).toBe(1);
    });

    // BEHAVIOR: the completion survives. Position moved; nothing said to
    // un-complete the chapter, so nothing should have.
    expect(
      storyContext.storyProgress.chapterProgress['chapter-01'].isComplete
    ).toBe(true);
  });

  test('does not refetch the chapters collection when progress changes', async () => {
    // Progress lives in the `story-progress` document. A progress write cannot
    // change a chapter document, so refetching `chapters` here bought nothing.
    //
    // It cost a great deal, though: refreshChapters() sets `loading` true,
    // which feeds StoryContext's `isLoading`, which makes StoryPage swap the
    // reader for its loading card -- unmounting the reader. That reset the
    // reader's per-chapter guard against re-reporting completion, so on
    // remount it reported completion again and triggered another refetch. In
    // the browser the page sat in a permanent reader -> loading -> reader
    // loop about once a second, writing to Firestore on every pass, and tore
    // the reader down mid-scroll each time.
    renderStoryContext();

    await waitFor(() => {
      expect(storyContext).toBeDefined();
    });

    mockRefreshChapters.mockClear();

    await act(async () => {
      await storyContext.updateChapterProgress('chapter-01', { lastPosition: 40 });
    });

    expect(mockRefreshChapters).not.toHaveBeenCalled();

    await act(async () => {
      await storyContext.updateCurrentChapter('chapter-02');
    });

    expect(mockRefreshChapters).not.toHaveBeenCalled();
  });

  test('still allows a caller to clear isComplete explicitly (bug #852)', async () => {
    // The fix must not make completion permanently sticky -- an explicit
    // `isComplete: false` has to win over the stored value. Only silence is
    // treated as "leave it alone". `??` rather than `||` is what makes this
    // hold for a deliberate `false`.
    renderStoryContext();

    await waitFor(() => {
      expect(storyContext).toBeDefined();
    });

    await act(async () => {
      await storyContext.updateChapterProgress('chapter-01', {
        lastPosition: 100,
        isComplete: true,
      });
    });

    await waitFor(() => {
      expect(
        storyContext.storyProgress.chapterProgress['chapter-01'].isComplete
      ).toBe(true);
    });

    await act(async () => {
      await storyContext.updateChapterProgress('chapter-01', {
        isComplete: false,
      });
    });

    await waitFor(() => {
      expect(
        storyContext.storyProgress.chapterProgress['chapter-01'].isComplete
      ).toBe(false);
    });

    // ...and the position it did not mention is still preserved.
    expect(
      storyContext.storyProgress.chapterProgress['chapter-01'].lastPosition
    ).toBe(100);
  });

  describe("campaign switching", () => {
    test("refetches reading progress when the active campaign changes", async () => {
      // Reading progress is per campaign. Its effect keyed only on
      // hasRequiredContext, which stays true across a switch, so the previous
      // campaign's position survived into the new one.
      const { rerender } = renderStoryProvider({ activeCampaignId: "campaign-1" });

      await waitFor(() => expect(mockRefreshProgress).toHaveBeenCalledTimes(1));

      mockRefreshProgress.mockClear();
      rerender({ activeCampaignId: "campaign-2" });

      await waitFor(() => expect(mockRefreshProgress).toHaveBeenCalledTimes(1));
    });
  });
});
