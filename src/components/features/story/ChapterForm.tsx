// components/features/story/ChapterForm.tsx
import React, { useState, useEffect } from 'react';
import { Chapter, ChapterFormData } from '../../../types/story';
import Card from '../../core/Card';
import Button from '../../core/Button';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigation } from '../../../context/NavigationContext';
import { useStory } from '../../../context/StoryContext';

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
 * Only handles domain data - system metadata managed by context
 */
const ChapterForm: React.FC<ChapterFormProps> = ({ 
  chapter, 
  mode, 
  onDeleteClick 
}) => {
  const { navigateToPage } = useNavigation();
  const { create: createChapter, update: updateChapter, items: chapters } = useStory();
  
  // Pure domain form state - no system metadata
  const [formData, setFormData] = useState<ChapterFormData>({
    title: '',
    content: '',
    summary: '',
    order: 1,
    subChapters: []
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form with chapter data if in edit mode
  useEffect(() => {
    if (chapter && mode === 'edit') {
      setFormData({
        title: chapter.title,
        content: chapter.content,
        summary: chapter.summary || '',
        order: chapter.order,
        subChapters: chapter.subChapters || []
      });
    } else if (mode === 'create') {
      // For create mode, set the order to be the next in sequence
      const maxOrder = chapters.length > 0
        ? Math.max(...chapters.map(c => c.order))
        : 0;
      setFormData(prev => ({
        ...prev,
        order: maxOrder + 1
      }));
    }
  }, [chapter, mode, chapters]);

  // Generic input change handler
  const handleInputChange = (field: keyof ChapterFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Generate a summary from content if none is provided
   */
  const generateSummaryFromContent = (content: string, maxLength: number = 200): string => {
    if (!content || content.length === 0) return '';
    
    // Clean up whitespace and get the first portion of content
    const cleanContent = content.trim().replace(/\s+/g, ' ');
    
    if (cleanContent.length <= maxLength) {
      return cleanContent;
    }
    
    // Find a good breaking point (end of sentence or paragraph)
    let breakPoint = cleanContent.substring(0, maxLength).lastIndexOf('.');
    if (breakPoint === -1 || breakPoint < maxLength / 2) {
      // No good sentence break found, try paragraph
      breakPoint = cleanContent.substring(0, maxLength).lastIndexOf('\n');
    }
    if (breakPoint === -1 || breakPoint < maxLength / 2) {
      // No good paragraph break found, try space
      breakPoint = cleanContent.substring(0, maxLength).lastIndexOf(' ');
    }
    if (breakPoint === -1 || breakPoint < maxLength / 2) {
      // No good space found, just cut at maxLength
      breakPoint = maxLength;
    }
    
    return cleanContent.substring(0, breakPoint) + '...';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate form
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.content.trim()) {
        throw new Error('Content is required');
      }

      // Generate summary from content if not provided
      const finalSummary = formData.summary?.trim() || generateSummaryFromContent(formData.content);

      const chapterData: ChapterFormData = {
        ...formData,
        summary: finalSummary
      };

      // Create or update the chapter - context handles all system metadata
      if (mode === 'create') {
        await createChapter(chapterData);
        setSuccess('Chapter created successfully');
        
        // Reset form for create mode
        setFormData({
          title: '',
          content: '',
          summary: '',
          order: formData.order + 1, // Increment for next chapter
          subChapters: []
        });
      } else if (chapter) {
        await updateChapter(chapter.id, chapterData);
        setSuccess('Chapter updated successfully');
      }

      // Navigate back after a brief delay to show success message
      setTimeout(() => {
        navigateToPage('/story');
      }, 1500);
      
    } catch (err) {
      console.error('Error saving chapter:', err);
      setError(err instanceof Error ? err.message : 'Failed to save chapter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigateToPage('/story');
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <Card.Header
        title={mode === 'create' ? 'Create New Chapter' : `Edit Chapter: ${chapter?.title}`}
        action={
          <Button
            variant="outline"
            onClick={handleBack}
            startIcon={<ArrowLeft />}
          >
            Back to Story
          </Button>
        }
      />
      <Card.Content>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Title *"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Chapter title..."
              required
            />
            
            <Input
              label="Order"
              type="number"
              value={formData.order}
              onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 1)}
              min={1}
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-1 form-label">
              Chapter Content *
            </label>
            <textarea
              className="w-full rounded-lg border p-3 h-96 input font-mono text-sm"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Write your chapter content here..."
              required
            />
            <div className="text-sm typography-secondary mt-1">
              {formData.content.length} characters
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium mb-1 form-label">
              Summary
            </label>
            <textarea
              className="w-full rounded-lg border p-3 h-24 input"
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              placeholder="Optional summary (will be auto-generated if left empty)"
            />
            <div className="text-sm typography-secondary mt-1">
              Leave empty to auto-generate from content
            </div>
          </div>

          {/* Error and Success Messages */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
              <Typography variant="body" className="text-red-800 dark:text-red-200">
                {error}
              </Typography>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <Typography variant="body" className="text-green-800 dark:text-green-200">
                {success}
              </Typography>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            {/* Delete button for edit mode */}
            {mode === 'edit' && onDeleteClick && (
              <Button
                type="button"
                variant="outline"
                onClick={onDeleteClick}
                startIcon={<Trash2 />}
                className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
              >
                Delete Chapter
              </Button>
            )}
            
            {/* Save button */}
            <div className={mode === 'create' ? 'ml-auto' : ''}>
              <Button
                type="submit"
                disabled={isSubmitting}
                startIcon={<Save />}
              >
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Chapter' : 'Update Chapter'}
              </Button>
            </div>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
};

export default ChapterForm;