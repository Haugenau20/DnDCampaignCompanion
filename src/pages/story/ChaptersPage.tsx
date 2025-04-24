// pages/story/ChaptersPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useStory } from '../../context/StoryContext';
import { useNavigation } from '../../context/NavigationContext';
import { useTheme } from '../../themes/ThemeContext';
import { useAuth } from '../../context/firebase';
import Typography from '../../components/core/Typography';
import Breadcrumb from '../../components/layout/Breadcrumb';
import Button from '../../components/core/Button';
import BookshelfView from '../../components/features/story/BookshelfView';
import TableView from '../../components/features/story/TableView';
import { 
  Plus, 
  Bookmark, 
  List, 
  Grid,
  Book
} from 'lucide-react';
import clsx from 'clsx';

// Key for storing view preference in localStorage
const VIEW_PREFERENCE_KEY = 'chapters-view-preference';

const ChaptersPage: React.FC = () => {
  // Initialize viewMode from localStorage or default to 'bookshelf'
  const [viewMode, setViewMode] = useState<'bookshelf' | 'table'>(() => {
    const savedPreference = localStorage.getItem(VIEW_PREFERENCE_KEY);
    return (savedPreference === 'table' || savedPreference === 'bookshelf') 
      ? savedPreference 
      : 'bookshelf';
  });
  
  const [sortField, setSortField] = useState<'order' | 'title' | 'lastModified'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { chapters, storyProgress, isLoading } = useStory();
  const { navigateToPage } = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const themePrefix = theme.name;

  // Save view preference when it changes
  useEffect(() => {
    localStorage.setItem(VIEW_PREFERENCE_KEY, viewMode);
  }, [viewMode]);

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Story', href: '/story' },
    { label: 'Chapters' }
  ];

  // Handle chapter selection
  const handleChapterSelect = (chapterId: string) => {
    navigateToPage(`/story/chapters/${chapterId}`);
  };

  // Handle create chapter
  const handleCreateChapter = () => {
    navigateToPage('/story/chapters/create');
  };

  // Handle edit chapter
  const handleEditChapter = (chapterId: string) => {
    navigateToPage(`/story/chapters/edit/${chapterId}`);
  };

  // Continue reading button
  const handleContinueReading = () => {
    if (storyProgress.currentChapter) {
      navigateToPage(`/story/chapters/${storyProgress.currentChapter}`);
    } else if (chapters.length > 0) {
      navigateToPage(`/story/chapters/${chapters[0].id}`);
    }
  };

  // Toggle sort direction or change sort field
  const handleSort = (field: 'order' | 'title' | 'lastModified') => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort chapters based on current sort preferences
  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'order') {
        comparison = a.order - b.order;
      } else if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'lastModified') {
        const dateA = new Date(a.lastModified || 0).getTime();
        const dateB = new Date(b.lastModified || 0).getTime();
        comparison = dateA - dateB;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [chapters, sortField, sortDirection]);

  if (isLoading) {
    return <Typography>Loading chapters...</Typography>;
  }

  return (
    <div className={clsx("min-h-screen p-4", `${themePrefix}-content`)}>
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        
        <div className="flex justify-between items-center mb-6">
          <Typography variant="h2" className={`${themePrefix}-typography-heading`}>
            Session Chronicles
          </Typography>
          
          <div className="flex gap-2">
            {storyProgress.currentChapter && (
              <Button
                variant="outline"
                startIcon={<Bookmark />}
                onClick={handleContinueReading}
              >
                Continue Reading
              </Button>
            )}
            
            {user && (
              <Button
                variant="primary"
                startIcon={<Plus />}
                onClick={handleCreateChapter}
              >
                New Chapter
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => navigateToPage('/story')}
              startIcon={<Book />}
            >
              Back to Selection
            </Button>
          </div>
        </div>
        
        {/* View Toggle */}
        <div className="flex justify-between items-center mb-4">
          <Typography variant="body" color="secondary">
            {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'} total
          </Typography>
          
          <div className={clsx("flex rounded-lg p-1", `${themePrefix}-bg-secondary`)}>
            <button
              className={clsx(
                "flex items-center gap-1 px-3 py-1 rounded-md transition-colors",
                viewMode === 'bookshelf' 
                  ? `${themePrefix}-card` 
                  : `${themePrefix}-typography-secondary`
              )}
              onClick={() => setViewMode('bookshelf')}
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Bookshelf</span>
            </button>
            
            <button
              className={clsx(
                "flex items-center gap-1 px-3 py-1 rounded-md transition-colors",
                viewMode === 'table' 
                  ? `${themePrefix}-card` 
                  : `${themePrefix}-typography-secondary`
              )}
              onClick={() => setViewMode('table')}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
        
        {chapters.length === 0 ? (
          <div className={clsx("p-8 text-center rounded-lg", `${themePrefix}-card`)}>
            <Typography>No chapters available yet.</Typography>
          </div>
        ) : viewMode === 'bookshelf' ? (
          <BookshelfView 
            chapters={chapters}
            currentChapterId={storyProgress.currentChapter}
            onChapterSelect={handleChapterSelect}
          />
        ) : (
          <TableView 
            chapters={sortedChapters}
            currentChapterId={storyProgress.currentChapter}
            onChapterSelect={handleChapterSelect}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEditChapter={handleEditChapter}
            isAdmin={!!user}
          />
        )}
      </div>
    </div>
  );
};

export default ChaptersPage;