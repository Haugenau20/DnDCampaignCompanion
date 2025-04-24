// components/features/story/BookshelfView.tsx
import React, { useMemo } from 'react';
import Typography from '../../core/Typography';
import { useTheme } from '../../../themes/ThemeContext';
import { Chapter } from '../../../types/story';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import Button from '../../core/Button';

// Import book SVG components
import {
  BookRed,
  BookBlue,
  BookGreen,
  BookPurple,
  BookBrown,
  BookAged,
  BookOrnate,
  BookClasped,
  BookRibbed,
  BookJeweled,
  BookManuscript
} from './books';

interface BookshelfViewProps {
  chapters: Chapter[];
  currentChapterId?: string;
  onChapterSelect: (chapterId: string) => void;
}

// Array of book components for easy access
const BookComponents = [
  BookRed,
  BookBlue,
  BookGreen,
  BookPurple,
  BookBrown,
  BookAged,
  BookOrnate,
  BookClasped,
  BookRibbed,
  BookJeweled,
  BookManuscript
];

const BookshelfView: React.FC<BookshelfViewProps> = ({
  chapters,
  currentChapterId,
  onChapterSelect
}) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Group chapters by 10s for the bookshelf
  const groupedChapters = useMemo(() => {
    const groups: Array<Array<typeof chapters[0]>> = [];
    const sortedByOrder = [...chapters].sort((a, b) => a.order - b.order);
    
    // Create groups of 10 chapters
    for (let i = 0; i < sortedByOrder.length; i += 10) {
      groups.push(sortedByOrder.slice(i, i + 10));
    }
    
    return groups;
  }, [chapters]);

  // Function to determine which book component to use
  const getBookComponent = (chapterOrder: number) => {
    // Use a deterministic but varied selection based on chapter order
    // and title length (if available)
    const chapter = chapters.find(c => c.order === chapterOrder);
    const titleFactor = chapter?.title.length || 0;
    const index = (chapterOrder + titleFactor) % BookComponents.length;
    return BookComponents[index];
  };

  return (
    <div className={clsx("rounded-lg overflow-hidden", `${themePrefix}-card`)}>
      {groupedChapters.map((group, groupIndex) => (
        <div key={groupIndex} className="mb-8">
          <div className={clsx("p-3 border-b", `${themePrefix}-card-border`)}>
            <Typography variant="h4" className={`${themePrefix}-typography-heading`}>
              Chapters {groupIndex * 10 + 1}-{groupIndex * 10 + group.length}
            </Typography>
          </div>
          
          {/* Bookshelf container */}
          <div className={clsx(
            "p-6 flex items-end",
            `${themePrefix}-card-bg`
          )}>
            {/* Bookshelf itself */}
            <div className={clsx("w-full h-8 rounded-t-md", `${themePrefix}-bg bg-opacity-20`)}></div>
          </div>
          
          {/* Books row with fixed width */}
          <div className={clsx(
            "relative px-6 pt-4 pb-8 flex items-end gap-2 mx-auto",
            `${themePrefix}-card-bg`,
          )}
          style={{ width: 'min-content', maxWidth: '100%', overflowX: 'auto' }}>
            {group.map((chapter) => {
              const isCurrentChapter = chapter.id === currentChapterId;
              
              // Calculate book height based on content length
              const contentLength = chapter.content?.length || 0;
              let bookHeight = 120; // base height
              if (contentLength > 3500) bookHeight = 190;
              else if (contentLength > 3000) bookHeight = 180;
              else if (contentLength > 2500) bookHeight = 170;
              else if (contentLength > 2000) bookHeight = 160;
              else if (contentLength > 1500) bookHeight = 150;
              else if (contentLength > 1000) bookHeight = 140;
              else if (contentLength > 500) bookHeight = 130;
              else if (contentLength > 250) bookHeight = 120;
              else if (contentLength > 100) bookHeight = 110;
              
              // Get the book component for this chapter
              const BookComponent = getBookComponent(chapter.order);
              
              return (
                <div 
                  key={chapter.id}
                  onClick={() => onChapterSelect(chapter.id)}
                  className={clsx(
                    "flex-shrink-0 cursor-pointer transition-transform hover:-translate-y-2",
                    isCurrentChapter ? "relative z-10 -translate-y-2" : ""
                  )}
                  style={{ width: '45px' }}
                >
                  {/* Book */}
                  <div 
                    className={clsx(
                      "w-full rounded-t-sm shadow-md hover:shadow-lg transition-shadow", 
                      isCurrentChapter ? `ring-2 ${themePrefix}-primary ring-offset-2` : ""
                    )}
                  >
                    {/* Render the book component */}
                    <BookComponent height={bookHeight} className="w-full" />
                  </div>
                  
                  {/* Chapter number below book */}
                  <div className="text-center mt-2">
                    <Typography 
                      variant="body-sm" 
                      className={clsx(
                        "text-xs", 
                        isCurrentChapter ? `${themePrefix}-typography font-bold` : ""
                      )}
                      title={`Chapter ${chapter.order}: ${chapter.title}`}
                    >
                      {chapter.order}
                    </Typography>
                  </div>
                </div>
              );
            })}

            {/* Book details popup for current chapter */}
            {group.some(ch => ch.id === currentChapterId) && (
              <div className={clsx(
                "absolute top-0 left-1/4 transform -translate-y-full p-4 rounded-lg shadow-lg",
                `${themePrefix}-card-bg border ${themePrefix}-primary`,
                "max-w-xs z-20"
              )}>
                {(() => {
                  const currentChapter = group.find(ch => ch.id === currentChapterId);
                  if (!currentChapter) return null;
                  
                  return (
                    <>
                      <Typography variant="h4" className="mb-2">
                        Chapter {currentChapter.order}: {currentChapter.title}
                      </Typography>
                      {currentChapter.summary && (
                        <Typography variant="body" color="secondary" className="mb-2">
                          {currentChapter.summary}
                        </Typography>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <Typography variant="body-sm" color="secondary">
                          {new Date(currentChapter.lastModified || Date.now()).toLocaleDateString()}
                        </Typography>
                        <Button
                          size="sm"
                          variant="ghost"
                          endIcon={<ChevronRight />}
                          onClick={() => onChapterSelect(currentChapter.id)}
                        >
                          Read
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookshelfView;