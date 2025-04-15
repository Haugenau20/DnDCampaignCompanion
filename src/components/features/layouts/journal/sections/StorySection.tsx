// components/features/layouts/journal/sections/StorySection.tsx
import React from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import { useNavigation } from '../../../../../context/NavigationContext';
import { Chapter } from '../../../../../types/story';
import { BookOpen, Bookmark } from 'lucide-react';
import clsx from 'clsx';

interface StorySectionProps {
  chapters: Chapter[];
  loading: boolean;
}

/**
 * Displays story chapters in journal format
 */
const StorySection: React.FC<StorySectionProps> = ({ chapters, loading }) => {
  const { theme } = useTheme();
  const { navigateToPage } = useNavigation();
  const themePrefix = theme.name;

  // Sort chapters by order number or date
  const sortedChapters = [...chapters].sort((firstChapter, secondChapter) => {
    // If both have order numbers, sort by order
    if (firstChapter.order !== undefined && secondChapter.order !== undefined) {
      return firstChapter.order - secondChapter.order;
    }
    
    // Otherwise sort by date (oldest first to maintain chronology)
    const firstDate = firstChapter.lastModified ? new Date(firstChapter.lastModified).getTime() : 0;
    const secondDate = secondChapter.lastModified ? new Date(secondChapter.lastModified).getTime() : 0;
    
    return firstDate - secondDate;
  });
  
  // Find the most recent chapter
  const latestChapter = sortedChapters.length > 0 
    ? sortedChapters[sortedChapters.length - 1] 
    : null;
  
  // Handle chapter click
  const handleChapterClick = (chapterId: string) => {
    navigateToPage(`/story/chapters/${chapterId}`);
  };

  return (
    <div className={clsx(
      "relative",
      `${themePrefix}-journal-section`
    )}>
      <h3 className={clsx(
        "text-xl font-medium mb-4",
        `${themePrefix}-journal-heading`
      )}>
        The Story So Far
      </h3>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className={clsx(
            "h-8 w-2/3 rounded mb-2",
            `${themePrefix}-journal-loading`
          )}></div>
          <div className={clsx(
            "h-40 rounded",
            `${themePrefix}-journal-loading`
          )}></div>
        </div>
      ) : sortedChapters.length === 0 ? (
        <div className={clsx(
          "text-center py-8",
          `${themePrefix}-journal-empty`
        )}>
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="italic">Your story has yet to begin...</p>
          <p className="text-sm mt-2">
            Add chapters to track your adventure's progress
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Latest chapter preview */}
          {latestChapter && (
            <div className={clsx(
              "relative p-4 rounded",
              `${themePrefix}-journal-latest-chapter`
            )}>
              <div className="absolute top-0 right-0 translate-x-2 -translate-y-3">
                <Bookmark size={24} className={clsx(`${themePrefix}-primary`)} />
              </div>
              
              <h4 
                className={clsx(
                  "text-lg font-medium mb-2 cursor-pointer hover:underline",
                  `${themePrefix}-journal-chapter-title`
                )}
                onClick={() => handleChapterClick(latestChapter.id)}
              >
                {latestChapter.order !== undefined && (
                  <span className="mr-1">Chapter {latestChapter.order}:</span>
                )}
                {latestChapter.title}
              </h4>
              
              {latestChapter.summary ? (
                <p className={clsx(
                  "text-sm mb-2 italic",
                  `${themePrefix}-journal-chapter-summary`
                )}>
                  {latestChapter.summary}
                </p>
              ) : latestChapter.content ? (
                <p className={clsx(
                  "text-sm mb-2 italic line-clamp-3",
                  `${themePrefix}-journal-chapter-excerpt`
                )}>
                  {latestChapter.content.substring(0, 200)}...
                </p>
              ) : null}
              
              <div className={clsx(
                "text-right text-xs",
                `${themePrefix}-typography-secondary`
              )}>
                {latestChapter.lastModified && (
                  new Date(latestChapter.lastModified).toLocaleDateString()
                )}
              </div>
            </div>
          )}
          
          {/* Chapter list */}
          <div className="space-y-1">
            <h5 className={clsx(
              "text-base font-medium mb-2",
              `${themePrefix}-journal-subheading`
            )}>
              Previous Chapters
            </h5>
            
            {sortedChapters.length <= 1 ? (
              <p className={clsx(
                "text-sm italic text-center",
                `${themePrefix}-journal-empty`
              )}>
                No previous chapters
              </p>
            ) : (
              <ul className={clsx(
                "space-y-1 list-none pl-0",
                `${themePrefix}-journal-chapter-list`
              )}>
                {sortedChapters.slice(0, -1).map(chapter => (
                  <li 
                    key={chapter.id}
                    onClick={() => handleChapterClick(chapter.id)}
                    className={clsx(
                      "pl-6 py-1 relative cursor-pointer hover:bg-opacity-10 hover:bg-primary rounded",
                      `${themePrefix}-journal-chapter-item`
                    )}
                  >
                    {/* Chapter bullet */}
                    <span className={clsx(
                      "absolute left-2 top-1.5 w-2 h-2 rounded-full",
                      `${themePrefix}-journal-chapter-bullet`
                    )}></span>
                    
                    <span className={clsx(
                      "text-sm",
                      `${themePrefix}-journal-chapter-link`
                    )}>
                      {chapter.order !== undefined && (
                        <span className="font-medium mr-1">Chapter {chapter.order}:</span>
                      )}
                      {chapter.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StorySection;