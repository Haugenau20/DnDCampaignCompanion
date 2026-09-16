// pages/story/SagaEditPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import Typography from '../../core/components/Typography';
import Input from '../../core/components/Input';
import MarkdownToolbar from '../../core/components/MarkdownToolbar';
import Button from '../../core/components/Button';
import Card from '../../core/components/Card';
import Breadcrumb from 'shared/components/Breadcrumb';
import { useNavigation } from 'shared/context/NavigationContext';
import { useSagaData, useStory } from 'features/storytelling';
import type { SagaContentInput } from 'features/storytelling';
import { Save, ArrowLeft, FileDown, HelpCircle } from 'lucide-react';
import { exportChaptersAsText } from 'shared/utils/export-utils';
import Dialog from '../../core/components/Dialog';
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';

// Constants for default content if none exists
const SAGA_DEFAULT_OPENING = "In a realm where magic weaves through the fabric of reality and ancient powers stir from long slumber, a group of unlikely heroes finds their fates intertwined by destiny's unseen hand.";

/**
 * Saga editor.
 *
 * Write route ("story", `mode: "write"`) -- a signed-out visitor now sees
 * "Sign in to write a chapter" (the shared write-mode heading for this page
 * key) with the title still in place, instead of the old `!user` redirect
 * effect that silently bounced them back to `/story/saga` before the page
 * ever said why. `handleSubmit`'s guard drops both `!user` and
 * `!hasRequiredContext` in favour of `!gate.canAct`, which already folds in
 * both of those plus the fetch error.
 */
const SagaEditPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { chapters } = useStory();
  const { saga, loading, error, saveSaga } = useSagaData();

  const gate = usePageGate('story', { loading, error, mode: 'write' });

  const [title, setTitle] = useState('The Campaign Saga');
  const [content, setContent] = useState('');
  /** The body field, so the markdown toolbar can write into it. */
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showExportInfo, setShowExportInfo] = useState(false);

  // Initialize form with saga data once loaded
  useEffect(() => {
    if (saga) {
      setTitle(saga.title);
      setContent(saga.content);
    } else if (gate.canAct) {
      // Initialize with default content
      setContent(SAGA_DEFAULT_OPENING);
    }
  }, [saga, gate.canAct]);

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Story', href: '/story' },
    { label: 'Campaign Saga', href: '/story/saga' },
    { label: 'Edit Saga' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gate.canAct || saving) return;

    setLocalError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // Validate inputs
      if (!title.trim()) {
        throw new Error('Title is required');
      }

      if (!content.trim()) {
        throw new Error('Content is required');
      }

      // Update or create saga document. Attribution (created*/modified*) is not a
      // page concern — useSagaData computes it from the acting user and group
      // profile (see bug #1203).
      const sagaData: SagaContentInput = {
        title: title.trim(),
        content: content.trim(),
        lastUpdated: new Date().toISOString(),
        version: '1.0' // Simple versioning for now
      };

      const success = await saveSaga(sagaData);

      if (success) {
        setSuccess('Saga updated successfully');

        // Automatically navigate back after short delay
        setTimeout(() => {
          navigateToPage('/story/saga');
        }, 1500);
      } else {
        throw new Error('Failed to save saga');
      }

    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigateToPage('/story/saga');
  };

  // Function to handle exporting chapters as text
  const handleExportChapters = () => {
    if (chapters.length === 0) {
      setLocalError('No chapters available to export');
      return;
    }

    try {
      exportChaptersAsText(chapters);
    } catch (err) {
      setLocalError('Failed to export chapters');
      console.error('Export error:', err);
    }
  };

  return (
    <PageShell
      title="Edit Campaign Saga"
      breadcrumb={<Breadcrumb items={breadcrumbItems} className="mb-4" />}
      actions={
        gate.canAct && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportChapters}
              startIcon={<FileDown className="w-4 h-4" />}
              className="text-sm"
            >
              Export Chapter Content
            </Button>
            <button
              type="button"
              aria-label="What does exporting chapter content do?"
              className="hover:opacity-80 typography-secondary"
              onClick={() => setShowExportInfo(true)}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </>
        )
      }
    >
      <GatedContent gate={gate}>
        {/* Edit Form */}
        <Card>
          <form onSubmit={handleSubmit}>
            <Card.Content className="space-y-6">
              {/* Error/Success Messages */}
              {localError && (
                <div className="p-4 mb-4 rounded-md note">
                  <Typography color="error">{localError}</Typography>
                </div>
              )}

              {success && (
                <div className="p-4 mb-4 rounded-md success-icon-bg">
                  <Typography color="success">{success}</Typography>
                </div>
              )}

              {/* Form Fields */}
              <Input
                label="Saga Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                required
              />

              <div>
                <MarkdownToolbar
                  targetRef={contentRef}
                  onChange={setContent}
                  label="Saga content formatting"
                />
                <Input
                  ref={contentRef}
                  label="Saga Content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  fullWidth
                  isTextArea
                  rows={20}
                  required
                  helperText="Takes markdown: **bold**, *italic*, > quote. One Enter breaks the line, a blank line starts a new paragraph."
                />
              </div>
            </Card.Content>

            <Card.Footer className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleCancel}
                startIcon={<ArrowLeft />}
                type="button"
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                startIcon={<Save />}
                type="submit"
                isLoading={saving}
              >
                Save Saga
              </Button>
            </Card.Footer>
          </form>
        </Card>

        {/* Export Info Dialog */}
        <Dialog
          open={showExportInfo}
          onClose={() => setShowExportInfo(false)}
          title="About Chapter Export"
        >
          <div className="space-y-4">
            <Typography>
              The "Export Chapter Content" feature creates a text file containing all your chapters in order.
            </Typography>

            <Typography>
              This can be useful when:
            </Typography>

            <ul className="list-disc pl-5 space-y-1">
              <li>
                <Typography>
                  You want to reference all chapter content while writing your saga
                </Typography>
              </li>
              <li>
                <Typography>
                  You need to create a backup of all your chapter content
                </Typography>
              </li>
              <li>
                <Typography>
                  You want to use the content in another application
                </Typography>
              </li>
            </ul>

            <Typography>
              The exported file will be downloaded to your device automatically.
            </Typography>

            <div className="flex justify-end mt-4">
              <Button
  variant="outline" onClick={() => setShowExportInfo(false)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      </GatedContent>
    </PageShell>
  );
};

export default SagaEditPage;
