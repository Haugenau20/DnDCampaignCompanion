// pages/story/SagaEditPage.tsx
import React, { useState, useEffect } from 'react';
import Typography from '../../components/core/Typography';
import Input from '../../components/core/Input';
import Button from '../../components/core/Button';
import Card from '../../components/core/Card';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '../../context/NavigationContext';
import { useFirebase } from '../../context/FirebaseContext';
import { useStory } from '../../context/StoryContext';
import { Book, Save, ArrowLeft, FileDown, HelpCircle } from 'lucide-react';
import { SagaData } from '../../types/saga';
import FirebaseService from '../../services/firebase/FirebaseService';
import { exportChaptersAsText } from '../../utils/export-utils';
import clsx from 'clsx';
import Dialog from '../../components/core/Dialog';

// Constants for default content if none exists
const SAGA_DEFAULT_OPENING = "In a realm where magic weaves through the fabric of reality and ancient powers stir from long slumber, a group of unlikely heroes finds their fates intertwined by destiny's unseen hand.";

const SagaEditPage: React.FC = () => {
  const { theme } = useTheme();
  const { navigateToPage } = useNavigation();
  const { user } = useFirebase();
  const { chapters } = useStory();
  const themePrefix = theme.name;
  
  const [title, setTitle] = useState('The Campaign Saga');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExportInfo, setShowExportInfo] = useState(false);

  // Fetch existing saga data
  useEffect(() => {
    const fetchSaga = async () => {
      setLoading(true);
      
      try {
        const firebaseService = FirebaseService.getInstance();
        const sagaData = await firebaseService.getDocument<SagaData>('saga', 'sagaData');
        
        if (sagaData) {
          setTitle(sagaData.title);
          setContent(sagaData.content);
        } else {
          // Initialize with default content
          setContent(SAGA_DEFAULT_OPENING);
        }
      } catch (err) {
        console.error('Error loading saga for editing:', err);
        setError('Failed to load saga content. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSaga();
  }, []);

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
    
    if (!user || saving) return;
    
    setError(null);
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
      
      const firebaseService = FirebaseService.getInstance();
      
      // Update or create saga document
      const sagaData: SagaData = {
        title: title.trim(),
        content: content.trim(),
        lastUpdated: new Date().toISOString(),
        version: '1.0' // Simple versioning for now
      };
      
      await firebaseService.setDocument('saga', 'sagaData', sagaData);
      
      setSuccess('Saga updated successfully');
      
      // Automatically navigate back after short delay
      setTimeout(() => {
        navigateToPage('/story/saga');
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving');
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
      setError('No chapters available to export');
      return;
    }
    
    try {
      exportChaptersAsText(chapters);
    } catch (err) {
      setError('Failed to export chapters');
      console.error('Export error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Typography>Loading...</Typography>
      </div>
    );
  }

  if (!user) {
    return null; // Will be redirected by useEffect
  }

  return (
    <div className={clsx("min-h-screen p-4", `${themePrefix}-content`)}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb items={breadcrumbItems} className="mb-4" />
        
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Book className={clsx("w-6 h-6", `${themePrefix}-primary`)} />
            <Typography variant="h2" className={clsx(`${themePrefix}-typography-heading`)}>
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
              className={clsx("hover:opacity-80", `${themePrefix}-typography-secondary`)}
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
              {error && (
                <div className={clsx("p-4 mb-4 rounded-md", `${themePrefix}-note`)}>
                  <Typography color="error">{error}</Typography>
                </div>
              )}
              
              {success && (
                <div className={clsx("p-4 mb-4 rounded-md", `${themePrefix}-success-icon-bg`)}>
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