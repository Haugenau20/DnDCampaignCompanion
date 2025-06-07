// pages/story/SagaEditPage.tsx
import React, { useState, useEffect } from 'react';
import Typography from '../../components/core/Typography';
import Input from '../../components/core/Input';
import Button from '../../components/core/Button';
import Card from '../../components/core/Card';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/firebase';
import { SagaData } from '../../types/saga';
import { Book, Save, ArrowLeft, FileDown, HelpCircle } from 'lucide-react';
import { exportChaptersAsText } from '../../utils/export-utils';
import { useStory } from '../../context/StoryContext';
import Dialog from '../../components/core/Dialog';

// Constants for default content if none exists
const SAGA_DEFAULT_OPENING = "In a realm where magic weaves through the fabric of reality and ancient powers stir from long slumber, a group of unlikely heroes finds their fates intertwined by destiny's unseen hand.";

const SagaEditPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { user } = useAuth();
  const { chapters } = useStory();
  // TODO: Saga functionality needs to be implemented in story context
  const saga: SagaData | null = null;
  const loading = false;
  const error = null;
  const hasRequiredContext = true;
  const saveSaga = async (data: any) => {
    console.log('Saga save functionality needs to be implemented', data);
    return true;
  };
  
  const [title, setTitle] = useState('The Campaign Saga');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showExportInfo, setShowExportInfo] = useState(false);

  // Initialize form with saga data once loaded
  useEffect(() => {
    if (saga) {
      const sagaData = saga as SagaData;
      setTitle(sagaData.title || '');
      setContent(sagaData.content || '');
    } else if (!loading && hasRequiredContext) {
      // Initialize with default content
      setContent(SAGA_DEFAULT_OPENING);
    }
  }, [saga, loading, hasRequiredContext]);

  // Redirect if not signed in
  useEffect(() => {
    if (!loading && !user) {
      navigateToPage('/story/saga');
    }
  }, [loading, user, navigateToPage]);

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Story', href: '/story' },
    { label: 'Campaign Saga', href: '/story/saga' },
    { label: 'Edit Saga' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || saving || !hasRequiredContext) return;
    
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
      
      // Update or create saga document
      const now = new Date().toISOString();
      const sagaData: SagaData = {
        id: 'saga', // Saga is singleton
        title: title.trim(),
        content: content.trim(),
        version: '1.0', // Simple versioning for now,
        createdAt: now,
        modifiedAt: now,
        createdBy: user?.uid || '',
        createdByUsername: user?.displayName || '',
        modifiedBy: user?.uid || '',
        modifiedByUsername: user?.displayName || '',
        dateAdded: now,
        dateModified: now,
        updatedAt: now
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

  // Handle context errors
  if (!hasRequiredContext) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 card">
          <Typography className={`typography`}>
            Please select a group and campaign to edit the saga.
          </Typography>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Typography>Loading...</Typography>
      </div>
    );
  }

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

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  return (
    <div className="min-h-screen p-4 content">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Book className="w-6 h-6 primary" />
            <Typography variant="h2" className="typography-heading">
              Edit Campaign Saga
            </Typography>
          </div>
          
          {/* Export button - subtle placement in the header */}
          <div className="flex items-center gap-2">
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
              className="hover:opacity-80 typography-secondary"
              onClick={() => setShowExportInfo(true)}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
        
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
              
              <Input
                label="Saga Content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                fullWidth
                isTextArea
                rows={20}
                required
                helperText="Press Enter for new paragraphs. Tell the epic story of your campaign!"
              />
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
      </div>
      
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
            <Button onClick={() => setShowExportInfo(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default SagaEditPage;