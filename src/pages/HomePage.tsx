// pages/HomePage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, useGroups, useCampaigns } from '../context/firebase';
import { useStory } from '../context/StoryContext';
import { useQuests } from '../context/QuestContext';
import { useRumors } from '../context/RumorContext';
import { useNPCs } from '../context/NPCContext';
import { useLocations } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import clsx from 'clsx';
import CampaignBanner from '../components/features/dashboard/CampaignBanner';
import ActivityFeed from '../components/features/dashboard/ActivityFeed';
import CampaignStats from '../components/features/dashboard/CampaignStats';
import ContinueReading from '../components/features/dashboard/ContinueReading';
import GlobalActionButton from '../components/features/dashboard/GlobalActionButton';

// Combined activity type from all content types
export interface Activity {
  id: string;
  type: 'chapter' | 'npc' | 'quest' | 'rumor' | 'location';
  title: string;
  description?: string;
  actor: string;
  timestamp: Date;
  link: string;
}

/**
 * HomePage component serving as the main dashboard for the application
 */
const HomePage: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { activeGroup } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const themePrefix = theme.name;
  
  // Load data from all contexts
  const { chapters, isLoading: chaptersLoading } = useStory();
  const { quests, isLoading: questsLoading } = useQuests();
  const { rumors, isLoading: rumorsLoading } = useRumors();
  const { npcs, isLoading: npcsLoading } = useNPCs();
  const { locations, isLoading: locationsLoading } = useLocations();
  
  // Recent activity state
  const [loading, setLoading] = useState(true);
  
  // Update loading state based on all data sources
  useEffect(() => {
    const isLoading = chaptersLoading || questsLoading || rumorsLoading || npcsLoading || locationsLoading;
    setLoading(isLoading);
  }, [chaptersLoading, questsLoading, rumorsLoading, npcsLoading, locationsLoading]);

  // Inside the useMemo for creating activities in HomePage.tsx
  // Create combined recent activity from all content types
  const activities = useMemo(() => {
    const allActivities: Activity[] = [];
    
    // Add chapters - these already go to view pages
    chapters.forEach(chapter => {
      if (chapter.lastModified) {
        allActivities.push({
          id: chapter.id,
          type: 'chapter',
          title: chapter.title,
          description: chapter.summary || chapter.content.substring(0, 100) + '...',
          actor: '',
          timestamp: new Date(chapter.lastModified),
          link: `/story/chapters/${chapter.id}` // Correctly goes to view page
        });
      }
    });
    
    // Add quests - now going to the quests list page
    quests.forEach(quest => {
      if (quest.dateModified) {
        allActivities.push({
          id: quest.id,
          type: 'quest',
          title: quest.title,
          description: quest.description,
          actor: quest.modifiedByUsername || '',
          timestamp: new Date(quest.dateModified),
          link: `/quests?highlight=${quest.id}` // Go to quests list page with highlight param
        });
      }
    });
    
    // Add rumors - now going to the rumors list page
    rumors.forEach(rumor => {
      if (rumor.dateModified) {
        allActivities.push({
          id: rumor.id,
          type: 'rumor',
          title: rumor.title,
          description: rumor.content.substring(0, 100) + '...',
          actor: rumor.modifiedByUsername || '',
          timestamp: new Date(rumor.dateModified),
          link: `/rumors?highlight=${rumor.id}` // Go to rumors list page with highlight param
        });
      }
    });
    
    // Add NPCs - now going to the NPCs list page
    npcs.forEach(npc => {
      if (npc.dateModified) {
        allActivities.push({
          id: npc.id,
          type: 'npc',
          title: npc.name,
          description: npc.description.substring(0, 100) + '...',
          actor: npc.modifiedByUsername || '',
          timestamp: new Date(npc.dateModified),
          link: `/npcs?highlight=${npc.id}` // Go to NPCs list page with highlight param
        });
      }
    });
    
    // Add locations - now going to the locations list page
    locations.forEach(location => {
      if (location.dateModified) {
        allActivities.push({
          id: location.id,
          type: 'location',
          title: location.name,
          description: location.description.substring(0, 100) + '...',
          actor: location.modifiedByUsername || '',
          timestamp: new Date(location.dateModified),
          link: `/locations?highlight=${location.id}` // Go to locations list page with highlight param
        });
      }
    });
    
    // Sort by timestamp (newest first)
    return allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [chapters, quests, rumors, npcs, locations]);
  
  return (
    <div className={clsx("max-w-7xl mx-auto px-4 py-8", `${themePrefix}-content`)}>
      {/* Campaign Banner */}
      <CampaignBanner />
      
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Activity Feed - 2/3 width on desktop */}
        <div className="md:col-span-2">
          <ActivityFeed 
            activities={activities} 
            loading={loading} 
          />
        </div>
        
        {/* Campaign Stats - 1/3 width on desktop */}
        <div className="md:col-span-1">
          <CampaignStats 
            npcs={npcs}
            locations={locations}
            quests={quests}
            chapters={chapters}
            rumors={rumors}
            loading={loading}
          />
        </div>
      </div>
      
      {/* Continue Reading Section - Full width */}
      <div className="mt-8">
        <ContinueReading 
          chapters={chapters}
          npcs={npcs}
          quests={quests}
          rumors={rumors}
          locations={locations}
        />
      </div>
      
      {/* Global Action Button */}
      <GlobalActionButton />
    </div>
  );
};

export default HomePage;