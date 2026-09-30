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
 * component state, seeded from the reader's persisted progress document.
 *
 * T073: that document is per player. It used to be one
 * `campaigns/{c}/story-progress/current-progress` document every member wrote,
 * so one player's place in the story replaced another's. It is now
 * `groups/{g}/users/{uid}/story-progress/{campaignId}`, read by id through
 * `useFirestore().getDocument` and written with `setDocument`.
 *
 * IMPORTANT: `StoryContext.bugs.test.tsx` and `StoryContext.behavioral.test.tsx`
 * both mock `useFirebaseData` with `useFirebaseData: () => mockUseFirebaseData()`
 * -- the options argument (and therefore the `collection` field) is never
 * forwarded, so both mocked instances (one for 'chapters', one for
 * 'story-progress') return the exact same object, and that object never
 * includes a `data` array. That is precisely why those suites kept passing
 * throughout the bug's lifetime: the read-back effect in StoryContext never
 * had anything to read. This file drives the read-back through its own
 * `getDocument` mock, keyed by path and id, so it exercises the real read.
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseChapterData = jest.fn();
const mockUseFirebaseData = jest.fn();
const mockGetDocument = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useCampaigns: () => mockUseCampaigns(),
  useGroups: () => ({ activeGroupId: 'group-1' }),
  useFirestore: () => ({ getDocument: mockGetDocument }),
}));

jest.mock('features/storytelling/chapters/hooks/useChapterData', () => ({
  useChapterData: () => mockUseChapterData(),
}));

jest.mock('shared/hooks/useFirebaseData', () => ({
  useFirebaseData: (options: { collection: string }) => mockUseFirebaseData(options),
}));

// Progress writes go through `firebaseServices.document.setDocument`.
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
const mockFirebaseServices = require('core/services/firebase').default;

/** Where a reader's progress for a campaign lives. */
const progressPath = (uid: string) => `groups/group-1/users/${uid}/story-progress`;

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
  let mockRefreshChapters: jest.Mock;
  // Persisted progress documents, keyed `${collection}/${id}` -- set per-test
  // (before render) to control what the read-back finds.
  let persistedProgress: Record<string, any>;

  beforeEach(() => {
    jest.clearAllMocks();
    storyContext = null;
    persistedProgress = {};
    mockGetDocument.mockImplementation(async (collection: string, id: string) =>
      persistedProgress[`${collection}/${id}`] ?? null
    );
    mockFirebaseServices.document.setDocument.mockResolvedValue(undefined);

    getUserName.mockReturnValue('Test User');
    getActiveCharacterName.mockReturnValue('Test Character');

    mockUpdateData = jest.fn().mockResolvedValue(undefined);
    mockDeleteData = jest.fn().mockResolvedValue(undefined);
    mockRefreshChapters = jest.fn();

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

    mockUseFirebaseData.mockImplementation(() => ({
      updateData: mockUpdateData,
      deleteData: mockDeleteData,
      getData: jest.fn().mockResolvedValue([]),
    }));
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

  test("seeds storyProgress from the reader's own persisted progress document (bug #018)", async () => {
    persistedProgress = {
      [`${progressPath('test-user')}/campaign-1`]: {
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
    };

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
    test("reads the new campaign's progress when the active campaign changes", async () => {
      const { rerender } = renderStoryProvider({ activeCampaignId: "campaign-1" });

      await waitFor(() =>
        expect(mockGetDocument).toHaveBeenCalledWith(progressPath("test-user"), "campaign-1")
      );

      mockGetDocument.mockClear();
      rerender({ activeCampaignId: "campaign-2" });

      await waitFor(() =>
        expect(mockGetDocument).toHaveBeenCalledWith(progressPath("test-user"), "campaign-2")
      );
    });

    test("does not carry the previous campaign's position into one with no progress", async () => {
      persistedProgress = {
        [`${progressPath("test-user")}/campaign-1`]: {
          currentChapter: "chapter-05",
          lastRead: new Date("2025-01-01T00:00:00.000Z"),
          chapterProgress: {},
        },
      };
      const { rerender } = renderStoryProvider({ activeCampaignId: "campaign-1" });
      await waitFor(() => expect(storyContext.storyProgress.currentChapter).toBe("chapter-05"));

      rerender({ activeCampaignId: "campaign-2" });

      await waitFor(() => expect(storyContext.storyProgress.currentChapter).toBe(""));
    });
  });

  describe("progress belongs to one player (T073)", () => {
    test("is written to the reader's own document, not a campaign-wide one", async () => {
      renderStoryContext();
      await waitFor(() => expect(storyContext).toBeDefined());

      await act(async () => {
        await storyContext.updateCurrentChapter("chapter-02");
      });

      // The fourth argument is the merge that makes each write a patch
      // ("writes only what changed", below); this test is about where.
      expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
        progressPath("test-user"),
        "campaign-1",
        expect.objectContaining({ currentChapter: "chapter-02" }),
        { merge: true }
      );
      for (const [collection, id] of mockFirebaseServices.document.setDocument.mock.calls) {
        expect(collection).not.toBe("story-progress");
        expect(id).not.toBe("current-progress");
      }
    });

    test("two players in one campaign read and write separate documents", async () => {
      // The defect: both players shared one document, so the second reader's
      // position replaced the first's.
      persistedProgress = {
        [`${progressPath("player-a")}/campaign-1`]: {
          currentChapter: "chapter-07",
          lastRead: new Date("2025-01-01T00:00:00.000Z"),
          chapterProgress: {},
        },
      };

      mockUseAuth.mockReturnValue({ user: { uid: "player-b" } });
      renderStoryContext();
      await waitFor(() =>
        expect(mockGetDocument).toHaveBeenCalledWith(progressPath("player-b"), "campaign-1")
      );

      // Player A's place is not player B's.
      await act(async () => {});
      expect(storyContext.storyProgress.currentChapter).toBe("");

      await act(async () => {
        await storyContext.updateCurrentChapter("chapter-01");
      });

      const written = mockFirebaseServices.document.setDocument.mock.calls.map(
        ([collection]: [string]) => collection
      );
      expect(written).toEqual([progressPath("player-b")]);
    });

    test("writes nothing while there is no signed-in reader", async () => {
      mockUseAuth.mockReturnValue({ user: null });
      renderStoryContext();
      await waitFor(() => expect(storyContext).toBeDefined());

      await act(async () => {
        await storyContext.updateCurrentChapter("chapter-01");
      });

      expect(mockFirebaseServices.document.setDocument).not.toHaveBeenCalled();
      expect(mockGetDocument).not.toHaveBeenCalled();
    });

    test("drops a read that resolves after the campaign has changed", async () => {
      let resolveFirst: (value: unknown) => void = () => {};
      mockGetDocument.mockImplementationOnce(
        () => new Promise((resolve) => { resolveFirst = resolve; })
      );
      const { rerender } = renderStoryProvider({ activeCampaignId: "campaign-1" });
      await waitFor(() => expect(mockGetDocument).toHaveBeenCalledTimes(1));

      rerender({ activeCampaignId: "campaign-2" });
      await waitFor(() => expect(mockGetDocument).toHaveBeenCalledTimes(2));

      await act(async () => {
        resolveFirst({ currentChapter: "chapter-09", lastRead: new Date(), chapterProgress: {} });
      });

      expect(storyContext.storyProgress.currentChapter).toBe("");
    });
  });

  // T073: every emission used to rewrite the reader's WHOLE progress document,
  // one entry per chapter read, so the write grew with the story. And a write
  // fired before the first read resolved replaced the stored document with
  // only what this visit had done.
  describe("writes only what changed (T073)", () => {
    const writes = () =>
      mockFirebaseServices.document.setDocument.mock.calls.filter(
        ([collection]: [string]) => collection === progressPath("test-user")
      );

    test("a chapter's progress writes that chapter's entry alone, merged into the document", async () => {
      persistedProgress = {
        [`${progressPath("test-user")}/campaign-1`]: {
          currentChapter: "chapter-01",
          lastRead: new Date("2025-01-01T00:00:00.000Z"),
          chapterProgress: {
            "chapter-01": { chapterId: "chapter-01", lastPosition: 100, isComplete: true, lastRead: new Date() },
          },
        },
      };
      renderStoryContext();
      await waitFor(() => expect(storyContext.storyProgress.currentChapter).toBe("chapter-01"));

      await act(async () => {
        await storyContext.updateChapterProgress("chapter-02", { lastPosition: 30 });
      });

      const [[, id, data, options]] = writes();
      expect(id).toBe("campaign-1");
      expect(options).toEqual({ merge: true });
      expect(Object.keys(data.chapterProgress)).toEqual(["chapter-02"]);
      expect(data).not.toHaveProperty("currentChapter");
    });

    test("moving to another chapter writes the current chapter, not every chapter's entry", async () => {
      renderStoryContext();
      await waitFor(() => expect(storyContext).toBeDefined());

      await act(async () => {
        await storyContext.updateCurrentChapter("chapter-04");
      });

      const [[, , data, options]] = writes();
      expect(options).toEqual({ merge: true });
      expect(data.currentChapter).toBe("chapter-04");
      expect(data).not.toHaveProperty("chapterProgress");
    });

    test("progress made before the first read resolves neither wipes the stored document nor is lost", async () => {
      let resolveRead: (value: unknown) => void = () => {};
      mockGetDocument.mockImplementationOnce(
        () => new Promise((resolve) => { resolveRead = resolve; })
      );
      renderStoryContext();
      await waitFor(() => expect(mockGetDocument).toHaveBeenCalledTimes(1));

      await act(async () => {
        await storyContext.updateChapterProgress("chapter-02", { lastPosition: 30 });
      });

      // Stored side: only this chapter's entry went out, so the rest survives.
      const [[, , data, options]] = writes();
      expect(options).toEqual({ merge: true });
      expect(Object.keys(data.chapterProgress)).toEqual(["chapter-02"]);
      expect(data).not.toHaveProperty("currentChapter");

      await act(async () => {
        resolveRead({
          currentChapter: "chapter-03",
          lastRead: new Date("2025-01-01T00:00:00.000Z"),
          chapterProgress: {
            "chapter-01": { chapterId: "chapter-01", lastPosition: 100, isComplete: true, lastRead: new Date() },
          },
        });
      });

      // In memory: the stored progress, with this visit's on top.
      expect(storyContext.storyProgress.currentChapter).toBe("chapter-03");
      expect(storyContext.storyProgress.chapterProgress["chapter-01"]).toEqual(
        expect.objectContaining({ isComplete: true })
      );
      expect(storyContext.storyProgress.chapterProgress["chapter-02"]).toEqual(
        expect.objectContaining({ lastPosition: 30 })
      );
    });
  });
});
