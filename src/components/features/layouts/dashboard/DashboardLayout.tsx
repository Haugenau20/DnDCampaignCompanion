// components/features/layouts/DashboardLayout.tsx
import React from 'react';
import CampaignBanner from './sections/CampaignBanner';
import ActivityFeed from './sections/ActivityFeed';
import CampaignStats from './sections/CampaignStats';
import GlobalActionButton from '../../../shared/GlobalActionButton';

// Props interface for layout components
export interface LayoutProps {
  npcs: any[];
  locations: any[];
  quests: any[];
  chapters: any[];
  rumors: any[];
  activities: any[];
  loading: boolean;
}

/**
 * DashboardLayout component - the default grid-based layout
 */
const DashboardLayout: React.FC<LayoutProps> = ({
  npcs,
  locations,
  quests,
  chapters,
  rumors,
  activities,
  loading,
}) => {

  return (
    <>
      {/* Campaign Banner */}
      <CampaignBanner />
      
      {/* Responsive Layout - Side by side on large screens, stacked on smaller screens */}
      <div className="w-full lg:grid lg:grid-cols-3 lg:gap-4 lg:gap-6">
        {/* Campaign Stats - Full width on mobile, 2/3 width on desktop */}
        <div className="mt-4 lg:col-span-2">
          <CampaignStats 
            npcs={npcs}
            locations={locations}
            quests={quests}
            chapters={chapters}
            rumors={rumors}
            loading={loading}
          />
        </div>
        
        {/* Activity Feed - Full width on mobile, moves to right 1/3 on desktop */}
        <div className="mt-6 lg:mt-4">
          <ActivityFeed 
            activities={activities} 
            loading={loading} 
          />
        </div>
      </div>
      
      {/* Global Action Button */}
      <GlobalActionButton />
    </>
  );
};

export default DashboardLayout;