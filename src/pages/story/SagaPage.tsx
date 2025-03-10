// pages/story/SagaPage.tsx
import React, { useState, useEffect } from 'react';
import BookViewer from '../../components/features/story/BookViewer';
import Typography from '../../components/core/Typography';
import Breadcrumb from '../../components/layout/Breadcrumb';
import Button from '../../components/core/Button';
import Card from '../../components/core/Card';
import { Book, Edit, Loader2 } from 'lucide-react';
import { SagaData } from '../../types/saga';
import { useNavigation } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import { useFirebase } from '../../context/FirebaseContext';
import FirebaseService from '../../services/firebase/FirebaseService';
import clsx from 'clsx';

// Constants for saga default content and tips
const SAGA_DEFAULT_OPENING = "In a realm where magic weaves through the fabric of reality and ancient powers stir from long slumber, a group of unlikely heroes finds their fates intertwined by destiny's unseen hand.";

const SAGA_WRITING_TIPS = [
  "Focus on the overarching narrative rather than session-by-session details",
  "Highlight key moments, victories, and major setbacks that shaped your adventure",
  "Show how your characters have grown and changed throughout the journey",
  "Include major NPCs and significant locations that were central to your story"
];

const SagaPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { theme } = useTheme();
  const { user } = useFirebase();
  const themePrefix = theme.name;
  const [data, setData] = useState<SagaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saga data
  useEffect(() => {
    const fetchSaga = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const firebaseService = FirebaseService.getInstance();
        const sagaData = await firebaseService.getDocument<SagaData>('saga', 'sagaData');
        
        if (sagaData) {
          setData(sagaData);
        } else {
          // No saga data, but we'll handle this with placeholder content
          setData(null);
        }
      } catch (err) {
        console.error('Error loading saga:', err);
        setError('Error Loading Saga. Sign in to view content.');
      } finally {
        setLoading(false);
      }
    };

    fetchSaga();
  }, []);

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Story', href: '/story' },
    { label: 'Campaign Saga' }
  ];

  const handlePageChange = (page: number) => {
    // Implement page progress tracking if needed
    console.log('Page changed:', page);
  };

  // Handle edit button click
  const handleEditClick = () => {
    navigateToPage('/story/saga/edit');
  };

  // Generate content based on whether saga exists
  const getSagaContent = () => {
    if (data && data.content) {
      return data.content;
    }
    
    // If no saga exists, return default content with tips
    return `${SAGA_DEFAULT_OPENING}\n\n${getPlaceholderContent()}`;
  };

  // Generate placeholder content with tips
  const getPlaceholderContent = () => {
    let content = "Your campaign saga has not been written yet. Here are some tips to get started:\n\n";
    
    // Add numbered tips
    SAGA_WRITING_TIPS.forEach((tip, index) => {
      content += `${index + 1}. ${tip}\n`;
    });
    
    content += "\nClick the Edit button to start writing your campaign's epic tale!";
    
    return content;
  };

  // Get title
  const getSagaTitle = () => {
    return data?.title || "The Campaign Saga";
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className={clsx("p-8", `${themePrefix}-card`)}>
          <div className="flex items-center gap-4">
            <Loader2 className={clsx("w-6 h-6 animate-spin", `${themePrefix}-primary`)} />
            <Typography className={`${themePrefix}-typography`}>Loading saga...</Typography>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className={clsx("p-8", `${themePrefix}-card`)}>
          <Typography color="error">
            {error}
          </Typography>
        </Card>
      </div>
    );
  }

  return (
    <div className={clsx("min-h-screen p-4", `${themePrefix}-content`)}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb items={breadcrumbItems} className="mb-4" />

        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {data && data.lastUpdated && (
              <Typography variant="body-sm" color="secondary" className="hidden md:block">
                Last updated: {new Date(data.lastUpdated).toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})}
              </Typography>
            )}
          </div>

          <div className="flex gap-2">
            {/* Only show edit button for authenticated users */}
            {user && (
              <Button
                variant="primary"
                onClick={handleEditClick}
                startIcon={<Edit />}
              >
                Edit Saga
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

        {/* Book Viewer */}
        <div className="max-w-4xl mx-auto">
          <BookViewer
            content={getSagaContent()}
            title={getSagaTitle()}
            onPageChange={handlePageChange}
            // Disable chapter navigation since it's one continuous story
            hasNextChapter={false}
            hasPreviousChapter={false}
          />
        </div>
      </div>
    </div>
  );
};

export default SagaPage;