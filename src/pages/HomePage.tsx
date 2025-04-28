// pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth, useGroups, useCampaigns } from '../context/firebase';
import { useStory } from '../context/StoryContext';
import { useQuests } from '../context/QuestContext';
import { useRumors } from '../context/RumorContext';
import { useNPCs } from '../context/NPCContext';
import { useLocations } from '../context/LocationContext';
import firebaseServices from '../services/firebase';
import { determineAttributionActor, fetchAttributionUsernames } from '../utils/attribution-utils';

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

// Helper type to check if a property exists
type WithOptionalProperty<T, K extends string> = T & { [P in K]?: string };

/**
 * HomePage component serving as the container for the selected layout
 */
const HomePage: React.FC = () => {
  // Load data from all contexts
  const { chapters, isLoading: chaptersLoading } = useStory();
  const { quests, isLoading: questsLoading } = useQuests();
  const { rumors, isLoading: rumorsLoading } = useRumors();
  const { npcs, isLoading: npcsLoading } = useNPCs();
  const { locations, isLoading: locationsLoading } = useLocations();
  const { activeGroupId } = useGroups();
  
  // Layout selection state
  const [layoutType, setLayoutType] = useState<LayoutType>('dashboard');
  
  // State to store the mapping of UIDs to usernames
  const [usernameMap, setUsernameMap] = useState<Record<string, string>>({});
  
  // Load usernames for all UIDs that need username lookup
useEffect(() => {
  const loadUsernames = async () => {
    if (!activeGroupId) return;
    
    const uniqueUids = new Set<string>();
    
    // Process items by type to collect all UIDs
    // Quests
    quests.forEach(quest => {
      if (quest.modifiedBy) uniqueUids.add(quest.modifiedBy);
      if (quest.createdBy) uniqueUids.add(quest.createdBy);
    });
    
    // NPCs
    npcs.forEach(npc => {
      if (npc.modifiedBy) uniqueUids.add(npc.modifiedBy);
      if (npc.createdBy) uniqueUids.add(npc.createdBy);
    });
    
    // Rumors
    rumors.forEach(rumor => {
      if (rumor.modifiedBy) uniqueUids.add(rumor.modifiedBy);
      if (rumor.createdBy) uniqueUids.add(rumor.createdBy);
    });
    
    // Locations
    locations.forEach(location => {
      if (location.modifiedBy) uniqueUids.add(location.modifiedBy);
      if (location.createdBy) uniqueUids.add(location.createdBy);
    });
    
    // Skip chapters as they don't have these fields
    
    // Load usernames and character names for collected UIDs
    if (uniqueUids.size === 0) return;
    
    try {
      const userMapping = await fetchAttributionUsernames(
        activeGroupId,
        Array.from(uniqueUids),
        firebaseServices
      );
      
      setUsernameMap(userMapping);
    } catch (error) {
      console.error('Error loading attribution usernames:', error);
    }
  };
  
  loadUsernames();
}, [activeGroupId, quests, rumors, npcs, locations]);
  
  /**
   * Helper function to determine the actor name with priority order
   * @param item Content item with potential actor fields
   * @returns The actor name based on priority order
   */
  const determineActor = (item: any): string => {
    return determineAttributionActor(item, usernameMap);
  };
  
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
          actor: '', // Chapters don't have actor attribution
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
          actor: determineActor(quest),
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
          actor: determineActor(rumor),
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
          actor: determineActor(npc),
          timestamp: new Date(npc.dateModified),
          link: `/npcs?highlight=${npc.id}`
        });
      }
    });
    
    // Add locations
    locations.forEach(location => {
      if ('dateModified' in location && location.dateModified) {
        allActivities.push({
          id: location.id,
          type: 'location',
          title: location.name,
          description: location.description.substring(0, 100) + '...',
          actor: determineActor(location),
          timestamp: new Date(location.dateModified),
          link: `/locations?highlight=${location.id}`
        });
      }
    });
    
    // Sort by timestamp (newest first)
    return allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [chapters, quests, rumors, npcs, locations, usernameMap]); // Added usernameMap as dependency
  
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
      <div className="container mx-auto px-2 sm:px-4 py-4 overflow-x-hidden content">
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