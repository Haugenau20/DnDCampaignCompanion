// components/features/layouts/common/hooks/useActivityDisplay.ts
import { useMemo } from 'react';
import { Activity } from 'pages/HomePage';
import { getRelativeTime } from 'shared/utils/dateFormatter';
import { getContentTypeLabel } from '../utils/contentTypeUtils';
import { useNavigation } from 'shared/context/NavigationContext';

interface UseActivityDisplayProps {
  activities: Activity[];
  limit?: number;
  filter?: string | null;
}

/**
 * Hook for processing and displaying activity items
 */
export const useActivityDisplay = ({
  activities,
  limit = 4,
  filter = null
}: UseActivityDisplayProps) => {
  const { navigateToPage } = useNavigation();

  // Filter and sort activities
  const filteredActivities = useMemo(() => {
    let result = [...activities];
    
    // Apply type filter if provided
    if (filter) {
      result = result.filter(activity => activity.type === filter);
    }
    
    // Always sort by date (newest first)
    result = result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply limit
    return result.slice(0, limit);
  }, [activities, filter, limit]);

  // One relative format everywhere. The alternate long form ("the 3rd of
  // March") existed only for the retired alternate layout (D39).
  const formatDate = (date: Date) => getRelativeTime(date);

  // Handle item click
  const handleActivityClick = (activity: Activity) => {
    // Navigate
    navigateToPage(activity.link);
  };

  return {
    activities: filteredActivities,
    formatDate,
    handleActivityClick,
    getTypeLabel: getContentTypeLabel
  };
};