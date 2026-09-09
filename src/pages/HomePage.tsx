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
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';
import SignedOutHome from 'pages/home/SignedOutHome';

// Import layouts
import DashboardLayout from 'pages/layouts/dashboard/DashboardLayout';
import useLayoutData from 'pages/layouts/common/hooks/useLayoutData';
import CampaignBanner from 'pages/layouts/dashboard/sections/CampaignBanner';

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
 * HomePage component serving as the container for the dashboard layout.
 */
const HomePage: React.FC = () => {
  // Load data from all contexts
  const { chapters, isLoading: chaptersLoading } = useStory();
  const { quests, isLoading: questsLoading } = useQuests();
  const { rumors, isLoading: rumorsLoading } = useRumors();
  const { npcs, isLoading: npcsLoading } = useNPCs();
  const { locations, isLoading: locationsLoading } = useLocations();
  const { activeGroupId } = useGroups();
  
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
  
  const gate = usePageGate('home', { loading: layoutData.loading });

  // Home is the one page allowed an example, and it is a different layout from
  // the shared panel -- the h1 there is the product's headline, not a page
  // title. See the spec, §5.
  if (gate.state === 'signed-out') {
    return <SignedOutHome />;
  }

  // CampaignBanner supplies the page's h1 in the ready state. PageShell
  // supplies it here, where no banner renders -- which is exactly where "you
  // can still see where you are" matters. Using both would put two h1s on one
  // page.
  if (gate.state !== 'ready') {
    return (
      <PageShell title="Campaign Home">
        <GatedContent gate={gate}>{null}</GatedContent>
      </PageShell>
    );
  }

  return (
    <>
      {/* The hero band sits outside the page column on purpose. It bleeds to the
          viewport edges, and the column below sets `overflow-x-hidden`, which
          clips anything wider than itself -- the band's layout box was already
          full width, but its paint was cut back, so it rendered as a floating
          card with the page showing either side. Nothing inside a clipping
          ancestor can bleed past it. */}
      <CampaignBanner chapterCount={chapters.length} />

    <div className='max-w-7xl mx-auto'>
      <div className="container mx-auto px-2 sm:px-4 py-4 overflow-x-hidden content">
        <DashboardLayout
          npcs={npcs}
          locations={locations}
          quests={quests}
          chapters={chapters}
          rumors={rumors}
          activities={activities}
          loading={layoutData.loading}
        />
      </div>
    </div>
    </>
  );
};

export default HomePage;