// pages/story/ChapterEditPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import Typography from '../../core/components/Typography';
import { ChapterForm, useStory } from 'features/storytelling';
import DeleteConfirmationDialog from 'shared/components/DeleteConfirmationDialog';
import Breadcrumb from 'shared/components/Breadcrumb';
import { useNavigation } from 'shared/context/NavigationContext';
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';

/**
 * Page for editing an existing chapter.
 *
 * Write route ("story", `mode: "write"`) so a signed-out visitor sees "Sign
 * in to write a chapter" in place, rather than the old `!user` redirect
 * effect that bounced them straight back to `/story` before the page could
 * say why.
 *
 * The `isDeleted` redirect stays a bare early return, ahead of `PageShell` —
 * it renders nothing (a `<Navigate>` has no visible output of its own to lose
 * a title from), unlike the "chapter not found" case below, which is real
 * content and lives inside `GatedContent`'s ready branch instead.
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

  const gate = usePageGate('story', { loading: isLoading, mode: 'write' });

  const [chapter, setChapter] = useState(chapterId ? getChapterById(chapterId) : undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Find chapter when chapters load or when ID changes
  useEffect(() => {
    if (chapterId && chapters.length > 0) {
      setChapter(getChapterById(chapterId));
    }
  }, [chapterId, chapters, getChapterById]);

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

  return (
    <PageShell
      title="Edit Chapter"
      breadcrumb={<Breadcrumb items={breadcrumbItems} className="mb-4" />}
    >
      <GatedContent gate={gate}>
        {!chapter ? (
          <Typography>Chapter not found</Typography>
        ) : (
          <>
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
          </>
        )}
      </GatedContent>
    </PageShell>
  );
};

export default ChapterEditPage;
