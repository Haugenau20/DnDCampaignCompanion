// components/features/layouts/common/hooks/useLayoutData.ts
import { useMemo, useState, useEffect } from 'react';
import { Activity } from '../../../../../pages/HomePage';
import { Chapter } from '../../../../../types/story';
import { Quest } from '../../../../../types/quest';
import { Rumor } from '../../../../../types/rumor';
import { NPC } from '../../../../../types/npc';
import { Location } from '../../../../../types/location';

interface UseLayoutDataProps {
  chapters: Chapter[];
  quests: Quest[];
  rumors: Rumor[];
  npcs: NPC[];
  locations: Location[];
  activities: Activity[];
  chaptersLoading: boolean;
  questsLoading: boolean;
  rumorsLoading: boolean;
  npcsLoading: boolean;
  locationsLoading: boolean;
}

/**
 * Common hook for layout data processing that can be used by any layout
 */
export const useLayoutData = ({
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
}: UseLayoutDataProps) => {
  const [loading, setLoading] = useState(true);

  // Update loading state based on all data sources
  useEffect(() => {
    const isLoading = chaptersLoading || questsLoading || 
                     rumorsLoading || npcsLoading || locationsLoading;
    setLoading(isLoading);
  }, [chaptersLoading, questsLoading, rumorsLoading, npcsLoading, locationsLoading]);

  // Get active quests
  const activeQuests = useMemo(() => {
    return quests.filter(quest => quest.status === 'active');
  }, [quests]);

  // Sort chapters by order
  const sortedChapters = useMemo(() => {
    return [...chapters].sort((firstChapter, secondChapter) => {
      if (firstChapter.order !== undefined && secondChapter.order !== undefined) {
        return firstChapter.order - secondChapter.order;
      }
      
      // Use dateModified if available, otherwise fall back to dateAdded
      const firstDateString = firstChapter.dateModified || firstChapter.dateAdded;
      const secondDateString = secondChapter.dateModified || secondChapter.dateAdded;
      
      // Convert string dates to numeric timestamps for comparison
      const firstDate = firstDateString ? new Date(firstDateString).getTime() : 0;
      const secondDate = secondDateString ? new Date(secondDateString).getTime() : 0;
      
      return firstDate - secondDate;
    });
  }, [chapters]);

  // Get latest chapter
  const latestChapter = useMemo(() => {
    return sortedChapters.length > 0 ? sortedChapters[sortedChapters.length - 1] : null;
  }, [sortedChapters]);

  // Sort rumors by verification status, then by date
  const sortedRumors = useMemo(() => {
    return [...rumors].sort((firstRumor, secondRumor) => {
      const statusPriority: Record<string, number> = {
        confirmed: 0,
        unconfirmed: 1,
        false: 2
      };
      
      const firstPriority = statusPriority[firstRumor.status] ?? 1;
      const secondPriority = statusPriority[secondRumor.status] ?? 1;
      
      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }
      
      const firstDate = firstRumor.dateAdded ? new Date(firstRumor.dateAdded).getTime() : 0;
      const secondDate = secondRumor.dateAdded ? new Date(secondRumor.dateAdded).getTime() : 0;
      
      return secondDate - firstDate;
    });
  }, [rumors]);

  // Sort locations by status
  const sortedLocations = useMemo(() => {
    return [...locations].sort((firstLocation, secondLocation) => {
      // Sort by exploration status
      if (firstLocation.status !== secondLocation.status) {
        if (firstLocation.status === 'explored') return -1;
        if (secondLocation.status === 'explored') return 1;
        if (firstLocation.status === 'visited') return -1;
        if (secondLocation.status === 'visited') return 1;
      }
      
      // Then by name
      return firstLocation.name.localeCompare(secondLocation.name);
    });
  }, [locations]);

  // Filter recent activities
  const recentActivities = useMemo(() => {
    return [...activities].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 4);
  }, [activities]);

  return {
    loading,
    activeQuests,
    sortedChapters,
    latestChapter,
    sortedRumors,
    sortedLocations,
    recentActivities
  };
};

export default useLayoutData;