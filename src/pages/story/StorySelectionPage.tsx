// pages/story/StorySelectionPage.tsx
import React from 'react';
import Typography from '../../components/core/Typography';
import Card from '../../components/core/Card';
import { useNavigation } from '../../context/NavigationContext';
import { ScrollText, BookOpen } from 'lucide-react';

/**
 * Story selection page displaying options for viewing the campaign narrative
 * Allows users to choose between session-by-session chapter or the continuous saga
 */
const StorySelectionPage: React.FC = () => {
  const { navigateToPage } = useNavigation();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 content">
      <div className="text-center mb-12">
        <Typography variant="h1" className="mb-4 typography-heading">
          Campaign Chronicles
        </Typography>
        <Typography variant="body-lg" color="secondary" className="mb-8">
          Choose how you want to experience your campaign's story
        </Typography>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Session Chapters Card */}
        <Card
          hoverable
          onClick={() => navigateToPage('/story/chapters')}
          className="text-center p-8 cursor-pointer transition-transform hover:scale-105"
        >
          <Card.Content>
            <div className="flex flex-col items-center">
              <ScrollText className="w-24 h-24 mb-6 secondary" />
              <Typography variant="h2" className="mb-4 typography-heading">
                Session Chapters
              </Typography>
              <Typography color="secondary">
                Relive your adventures as they happened, session by session.
                Explore detailed accounts of each game session with all actions
                and events preserved.
              </Typography>
            </div>
          </Card.Content>
        </Card>

        {/* Campaign Saga Card */}
        <Card
          hoverable
          onClick={() => navigateToPage('/story/saga')}
          className="text-center p-8 cursor-pointer transition-transform hover:scale-105"
        >
          <Card.Content>
            <div className="flex flex-col items-center">
              <BookOpen className="w-24 h-24 mb-6 accent" />
              <Typography variant="h2" className="mb-4 typography-heading">
                Campaign Saga
              </Typography>
              <Typography color="secondary">
                Experience your campaign as one continuous epic tale.
                A seamlessly woven narrative of your party's complete adventure.
              </Typography>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default StorySelectionPage;