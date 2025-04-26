// components/features/dashboard/ActivityFeed.tsx
import React, { useState } from 'react';
import Typography from '../../../../core/Typography';
import Card from '../../../../core/Card';
import { Activity } from '../../../../../pages/HomePage';
import { useActivityDisplay } from '../../../layouts/common/hooks/useActivityDisplay';
import { getContentIcon } from '../../../layouts/common/utils/contentTypeUtils';
import LoadingState from '../../../layouts/common/components/LoadingState';
import EmptyState from '../../../layouts/common/components/EmptyState';

interface ActivityFeedProps {
  activities: Activity[];
  loading: boolean;
}

/**
 * ActivityFeed component that displays recent activity across content types
 * Combines larger content size with fixed one-line header
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, loading }) => {
  
  // State for filtering activities
  const [filter, setFilter] = useState<string | null>(null);
  
  // Use the activity display hook
  const { 
    activities: filteredActivities, 
    formatDate,
    handleActivityClick,
    getTypeLabel
  } = useActivityDisplay({ 
    activities, 
    filter, 
    limit: 4,
    journalStyle: false
  });
  
  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-3 sm:mb-4 flex-nowrap">
          <Typography variant="h3" className="text-lg sm:text-xl md:text-2xl whitespace-nowrap">Recent Activity</Typography>
        </div>
        <LoadingState type="card" count={4} height="h-20" />
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center gap-2 mb-3 sm:mb-4 flex-nowrap">
        <Typography variant="h3" className="text-lg sm:text-xl md:text-2xl whitespace-nowrap">Recent Activity</Typography>
        
        <select 
          className="text-sm rounded-md px-2 py-1 border min-w-fit input card"
          value={filter || 'all'}
          onChange={(e) => setFilter(e.target.value === 'all' ? null : e.target.value)}
        >
          <option value="all">All</option>
          <option value="chapter">Story</option>
          <option value="npc">NPCs</option>
          <option value="quest">Quests</option>
          <option value="location">Locations</option>
          <option value="rumor">Rumors</option>
        </select>
      </div>
      
      {filteredActivities.length === 0 ? (
        <Card>
          <Card.Content className="text-center py-12">
            <EmptyState 
              icon={getContentIcon('chapter', 28)}
              title="No Recent Activity"
              message={filter 
                ? `No ${getTypeLabel(filter)} activity found. Try a different filter.`
                : 'Start creating content to see activity here'
              }
              actionLabel={filter ? "Show All Activity" : undefined}
              onAction={filter ? () => setFilter(null) : undefined}
            />
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredActivities.map(activity => (
            <Card 
              key={`${activity.type}-${activity.id}`}
              hoverable
              onClick={() => handleActivityClick(activity)}
              className="transition-all hover:shadow-md transform hover:scale-102"
            >
              <Card.Content className="p-4">
                <div className="flex items-center">
                  <div className="p-3 rounded-full mr-4 h-12 w-12 flex items-center justify-center icon-bg">
                    {getContentIcon(activity.type, 24)}
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between">
                      <Typography variant="body-sm" color="secondary" className="text-sm">
                        {getTypeLabel(activity.type)}
                      </Typography>
                      <Typography variant="body-sm" color="secondary" className="text-sm whitespace-nowrap ml-2">
                        {formatDate(activity.timestamp)}
                      </Typography>
                    </div>
                    <Typography variant="h4" className="truncate text-base sm:text-lg font-medium">
                      {activity.title}
                    </Typography>
                    {activity.actor && (
                      <Typography variant="body-sm" color="secondary" className="text-sm mt-0.5">
                        By: {activity.actor}
                      </Typography>
                    )}
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;