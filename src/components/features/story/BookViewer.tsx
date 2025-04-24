// components/features/story/BookViewer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, ArrowLeftCircle, ArrowRightCircle } from 'lucide-react';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Button from '../../core/Button';
import { useTheme } from '../../../themes/ThemeContext';
import clsx from 'clsx';

interface BookViewerProps {
  content: string;
  title: string;
  onPageChange?: (page: number, isComplete?: boolean) => void;
  onNextChapter?: () => void;
  onPreviousChapter?: () => void;
  hasNextChapter?: boolean;
  hasPreviousChapter?: boolean;
  className?: string;
}

/**
 * Component for displaying book-like content with pagination
 */
const BookViewer: React.FC<BookViewerProps> = ({
  content,
  title,
  onPageChange,
  onNextChapter,
  onPreviousChapter,
  hasNextChapter = false,
  hasPreviousChapter = false,
  className
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pages, setPages] = useState<string[]>([]);
  const [showShortcutHint, setShowShortcutHint] = useState(true);
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Format content for display, preserving paragraphs
  const formatContent = useCallback((contentText: string): string => {
    // Convert explicit \n to actual newlines if they exist
    return contentText
      .replace(/\\n/g, '\n')
      .trim();
  }, []);

  // Split content into pages
  useEffect(() => {
    if (!content) {
      setPages([]);
      setTotalPages(1);
      return;
    }

    const formattedContent = formatContent(content);
    const wordsPerPage = 250;
    const words = formattedContent.split(' ');
    const pageArray = [];
    
    for (let i = 0; i < words.length; i += wordsPerPage) {
      pageArray.push(words.slice(i, i + wordsPerPage).join(' '));
    }
    
    // Ensure at least one page
    if (pageArray.length === 0) {
      pageArray.push('');
    }
    
    setPages(pageArray);
    setTotalPages(pageArray.length);
    setCurrentPage(1); // Reset to first page when content changes
  }, [content, formatContent]);

  // Handle page navigation
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      onPageChange?.(newPage);
      
      // Mark as complete if we're on the last page
      const isComplete = newPage === totalPages;
      if (isComplete) {
        onPageChange?.(newPage, true);
      }
    } else if (newPage > totalPages && hasNextChapter) {
      // Mark current chapter as complete before moving to next
      onPageChange?.(totalPages, true);
      onNextChapter?.();
    } else if (newPage < 1 && hasPreviousChapter) {
      onPreviousChapter?.();
    }
  }, [totalPages, hasNextChapter, hasPreviousChapter, onPageChange, onNextChapter, onPreviousChapter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          handlePageChange(currentPage + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          handlePageChange(currentPage - 1);
          break;
        case 'Home':
          e.preventDefault();
          handlePageChange(1);
          break;
        case 'End':
          e.preventDefault();
          handlePageChange(totalPages);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, totalPages, handlePageChange]);

  // Hide keyboard shortcut hint after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowShortcutHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Render newlines properly
  const renderContent = (text: string) => {
    if (!text) return null;
    
    // Split the text by newlines and map each paragraph
    return text.split('\n').map((paragraph, index) => (
      <p key={index} className="mb-4">
        {paragraph}
      </p>
    ));
  };

  if (!content) {
    return (
      <Card className={clsx("w-full max-w-4xl mx-auto p-8 text-center", `${themePrefix}-card`)}>
        <BookOpen className={clsx("w-16 h-16 mx-auto mb-4", `${themePrefix}-primary`)} />
        <Typography variant="h3" className="mb-2">
          No Content Available
        </Typography>
        <Typography color="secondary">
          Select a chapter to begin reading
        </Typography>
      </Card>
    );
  }

  return (
    <div className={clsx('flex flex-col items-center', className)}>
      {/* Keyboard Shortcuts Hint */}
      {showShortcutHint && (
        <div className={clsx(
          "px-4 py-2 rounded-lg mb-4 transition-opacity duration-500",
          `${themePrefix}-hint`
        )}>
          <Typography variant="body-sm">
            Tip: Use arrow keys or spacebar to navigate pages
          </Typography>
        </div>
      )}

      {/* Book Container */}
      <div className={clsx(
        "w-full max-w-4xl overflow-hidden rounded-lg shadow-xl",
        `${themePrefix}-book`
      )}>
        {/* Book Header */}
        <div className={clsx(
          "border-b p-4",
          `${themePrefix}-book-header`
        )}>
          {/* Use the Typography component with proper theme class */}
          <div className={clsx("text-center", `${themePrefix}-typography-heading`)}>
            <Typography variant="h3" className={`${themePrefix}-typography-heading`}>
              {title}
            </Typography>
          </div>
        </div>

        {/* Chapter Navigation */}
        <div className={clsx(
          "flex justify-between px-4 py-2 border-b", 
          `${themePrefix}-book-nav`
        )}>
          <Button
            variant="ghost"
            onClick={onPreviousChapter}
            disabled={!hasPreviousChapter}
            className="text-sm"
            startIcon={<ArrowLeftCircle className="w-4 h-4" />}
          >
            Previous Chapter
          </Button>
          <Button
            variant="ghost"
            onClick={onNextChapter}
            disabled={!hasNextChapter}
            className="text-sm"
            endIcon={<ArrowRightCircle className="w-4 h-4" />}
          >
            Next Chapter
          </Button>
        </div>

        {/* Book Content Area */}
        <div className={clsx("relative", `${themePrefix}-book-content-area`)}>
          {/* Content Container */}
          <div className={clsx(
            "max-w-2xl mx-auto p-8 pb-20",
            `${themePrefix}-book-content`
          )}>
            <div className={clsx(
              "leading-relaxed",
              `${themePrefix}-book-text`
            )}>
              {renderContent(pages[currentPage - 1] || '')}
            </div>
          </div>

          {/* Navigation Bar */}
          <div className={clsx(
            "absolute bottom-0 left-0 right-0 border-t",
            `${themePrefix}-book-pagination`
          )}>
            <div className="flex justify-center items-center gap-4 p-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 && !hasPreviousChapter}
                className={clsx(
                  "p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed",
                  `${themePrefix}-page-nav-button`
                )}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <Typography variant="body-sm" color="secondary">
                Page {currentPage} of {totalPages}
              </Typography>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages && !hasNextChapter}
                className={clsx(
                  "p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed",
                  `${themePrefix}-page-nav-button`
                )}
                aria-label="Next page"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={clsx("h-2", `${themePrefix}-progress-container`)}>
          <div 
            className={clsx("h-full transition-all duration-300", `${themePrefix}-progress-bar`)}
            style={{ width: `${(currentPage / totalPages) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default BookViewer;