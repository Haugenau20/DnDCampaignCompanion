// pages/story/SagaPage.tsx
import React from 'react';
import { BookViewer, useSagaData } from 'features/storytelling';
import Typography from '../../core/components/Typography';
import Breadcrumb from 'shared/components/Breadcrumb';
import Button from '../../core/components/Button';
import { Edit } from 'lucide-react';
import { useNavigation } from 'shared/context/NavigationContext';
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';
import StoryViewTabs from './components/StoryViewTabs';

// Constants for saga default content and tips
const SAGA_DEFAULT_OPENING = "In a realm where magic weaves through the fabric of reality and ancient powers stir from long slumber, a group of unlikely heroes finds their fates intertwined by destiny's unseen hand.";

const SAGA_WRITING_TIPS = [
  "Focus on the overarching narrative rather than session-by-session details",
  "Highlight key moments, victories, and major setbacks that shaped your adventure",
  "Show how your characters have grown and changed throughout the journey",
  "Include major NPCs and significant locations that were central to your story"
];

/**
 * Campaign saga viewer.
 *
 * `hasRequiredContext` from `useSagaData()` is deliberately unused, same
 * reasoning as every other gated page: on its own it cannot tell "no
 * selection" from "still restoring" or from "signed out" -- `usePageGate`
 * distinguishes all three from `useAuth`/`useCampaignContextStatus` directly.
 */
const SagaPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { saga, loading, error } = useSagaData();

  const gate = usePageGate('story', { loading, error });

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
    if (saga && saga.content) {
      return saga.content;
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

  // Get title. Doubles as this page's `h1` (via PageShell) -- there was never
  // a separate page-chrome title distinct from the saga's own, so reusing it
  // avoids inventing a second name for the same thing (same reasoning as
  // NotePage's `pageTitle`).
  const getSagaTitle = () => {
    return saga?.title || "The Campaign Saga";
  };

  return (
    <PageShell
      title={getSagaTitle()}
      breadcrumb={<Breadcrumb items={breadcrumbItems} className="mb-4" />}
      actions={
        gate.canAct && (
          <>
            <StoryViewTabs />
            <Button
              variant="primary"
              onClick={handleEditClick}
              startIcon={<Edit />}
            >
              Edit Saga
            </Button>
          </>
        )
      }
    >
      <GatedContent gate={gate}>
        <div className="max-w-4xl mx-auto">
          {saga && saga.lastUpdated && (
            <Typography variant="body-sm" color="secondary" className="mb-4">
              Last updated: {new Date(saga.lastUpdated).toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})}
            </Typography>
          )}

          <BookViewer
            content={getSagaContent()}
            title={getSagaTitle()}
            onPageChange={handlePageChange}
            // Disable chapter navigation since it's one continuous story
            hasNextChapter={false}
            hasPreviousChapter={false}
          />
        </div>
      </GatedContent>
    </PageShell>
  );
};

export default SagaPage;
