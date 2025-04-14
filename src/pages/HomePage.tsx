/**
 * HomePage.tsx
 * 
 * This file serves as the container component for different layout views.
 * 
 * ===== LAYOUT EXTENSION GUIDE =====
 * 
 * To add a new layout type to the application:
 * 
 * 1. CREATE THE LAYOUT COMPONENT
 *    - Create a new file in src/components/features/layouts/ (e.g., NewLayout.tsx)
 *    - Import the LayoutProps interface from DashboardLayout
 *    - Implement your component using the same props interface:
 * 
 *      ```
 *      import React from 'react';
 *      import { LayoutProps } from './DashboardLayout';
 *      
 *      const NewLayout: React.FC<LayoutProps> = ({
 *        npcs, locations, quests, chapters, rumors, activities, loading
 *      }) => {
 *        // Your layout implementation
 *        return (
 *          // JSX for your layout
 *        );
 *      };
 *      
 *      export default NewLayout;
 *      ```
 * 
 * 2. ADD LAYOUT SELECTION LOGIC
 *    - Import your new layout in HomePage.tsx
 *    - Add a state variable to track the selected layout:
 * 
 *      ```
 *      // Add this with your other state variables
 *      const [layoutType, setLayoutType] = useState<'dashboard' | 'newLayout'>('dashboard');
 *      ```
 * 
 *    - Update the return statement to conditionally render the appropriate layout:
 * 
 *      ```
 *      return (
 *        <div className={...}>
 *          {layoutType === 'dashboard' && <DashboardLayout {...layoutProps} />}
 *          {layoutType === 'newLayout' && <NewLayout {...layoutProps} />}
 *        </div>
 *      );
 *      ```
 * 
 * 3. (OPTIONAL) ADD LAYOUT SWITCHING UI
 *    - Create a component to let users select their preferred layout
 *    - Call setLayoutType when a user makes a selection
 * 
 * 4. (OPTIONAL) PERSIST USER PREFERENCE
 *    - Store the user's layout preference in their profile
 *    - Initialize the layoutType state from the user's saved preference:
 * 
 *      ```
 *      useEffect(() => {
 *        if (activeGroupUserProfile?.preferences?.homeLayout) {
 *          setLayoutType(activeGroupUserProfile.preferences.homeLayout);
 *        }
 *      }, [activeGroupUserProfile]);
 *      ```
 * 
 * This architecture follows the Open-Closed Principle: open for extension 
 * (adding new layouts) but closed for modification (existing code doesn't change).
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, useGroups, useCampaigns } from '../context/firebase';
import { useStory } from '../context/StoryContext';
import { useQuests } from '../context/QuestContext';
import { useRumors } from '../context/RumorContext';
import { useNPCs } from '../context/NPCContext';
import { useLocations } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';
import clsx from 'clsx';

// Import current layout
import DashboardLayout, { LayoutProps } from '../components/features/layouts/DashboardLayout';

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
  
  // Recent activity state
  const [loading, setLoading] = useState(true);
  
  // Update loading state based on all data sources
  useEffect(() => {
    const isLoading = chaptersLoading || questsLoading || rumorsLoading || npcsLoading || locationsLoading;
    setLoading(isLoading);
  }, [chaptersLoading, questsLoading, rumorsLoading, npcsLoading, locationsLoading]);

  // Create combined recent activity from all content types
  const activities = useMemo(() => {
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
  
  // Create props for layout components
  const layoutProps: LayoutProps = {
    npcs,
    locations,
    quests,
    chapters,
    rumors,
    activities,
    loading
  };
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className={clsx("container mx-auto px-2 sm:px-4 py-4 overflow-x-hidden", `${themePrefix}-content`)}>
        {/* Currently only rendering the dashboard layout */}
        <DashboardLayout {...layoutProps} />
      </div>
    </div>
  );
};

export default HomePage;