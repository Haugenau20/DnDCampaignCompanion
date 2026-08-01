// pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { useGroups } from 'features/user-management';
import { useStory } from 'features/storytelling';
import { useQuests } from 'features/campaign-entities';
import { useRumors } from 'features/campaign-entities';
import { useNPCs } from 'features/campaign-entities';
import { useLocations } from 'features/campaign-entities';
import firebaseServices from 'core/services/firebase';
import { determineAttributionActor, fetchAttributionUsernames } from 'shared/utils/attribution-utils';

// Import layouts
import DashboardLayout from 'pages/layouts/dashboard/DashboardLayout';
import JournalLayout from 'pages/layouts/journal/JournalLayout';
import { Book, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';
import useLayoutData from 'pages/layouts/common/hooks/useLayoutData';

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
    
    // Story Chapters
    chapters.forEach(chapter => {
      if (chapter.modifiedBy) uniqueUids.add(chapter.modifiedBy);
      if (chapter.createdBy) uniqueUids.add(chapter.createdBy);
    });
    
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
}, [activeGroupId, quests, rumors, npcs, locations, chapters]);
  
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
      if (chapter.dateModified || chapter.dateAdded) {
        allActivities.push({
          id: chapter.id,
          type: 'chapter',
          title: chapter.title,
          description: chapter.summary || chapter.content.substring(0, 100) + '...',
          actor: determineActor(chapter),
          timestamp: new Date(chapter.dateModified || chapter.dateAdded),
          link: `/story/chapters/${chapter.id}`
        });
      }
    });
    
    // Add quests
    quests.forEach(quest => {
      if (quest.dateModified || quest.dateAdded) {
        allActivities.push({
          id: quest.id,
          type: 'quest',
          title: quest.title,
          description: quest.description,
          actor: determineActor(quest),
          timestamp: new Date(quest.dateModified || quest.dateAdded),
          link: `/quests?highlight=${quest.id}`
        });
      }
    });

    // Add rumors
    rumors.forEach(rumor => {
      if (rumor.dateModified || rumor.dateAdded) {
        allActivities.push({
          id: rumor.id,
          type: 'rumor',
          title: rumor.title,
          description: rumor.content.substring(0, 100) + '...',
          actor: determineActor(rumor),
          timestamp: new Date(rumor.dateModified || rumor.dateAdded),
          link: `/rumors?highlight=${rumor.id}`
        });
      }
    });

    // Add NPCs
    npcs.forEach(npc => {
      if (npc.dateModified || npc.dateAdded) {
        allActivities.push({
          id: npc.id,
          type: 'npc',
          title: npc.name,
          description: npc.description.substring(0, 100) + '...',
          actor: determineActor(npc),
          timestamp: new Date(npc.dateModified || npc.dateAdded),
          link: `/npcs?highlight=${npc.id}`
        });
      }
    });

    // Add locations
    locations.forEach(location => {
      if ('dateModified' in location && (location.dateModified || location.dateAdded)) {
        allActivities.push({
          id: location.id,
          type: 'location',
          title: location.name,
          description: location.description.substring(0, 100) + '...',
          actor: determineActor(location),
          timestamp: new Date(location.dateModified || location.dateAdded),
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
  
  /**
   * Dashboard/Journal switch as a segmented control: it shows both destinations and
   * marks which one is current, where the previous "Switch to Journal View" button
   * named only the place you weren't. Passed into the layout so it can sit in the
   * page header rather than on a navigation row of its own.
   */
  const viewToggle = (
    <div
      className="inline-flex p-0.5 rounded-lg bg-secondary"
      role="group"
      aria-label="Choose a view"
    >
      {([
        { type: 'dashboard' as LayoutType, label: 'Dashboard', Icon: LayoutDashboard },
        { type: 'journal' as LayoutType, label: 'Journal', Icon: Book },
      ]).map(({ type, label, Icon }) => {
        const isActive = layoutType === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => setLayoutType(type)}
            aria-pressed={isActive}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-card font-semibold shadow-sm'
                : 'typography-secondary selectable-item'
            )}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className='max-w-7xl mx-auto'>
      <div className="container mx-auto px-2 sm:px-4 py-4 overflow-x-hidden content">
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
            viewToggle={viewToggle}
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
            viewToggle={viewToggle}
          />
        )}
      </div>
    </div>
  );
};

export default HomePage;