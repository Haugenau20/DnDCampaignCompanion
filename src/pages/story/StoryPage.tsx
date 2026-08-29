// pages/story/StoryPage.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ChapterRail, ChapterReader, useStory } from 'features/storytelling';
import { deriveChapterProgress } from 'features/storytelling/chapters/utils/chapter-progress';
import Typography from '../../core/components/Typography';
import Card from '../../core/components/Card';
import Button from '../../core/components/Button';
import { useNavigation } from 'shared/context/NavigationContext';
import { useAuth } from 'features/user-management';
import { Menu, Loader2 } from 'lucide-react';

/**
 * The chapter reader.
 *
 * Reading position is stated exactly once on this page, in the reader's own
 * footer row. The pre-redesign page stated it four times over — a breadcrumb
 * ending in the chapter title, a "Reading Chapter X of Y" line, a page
 * counter, and a progress bar — plus two separate Previous/Next Chapter
 * pairs. All of that is gone deliberately; if you are about to add a position
 * indicator to this file, one already exists in `ChapterReader`.
 *
 * "Back to Chapters" is gone for the same reason: the persistent rail carries
 * an "All chapters" control, so a second one here would be a duplicate exit.
 */
const StoryPage: React.FC = () => {
  const { chapterId } = useParams();
  const { navigateToPage } = useNavigation();
  const {
    chapters,
    storyProgress,
    isLoading,
    error,
    getChapterById,
    updateChapterProgress,
    updateCurrentChapter,
  } = useStory();
  const { user } = useAuth();

  const [currentChapter, setCurrentChapter] = useState(
    chapterId ? getChapterById(chapterId) : undefined
  );
  const [isChaptersOpen, setChaptersOpen] = useState(false);

  // Navigate to appropriate chapter on initial load
  useEffect(() => {
    if (!isLoading && chapters.length > 0) {
      if (chapterId) {
        // If a specific chapter is requested, load it
        const chapter = getChapterById(chapterId);
        if (chapter) {
          setCurrentChapter(chapter);
          updateCurrentChapter(chapter.id);
        } else {
          // If requested chapter doesn't exist, go to first chapter
          navigateToPage(`/story/chapters/${chapters[0].id}`);
        }
      } else if (storyProgress.currentChapter) {
        // If no specific chapter requested, go to last read chapter
        const lastChapter = getChapterById(storyProgress.currentChapter);
        if (lastChapter) {
          navigateToPage(`/story/chapters/${lastChapter.id}`);
        } else {
          // If last read chapter no longer exists, go to first chapter
          navigateToPage(`/story/chapters/${chapters[0].id}`);
        }
      } else {
        // If no last read chapter, start from the beginning
        navigateToPage(`/story/chapters/${chapters[0].id}`);
      }
    }
  }, [isLoading, chapters, chapterId, navigateToPage, getChapterById, storyProgress.currentChapter, updateCurrentChapter]);

  // Read state for the rail, derived with the same helper the chapters index
  // uses, so the two views can never disagree about what counts as read.
  const railItems = useMemo(
    () => deriveChapterProgress(chapters, storyProgress),
    [chapters, storyProgress]
  );

  // Neighbouring chapters, for the reader's footer navigation.
  const { nextChapter, previousChapter, chapterNumber } = useMemo(() => {
    if (!currentChapter) {
      return { nextChapter: undefined, previousChapter: undefined, chapterNumber: 0 };
    }

    const currentIndex = chapters.findIndex(c => c.id === currentChapter.id);
    return {
      nextChapter: currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : undefined,
      previousChapter: currentIndex > 0 ? chapters[currentIndex - 1] : undefined,
      chapterNumber: currentIndex + 1,
    };
  }, [currentChapter, chapters]);

  /**
   * The scroll position the reader restores to, frozen per chapter.
   *
   * `storyProgress` updates on every persisted scroll, so passing the live
   * stored value straight through would hand the reader a `position` prop that
   * changes while it is being read — and a restore effect watching it would
   * yank the reader back to a position they had already scrolled past.
   * Capturing it once per chapter id means the prop only changes when the
   * chapter does, which is exactly when a restore is wanted.
   */
  const restoredFor = useRef<string | undefined>(undefined);
  const restoredPosition = useRef(0);
  if (currentChapter && restoredFor.current !== currentChapter.id) {
    restoredFor.current = currentChapter.id;
    restoredPosition.current =
      storyProgress.chapterProgress?.[currentChapter.id]?.lastPosition ?? 0;
  }

  /**
   * Persist reading progress.
   *
   * `isComplete` is forwarded only when the reader actually signals
   * completion. `updateChapterProgress` merges over the stored entry, so
   * omitting the key preserves a stored `true` — but passing
   * `isComplete: !!isComplete` would write an explicit `false` on every
   * ordinary scroll, and an explicit false still clears (pinned by
   * StoryContext.progress.test.tsx, "still allows a caller to clear isComplete
   * explicitly"). Collapsing this ternary re-opens bug #852 from the consumer
   * side.
   */
  const handleProgressChange = (percent: number, isComplete?: boolean) => {
    if (currentChapter) {
      updateChapterProgress(
        currentChapter.id,
        isComplete
          ? { lastPosition: percent, isComplete: true }
          : { lastPosition: percent }
      );
    }
  };

  const handleChapterSelect = (selectedChapterId: string) => {
    navigateToPage(`/story/chapters/${selectedChapterId}`);
  };

  const handleEditChapter = () => {
    if (currentChapter) {
      navigateToPage(`/story/chapters/edit/${currentChapter.id}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 card">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin primary" />
            <Typography>Loading chapter...</Typography>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 card">
          <Typography color="error">
            {error}
          </Typography>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen content">
      <div className="flex">
        <ChapterRail
          items={railItems}
          currentChapterId={currentChapter?.id}
          onChapterSelect={handleChapterSelect}
          onBackToIndex={() => navigateToPage('/story')}
          isOpen={isChaptersOpen}
          onClose={() => setChaptersOpen(false)}
        />

        <div className="flex-1 min-w-0 p-4">
          {/* Below `lg` the rail is a drawer, so it needs a trigger. Above it the
              rail is always on screen and this button would open nothing. */}
          <div className="lg:hidden mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChaptersOpen(true)}
              startIcon={<Menu />}
            >
              Chapters
            </Button>
          </div>

          <ChapterReader
            content={currentChapter?.content || ''}
            title={currentChapter ? `${currentChapter.order}. ${currentChapter.title}` : ''}
            position={restoredPosition.current}
            chapterNumber={chapterNumber}
            chapterCount={chapters.length}
            nextChapterTitle={nextChapter?.title}
            onProgressChange={handleProgressChange}
            onNextChapter={() => nextChapter && handleChapterSelect(nextChapter.id)}
            onPreviousChapter={() => previousChapter && handleChapterSelect(previousChapter.id)}
            hasNextChapter={!!nextChapter}
            hasPreviousChapter={!!previousChapter}
            onEdit={user ? handleEditChapter : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default StoryPage;
