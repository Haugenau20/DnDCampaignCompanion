// src/features/storytelling/chapters/components/ChapterForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TEXT_LIMITS } from 'core/constants/textLimits';
import { Chapter } from '../types';
import { DomainData } from 'core/types/common';
import Card from 'core/components/Card';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import Input from 'core/components/Input';
import MarkdownToolbar from 'core/components/MarkdownToolbar';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigation } from 'shared/context/NavigationContext';
import { useStory } from '../context/StoryContext';
import { useChapterContent } from '../hooks/useChapterContent';

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
  const { navigateToPage } = useNavigation();
  const { createChapter, updateChapter, chapters } = useStory();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  /** The body field, so the markdown toolbar can write into it. */
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [order, setOrder] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // The text is a document of its own (T134), read once the chapter is open.
  const storedContent = useChapterContent(mode === 'edit' ? chapter : undefined);
  const contentLoading = mode === 'edit' && storedContent === undefined;

  // Initialize form with chapter data if in edit mode
  useEffect(() => {
    if (chapter && mode === 'edit') {
      setTitle(chapter.title);
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

  useEffect(() => {
    if (storedContent !== undefined) setContent(storedContent);
  }, [storedContent]);

  /**
   * Generate a summary from content if none is provided
   * @param content Chapter content text
   * @param maxLength Maximum length of summary
   * @returns Summary string with ellipsis if truncated
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
      if (!title.trim()) {
        throw new Error('Title is required');
      }
      if (!content.trim()) {
        throw new Error('Content is required');
      }

      // Generate summary from content if not provided
      const finalSummary = summary.trim() || generateSummaryFromContent(content);

      // Create or update the chapter
      if (mode === 'create') {
        const newChapter: DomainData<Chapter> = {
          title,
          content,
          summary: finalSummary, // Use generated summary if empty
          order,
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
          summary: finalSummary, // Use generated summary if empty
          order,
        };
        
        await updateChapter(chapter.id, updates);
        setSuccess('Chapter updated successfully');
      }

      // Only once the write has landed. The typed text lives nowhere but this
      // form, so leaving after a refused save threw the author's prose away
      // along with the error that would have said why (FUNC-005).
      navigateToPage('/story/chapters');
    } catch (err) {
      console.error('Error saving chapter:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while saving the chapter');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Back to the chapter being edited, or to the index when creating one. */
  const handleCancel = () => {
    navigateToPage(chapter ? `/story/chapters/${chapter.id}` : '/story/chapters');
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
              <div className="p-4 mb-6 rounded-md note">
                <Typography color="error">{error}</Typography>
              </div>
            )}
            
            {success && (
              <div className="p-4 mb-6 rounded-md success-icon-bg">
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
                    maxLength={TEXT_LIMITS.line}
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
                maxLength={TEXT_LIMITS.text}
                onChange={(e) => setSummary(e.target.value)}
                fullWidth
                helperText="A brief summary that will be shown in chapter listings. If left empty, it will be automatically generated from content."
                isTextArea
                rows={3}
              />
              
              <div>
                <MarkdownToolbar
                  targetRef={contentRef}
                  onChange={setContent}
                  label="Chapter content formatting"
                />
                <Input
                  ref={contentRef}
                  label="Chapter Content"
                  value={content}
                  maxLength={TEXT_LIMITS.chapter}
                  onChange={(e) => setContent(e.target.value)}
                  fullWidth
                  isTextArea
                  rows={15}
                  required
                  // Nothing typed before the text arrives could be saved
                  // without replacing it.
                  disabled={contentLoading}
                  helperText={contentLoading
                    ? "Loading the chapter's text..."
                    : "Takes markdown: **bold**, *italic*, > quote. One Enter breaks the line, a blank line starts a new paragraph."}
                />
              </div>
            </div>
          </Card.Content>
          
          <Card.Footer className="flex flex-wrap justify-between gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-3">
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
                  className="delete-button"
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
              disabled={contentLoading}
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