// pages/HomePage.tsx
import React, { useState } from 'react';
import { useAuth, useGroups, useCampaigns } from '../context/firebase';
import { useStory } from '../context/StoryContext';
import { useQuests } from '../context/QuestContext';
import { useRumors } from '../context/RumorContext';
import { useNPCs } from '../context/NPCContext';
import { useLocations } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import clsx from 'clsx';

// Import layouts
import DashboardLayout from '../components/features/layouts/dashboard/DashboardLayout';
import JournalLayout from '../components/features/layouts/journal/JournalLayout';
import Button from '../components/core/Button';
import { Book, LayoutDashboard } from 'lucide-react';
import useLayoutData from '../components/features/layouts/common/hooks/useLayoutData';

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

// Layout type options
type LayoutType = 'dashboard' | 'journal';

/**
 * HomePage component serving as the container for the selected layout
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
  
  // Layout selection state
  const [layoutType, setLayoutType] = useState<LayoutType>('dashboard');
  
  // Create combined recent activity from all content types
  const activities = React.useMemo(() => {
    const allActivities: Activity[] = [];
    
    // Add chapters
    chapters.forEach(chapter => {
      if (chapter.lastModified) {
        allActivities.push({
          id: chapter.id,
          type: 'chapter',
          title: chapter.title,
          description: chapter.summary || chapter.content.substring(0, 100) + '...',
          actor: '',
          timestamp: new Date(chapter.lastModified),
          link: `/story/chapters/${chapter.id}`
        });
      }
    });
    
    // Add quests
    quests.forEach(quest => {
      if (quest.dateModified) {
        allActivities.push({
          id: quest.id,
          type: 'quest',
          title: quest.title,
          description: quest.description,
          actor: quest.modifiedByUsername || '',
          timestamp: new Date(quest.dateModified),
          link: `/quests?highlight=${quest.id}`
        });
      }
    });
    
    // Add rumors
    rumors.forEach(rumor => {
      if (rumor.dateModified) {
        allActivities.push({
          id: rumor.id,
          type: 'rumor',
          title: rumor.title,
          description: rumor.content.substring(0, 100) + '...',
          actor: rumor.modifiedByUsername || '',
          timestamp: new Date(rumor.dateModified),
          link: `/rumors?highlight=${rumor.id}`
        });
      }
    });
    
    // Add NPCs
    npcs.forEach(npc => {
      if (npc.dateModified) {
        allActivities.push({
          id: npc.id,
          type: 'npc',
          title: npc.name,
          description: npc.description.substring(0, 100) + '...',
          actor: npc.modifiedByUsername || '',
          timestamp: new Date(npc.dateModified),
          link: `/npcs?highlight=${npc.id}`
        });
      }
    });
    
    // Add locations
    locations.forEach(location => {
      if (location.dateModified) {
        allActivities.push({
          id: location.id,
          type: 'location',
          title: location.name,
          description: location.description.substring(0, 100) + '...',
          actor: location.modifiedByUsername || '',
          timestamp: new Date(location.dateModified),
          link: `/locations?highlight=${location.id}`
        });
      }
    });
    
    // Sort by timestamp (newest first)
    return allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [chapters, quests, rumors, npcs, locations]);
  
  // Use common layout data hook to process and prepare data
  const layoutData = useLayoutData({
    chapters,
    quests,
    rumors,
    npcs,
    locations,
    activities,
    chaptersLoading,
    questsLoading,
    rumorsLoading,
    npcsLoading,
    locationsLoading
  });
  
  // Handle layout toggle
  const toggleLayout = () => {
    setLayoutType(layoutType === 'dashboard' ? 'journal' : 'dashboard');
  };
  
  return (
    <div className='max-w-7xl mx-auto'>
      <div className={clsx(
        "container mx-auto px-2 sm:px-4 py-4 overflow-x-hidden", 
        `${themePrefix}-content`
      )}>
        {/* Layout Toggle Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLayout}
            startIcon={layoutType === 'dashboard' ? <Book size={16} /> : <LayoutDashboard size={16} />}
          >
            {layoutType === 'dashboard' ? 'Switch to Journal View' : 'Switch to Dashboard View'}
          </Button>
        </div>
        
        {/* Render selected layout with common processed data */}
        {layoutType === 'dashboard' ? (
          <DashboardLayout 
            npcs={npcs}
            locations={locations}
            quests={quests}
            chapters={chapters}
            rumors={rumors}
            activities={activities}
            loading={layoutData.loading}
          />
        ) : (
          <JournalLayout 
            npcs={npcs}
            locations={locations}
            quests={quests}
            chapters={chapters}
            rumors={rumors}
            activities={activities}
            loading={layoutData.loading}
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;