// components/features/story/BookshelfView.tsx
import React, { useMemo } from 'react';
import Typography from '../../core/Typography';
import { Chapter } from '../../../types/story';
import clsx from 'clsx';

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
    <div className="rounded-lg overflow-hidden card">
      {groupedChapters.map((group, groupIndex) => (
        <div key={groupIndex} className="mb-8">
          <div className="p-3 border-b card-border">
            <Typography variant="h4" className="typography-heading">
              Chapters {groupIndex * 10 + 1}-{groupIndex * 10 + group.length}
            </Typography>
          </div>
          
          {/* Books row with fixed width */}
            <div className="relative px-6 pt-8 flex items-end gap-2 mx-auto mt-4"
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
                      isCurrentChapter ? `ring-2 primary ring-offset-2` : ""
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
                        isCurrentChapter ? `typography font-bold` : ""
                      )}
                      title={`Chapter ${chapter.order}: ${chapter.title}`}
                    >
                      {chapter.order}
                    </Typography>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookshelfView;