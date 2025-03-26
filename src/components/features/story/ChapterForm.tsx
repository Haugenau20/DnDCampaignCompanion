// components/features/story/ChapterForm.tsx
import React, { useState, useEffect } from 'react';
import { Chapter } from '../../../types/story';
import Card from '../../core/Card';
import Button from '../../core/Button';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import { useTheme } from '../../../context/ThemeContext';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigation } from '../../../context/NavigationContext';
import { useStory } from '../../../context/StoryContext';
import clsx from 'clsx';

interface ChapterFormProps {
  /** The chapter to edit, or undefined for create mode */
  chapter?: Chapter;
  /** Mode of the form */
  mode: 'create' | 'edit';
  /** Function to call when delete button is clicked */
  onDeleteClick?: () => void;
}

/**
 * Form component for creating and editing chapters
 */
const ChapterForm: React.FC<ChapterFormProps> = ({ 
  chapter, 
  mode, 
  onDeleteClick 
}) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;
  const { navigateToPage } = useNavigation();
  const { createChapter, updateChapter, chapters } = useStory();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [order, setOrder] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form with chapter data if in edit mode
  useEffect(() => {
    if (chapter && mode === 'edit') {
      setTitle(chapter.title);
      setContent(chapter.content);
      setSummary(chapter.summary || '');
      setOrder(chapter.order);
    } else if (mode === 'create') {
      // For create mode, set the order to be the next in sequence
      const maxOrder = chapters.length > 0
        ? Math.max(...chapters.map(c => c.order))
        : 0;
      setOrder(maxOrder + 1);
    }
  }, [chapter, mode, chapters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate form
      if (!title.trim()) {
        throw new Error('Title is required');
      }
      if (!content.trim()) {
        throw new Error('Content is required');
      }

      // Create or update the chapter
      if (mode === 'create') {
        const newChapter: Omit<Chapter, 'id'> = {
          title,
          content,
          summary: summary.trim() || undefined,
          order,
          lastModified: new Date()
        };
        
        await createChapter(newChapter);
        setSuccess('Chapter created successfully');
        
        // Reset form for create mode
        if (mode === 'create') {
          setTitle('');
          setContent('');
          setSummary('');
          setOrder(order + 1);
        }
      } else if (mode === 'edit' && chapter) {
        const updates: Partial<Chapter> = {
          title,
          content,
          summary: summary.trim() || undefined,
          order
        };
        
        await updateChapter(chapter.id, updates);
        setSuccess('Chapter updated successfully');
      }
    } catch (err) {
      console.error('Error saving chapter:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while saving the chapter');
    } finally {
      setIsSubmitting(false);
      
      // Scroll to top to show success/error messages
      navigateToPage('/story/chapters');
    }
  };

  const handleCancel = () => {
    navigateToPage(`/story/chapters/${chapter?.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <Card.Header 
          title={`${mode === 'create' ? 'Create' : 'Edit'} Chapter`}
          subtitle={mode === 'edit' ? `Editing Chapter ${chapter?.order}: ${chapter?.title}` : 'Create a new chapter'}
        />
        
        <form onSubmit={handleSubmit}>
          <Card.Content>
            {/* Error/Success Messages */}
            {error && (
              <div className={clsx("p-4 mb-6 rounded-md", `${themePrefix}-note`)}>
                <Typography color="error">{error}</Typography>
              </div>
            )}
            
            {success && (
              <div className={clsx("p-4 mb-6 rounded-md", `${themePrefix}-success-icon-bg`)}>
                <Typography color="success">{success}</Typography>
              </div>
            )}
            
            {/* Form Fields */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    label="Chapter Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    fullWidth
                    required
                  />
                </div>
                
                <div className="w-32">
                  <Input
                    label="Order"
                    type="number"
                    min={1}
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value))}
                    fullWidth
                    required
                  />
                </div>
              </div>
              
              <Input
                label="Chapter Summary (optional)"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                fullWidth
                helperText="A brief summary that will be shown in chapter listings"
                isTextArea
                rows={3}
              />
              
              <Input
                label="Chapter Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                fullWidth
                isTextArea
                rows={15}
                required
                helperText="Press Enter for new paragraphs"
              />
            </div>
          </Card.Content>
          
          <Card.Footer className="flex justify-between">
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                startIcon={<ArrowLeft />}
                type="button"
              >
                Cancel
              </Button>
              
              {mode === 'edit' && onDeleteClick && (
                <Button
                  variant="ghost"
                  onClick={onDeleteClick}
                  startIcon={<Trash2 />}
                  type="button"
                  className={clsx(`${themePrefix}-delete-button`)}
                >
                  Delete
                </Button>
              )}
            </div>
            
            <Button
              variant="primary"
              startIcon={<Save />}
              type="submit"
              isLoading={isSubmitting}
            >
              {mode === 'create' ? 'Create Chapter' : 'Save Changes'}
            </Button>
          </Card.Footer>
        </form>
      </Card>
    </div>
  );
};

export default ChapterForm;