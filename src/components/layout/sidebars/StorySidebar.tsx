import React, { useMemo } from 'react';
import { Book, ScrollText, Clock, ListRestart } from 'lucide-react';
import { useNavigation } from '../../../hooks/useNavigation';
import Typography from '../../core/Typography';
import { useStory } from '../../../context/StoryContext';
import { useTheme } from '../../../context/ThemeContext';
import clsx from 'clsx';

const StorySidebar = () => {
  const { navigateToPage } = useNavigation();
  const { chapters, storyProgress } = useStory();
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  // Calculate reading progress
  const readingProgress = useMemo(() => {
    const readChapters = chapters.filter(chapter => {
      // Consider a chapter as read if:
      // 1. It has progress tracking
      // 2. It's the current chapter
      // 3. It has a lastRead date
      const progress = storyProgress.chapterProgress[chapter.id];
      return (progress !== undefined) || 
             (chapter.id === storyProgress.currentChapter);
    });

    return {
      count: readChapters.length,
      percentage: (readChapters.length / chapters.length) * 100
    };
  }, [chapters, storyProgress]);

  // Get recently read chapters
  const recentChapters = useMemo(() => {
    const chaptersWithDates = chapters
      .filter(chapter => {
        const progress = storyProgress.chapterProgress[chapter.id];
        return progress?.lastRead || chapter.id === storyProgress.currentChapter;
      })
      .map(chapter => ({
        ...chapter,
        lastRead: storyProgress.chapterProgress[chapter.id]?.lastRead || 
                 (chapter.id === storyProgress.currentChapter ? storyProgress.lastRead : new Date(0))
      }))
      .sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())
      .slice(0, 3);

    return chaptersWithDates;
  }, [chapters, storyProgress]);

  // Navigation handlers
  const handleContinueReading = () => {
    if (storyProgress.currentChapter) {
      navigateToPage(`/story/chapters/${storyProgress.currentChapter}`);
    } else {
      // If no current chapter, start with the first unread chapter
      const firstUnreadChapter = chapters.find(chapter => 
        !storyProgress.chapterProgress[chapter.id]
      );
      if (firstUnreadChapter) {
        navigateToPage(`/story/chapters/${firstUnreadChapter.id}`);
      } else {
        // If all chapters are read, go to the first chapter
        navigateToPage(`/story/chapters/${chapters[0].id}`);
      }
    }
  };

  const handleChapterClick = (chapterId: string) => {
    navigateToPage(`/story/chapters/${chapterId}`);
  };

  return (
    <div className={clsx("space-y-6 p-4", `${themePrefix}-sidebar`)}>
      {/* Reading Progress */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Book className={clsx("w-5 h-5", `${themePrefix}-primary`)} />
          <Typography variant="h4">Reading Progress</Typography>
        </div>
        <div className={clsx("rounded-full h-2 mb-2", `${themePrefix}-progress-container`)}>
          <div 
            className={clsx("rounded-full h-2 transition-all", `${themePrefix}-progress-bar`)}
            style={{ width: `${readingProgress.percentage}%` }}
          />
        </div>
        <Typography variant="body-sm" color="secondary">
          {readingProgress.count} of {chapters.length} chapters read
        </Typography>
      </div>

      {/* Recently Read */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className={clsx("w-5 h-5", `${themePrefix}-primary`)} />
          <Typography variant="h4">Recently Read</Typography>
        </div>
        <div className="space-y-2">
          {recentChapters.map(chapter => (
            <button
              key={chapter.id}
              onClick={() => handleChapterClick(chapter.id)}
              className={clsx(
                "w-full text-left p-2 rounded transition-colors",
                `${themePrefix}-navigation-item`
              )}
            >
              <Typography variant="body-sm" className="font-medium">
                Chapter {chapter.order}
              </Typography>
              <Typography variant="body-sm" color="secondary" className="truncate">
                {chapter.title}
              </Typography>
            </button>
          ))}
          {recentChapters.length === 0 && (
            <Typography variant="body-sm" color="secondary" className="text-center p-2">
              No chapters read yet
            </Typography>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ListRestart className={clsx("w-5 h-5", `${themePrefix}-primary`)} />
          <Typography variant="h4">Quick Actions</Typography>
        </div>
        <div className="space-y-2">
          <button 
            onClick={handleContinueReading}
            className={clsx(
              "w-full flex items-center gap-2 p-2 rounded transition-colors",
              `${themePrefix}-navigation-item`
            )}
          >
            <ScrollText className="w-4 h-4" />
            <Typography variant="body-sm">Continue Reading</Typography>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorySidebar;