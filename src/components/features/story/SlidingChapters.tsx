import React from 'react';
import { Chapter } from '../../../types/story';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import { Book, X } from 'lucide-react';
import clsx from 'clsx';

interface SlidingChaptersProps {
  chapters: Chapter[];
  currentChapterId?: string;
  onChapterSelect: (chapterId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SlidingChapters: React.FC<SlidingChaptersProps> = ({
  chapters,
  currentChapterId,
  onChapterSelect,
  isOpen,
  onClose,
}) => {

  const handleChapterClick = (chapterId: string) => {
    onChapterSelect(chapterId);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity dialog-backdrop"
          onClick={onClose}
        />
      )}

      {/* Sliding Panel */}
      <div
        className={clsx(
          "fixed top-0 left-0 h-full w-80 shadow-lg z-50 transition-transform duration-300 ease-in-out transform",
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Panel Header */}
          <div className="p-4 border-b flex items-center justify-between card-border book-header">
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5 primary" />
              <Typography variant="h3" className={`typography-heading`}>
                Chapters
              </Typography>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Chapter List */}
          <div className="flex-1 overflow-y-auto p-4 content">
            <div className="space-y-2">
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => handleChapterClick(chapter.id)}
                  className={clsx(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    chapter.id === currentChapterId
                      ? `navigation-item-active`
                      : `navigation-item`
                  )}
                >
                  <Typography 
                    variant="body" 
                    className="font-medium"
                  >
                    {chapter.order}. {chapter.title}
                  </Typography>
                  {chapter.summary && (
                    <Typography
                      variant="body-sm"
                      color="secondary"
                      className="mt-1 line-clamp-2"
                    >
                      {chapter.summary}
                    </Typography>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SlidingChapters;