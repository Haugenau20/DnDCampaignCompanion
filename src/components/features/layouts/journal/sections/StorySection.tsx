// components/features/layouts/journal/sections/StorySection.tsx
import React from 'react';
import { useNavigation } from '../../../../../context/NavigationContext';
import { Chapter } from '../../../../../types/story';
import { BookOpen, Bookmark } from 'lucide-react';
import Button from '../../../../core/Button';

interface StorySectionProps {
  chapters: Chapter[];
  loading: boolean;
}

/**
 * Displays story chapters in journal format
 */
const StorySection: React.FC<StorySectionProps> = ({ chapters, loading }) => {
  const { navigateToPage } = useNavigation();

  // Sort chapters by order number or date
  const sortedChapters = [...chapters].sort((firstChapter, secondChapter) => {
    // If both have order numbers, sort by order
    if (firstChapter.order !== undefined && secondChapter.order !== undefined) {
      return firstChapter.order - secondChapter.order;
    }
    
    // Use dateModified if available, otherwise fall back to dateAdded
    const firstDateString = firstChapter.dateModified || firstChapter.dateAdded;
    const secondDateString = secondChapter.dateModified || secondChapter.dateAdded;
    
    // Convert string dates to numeric timestamps for comparison
    const firstDate = firstDateString ? new Date(firstDateString).getTime() : 0;
    const secondDate = secondDateString ? new Date(secondDateString).getTime() : 0;
    
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
    <div className="relative journal-section">
      <h3 className="text-xl font-medium mb-4 journal-heading">
        The Story So Far
      </h3>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-2/3 rounded mb-2 journal-loading"></div>
          <div className="h-40 rounded journal-loading"></div>
        </div>
      ) : sortedChapters.length === 0 ? (
        <div className="text-center py-8 journal-empty">
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
            <div className="relative p-4 rounded">
              <div className="absolute top-0 right-0 translate-x-2 -translate-y-3">
                <Bookmark size={24} className="primary" />
              </div>
              
              <h4 
                className="text-lg font-medium mb-2 cursor-pointer hover:underline journal-title"
                onClick={() => handleChapterClick(latestChapter.id)}
              >
                {latestChapter.order !== undefined && (
                  <span className="mr-1">Chapter {latestChapter.order}:</span>
                )}
                {latestChapter.title}
              </h4>
              
              {latestChapter.summary ? (
                <p className="text-sm mb-2 italic">
                  {latestChapter.summary}
                </p>
              ) : latestChapter.content ? (
                <p className="text-sm mb-2 italic line-clamp-3">
                  {latestChapter.content.substring(0, 200)}...
                </p>
              ) : null}
              
              <div className="text-right text-xs typography-secondary">
                {latestChapter.dateModified && (
                  new Date(latestChapter.dateModified).toLocaleDateString()
                )}
              </div>
            </div>
          )}
          
          {/* Chapter list */}
          <div className="space-y-1">
            <h5 className="text-base font-medium mb-2 ">
              Previous Chapters
            </h5>
            
            {sortedChapters.length <= 1 ? (
              <p className="text-sm italic text-center journal-empty">
                No previous chapters
              </p>
            ) : (
                <ul className="space-y-1 list-none pl-0">
                {sortedChapters.slice(0, -1).reverse().slice(0, 10).map(chapter => (
                  <li 
                  key={chapter.id}
                  onClick={() => handleChapterClick(chapter.id)}
                  className="pl-6 py-1 relative cursor-pointer hover:bg-opacity-10 hover:bg-accent rounded">
                  <span 
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full journal-binding"
                  ></span>
                  
                  <span className="text-sm journal-title">
                  {chapter.order !== undefined && (
                  <span className="font-medium mr-1">Chapter {chapter.order}:</span>
                  )}
                  {chapter.title}
                  </span>
                  </li>
                ))}
                </ul>
            )}
            <div className="flex justify-end mt-2">
              <Button
                variant="ghost"
                size='sm'
                onClick={() => navigateToPage('/story/chapters')}
              >
                View All Chapters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorySection;