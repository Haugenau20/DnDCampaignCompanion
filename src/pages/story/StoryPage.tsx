// pages/story/StoryPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import BookViewer from '../../components/features/story/BookViewer';
import Typography from '../../components/core/Typography';
import Breadcrumb from '../../components/layout/Breadcrumb';
import SlidingChapters from '../../components/features/story/SlidingChapters';
import Card from '../../components/core/Card';
import Button from '../../components/core/Button';
import { useStory } from '../../context/StoryContext';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/firebase';
import { Book, Menu, Loader2, Edit } from 'lucide-react';

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
          updateCurrentChapter(chapter);
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

  // Calculate next and previous chapters
  const { nextChapter, previousChapter } = useMemo(() => {
    if (!currentChapter) return { nextChapter: undefined, previousChapter: undefined };
    
    const currentIndex = chapters.findIndex(c => c.id === currentChapter.id);
    return {
      nextChapter: currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : undefined,
      previousChapter: currentIndex > 0 ? chapters[currentIndex - 1] : undefined
    };
  }, [currentChapter, chapters]);

  // Breadcrumb items
  const breadcrumbItems = useMemo(() => [
    { label: 'Home', href: '/' },
    { label: 'Story', href: '/story' },
    { label: 'Session Chapters', href: '/story/chapters' },
    { label: currentChapter ? `${currentChapter.order}. ${currentChapter.title}` : 'Select Chapter' }
  ], [currentChapter]);

  // For tracking reading progress
  const handlePageChange = (page: number, isComplete?: boolean) => {
    if (currentChapter) {
      updateChapterProgress(currentChapter.id, {
        lastPosition: page,
        isComplete: isComplete || page === 1
      });
    }
  };

  const handleChapterSelect = (selectedChapterId: string) => {
    navigateToPage(`/story/chapters/${selectedChapterId}`);
  };

  // Chapter management actions
  const handleCreateChapter = () => {
    navigateToPage('/story/chapters/create');
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
    <div className="min-h-screen p-4 content">
      <div className="max-w-7xl mx-auto">
        {/* Sliding Chapters Navigation */}
        <SlidingChapters
          chapters={chapters}
          currentChapterId={currentChapter?.id}
          onChapterSelect={handleChapterSelect}
          isOpen={isChaptersOpen}
          onClose={() => setChaptersOpen(false)}
        />

        {/* Breadcrumb Navigation */}
        <Breadcrumb items={breadcrumbItems} className="mb-4" />

        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChaptersOpen(true)}
              startIcon={<Menu />}
              className="mr-2"
            >
              Chapters
            </Button>
            <div className="flex items-center gap-2">
              <Book className="primary" />
              <Typography color="secondary">
                Reading Chapter {currentChapter?.order || 0} of {chapters.length}
              </Typography>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit Controls (for signed in users) */}
            {user && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditChapter}
                  startIcon={<Edit />}
                >
                  Edit
                </Button>
              </div>
            )}
            
            <Button
              variant="ghost"
              onClick={() => navigateToPage('/story/chapters')}
              startIcon={<Book />}
            >
              Back to Selection
            </Button>
          </div>
        </div>

        {/* Book Viewer */}
        <div className="max-w-4xl mx-auto">
          <BookViewer
            content={currentChapter?.content || ''}
            title={currentChapter ? `${currentChapter.order}. ${currentChapter.title}` : ''}
            onPageChange={handlePageChange}
            onNextChapter={() => nextChapter && handleChapterSelect(nextChapter.id)}
            onPreviousChapter={() => previousChapter && handleChapterSelect(previousChapter.id)}
            hasNextChapter={!!nextChapter}
            hasPreviousChapter={!!previousChapter}
          />
        </div>
      </div>
    </div>
  );
};

export default StoryPage;