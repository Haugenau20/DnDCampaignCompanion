// pages/story/ChapterEditPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import Typography from '../../components/core/Typography';
import ChapterForm from '../../components/features/story/ChapterForm';
import DeleteConfirmationDialog from '../../components/shared/DeleteConfirmationDialog';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { useStory } from '../../context/StoryContext';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/firebase';
import { BookOpen } from 'lucide-react';

/**
 * Page for editing an existing chapter
 */
const ChapterEditPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const { 
    chapters, 
    getChapterById, 
    isLoading, 
    deleteChapter 
  } = useStory();
  const { navigateToPage } = useNavigation();
  const { user } = useAuth();
  
  const [chapter, setChapter] = useState(chapterId ? getChapterById(chapterId) : undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Find chapter when chapters load or when ID changes
  useEffect(() => {
    if (chapterId && chapters.length > 0) {
      setChapter(getChapterById(chapterId));
    }
  }, [chapterId, chapters, getChapterById]);

  // Redirect if user is not signed in
  useEffect(() => {
    if (!isLoading && !user) {
      navigateToPage('/story');
    }
  }, [isLoading, user, navigateToPage]);

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!chapter) return;
    
    try {
      await deleteChapter(chapter.id);
      setIsDeleted(true);
      navigateToPage('/story/chapters');
    } catch (error) {
      console.error('Error deleting chapter:', error);
      // Error is handled in the dialog component
    }
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Story', href: '/story' },
    { label: 'Session Chapters', href: '/story/chapters' },
    { label: chapter ? `Edit: ${chapter.title}` : 'Edit Chapter' }
  ];

  if (isDeleted) {
    return <Navigate to="/story" />;
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <Typography>Loading...</Typography>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="p-4">
        <Typography>Chapter not found</Typography>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by the useEffect
  }

  return (
    <div className="min-h-screen p-4 content">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        
        {/* Page Header */}
        <div className="mb-6 flex items-center gap-2">
          <BookOpen className="w-6 h-6 primary" />
          <Typography variant="h2" className="typography-heading">
            Edit Chapter
          </Typography>
        </div>
        
        {/* Chapter Form */}
        <ChapterForm 
          mode="edit" 
          chapter={chapter} 
          onDeleteClick={() => setIsDeleteDialogOpen(true)} 
        />
        
        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          itemName={`Chapter ${chapter.order}: ${chapter.title}`}
          itemType="Chapter"
          onConfirm={handleDeleteConfirm}
          onClose={() => setIsDeleteDialogOpen(false)}
        />
      </div>
    </div>
  );
};

export default ChapterEditPage;