// components/features/layouts/common/hooks/useLayoutData.ts
import { recordTimes } from 'core/attribution';
import { useMemo, useState, useEffect } from 'react';
import type { Activity } from 'pages/layouts/common/types';
import type { Chapter } from 'features/storytelling';
import type { Quest } from 'features/campaign-entities';
import { Rumor } from 'features/campaign-entities';
import { NPC } from 'features/campaign-entities';
import type { Location } from 'features/campaign-entities';

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
      
      // When each was last touched: the server's time, else the old string (T132).
      const firstDate = recordTimes(firstChapter).modified?.getTime() ?? 0;
      const secondDate = recordTimes(secondChapter).modified?.getTime() ?? 0;
      
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
      
      const firstDate = recordTimes(firstRumor).created?.getTime() ?? 0;
      const secondDate = recordTimes(secondRumor).created?.getTime() ?? 0;
      
      return secondDate - firstDate;
    });
  }, [rumors]);

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
    recentActivities
  };
};

export default useLayoutData;