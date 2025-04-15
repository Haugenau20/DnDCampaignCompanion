// components/features/dashboard/ActivityFeed.tsx
import React, { useState } from 'react';
import Typography from '../../../../core/Typography';
import Card from '../../../../core/Card';
import { useTheme } from '../../../../../context/ThemeContext';
import { RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { Activity } from '../../../../../pages/HomePage';
import Button from '../../../../core/Button';
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
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, loading }) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
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
        <Typography variant="h3" className="text-lg sm:text-xl md:text-2xl mb-3 sm:mb-4">Recent Activity</Typography>
        <LoadingState type="card" count={4} />
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center gap-1 sm:gap-2 mb-3 sm:mb-4">
        <Typography variant="h3" className="text-lg sm:text-xl md:text-2xl">Recent Activity</Typography>
        
        {/* More compact filter dropdown */}
        <select 
          className={clsx(
            "text-sm rounded-md px-2 py-1 border",
            `${themePrefix}-input`,
            `border-${themePrefix}-card-border`
          )}
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
              icon={getContentIcon('chapter', 24)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          {filteredActivities.map(activity => (
            <Card 
              key={`${activity.type}-${activity.id}`}
              hoverable
              onClick={() => handleActivityClick(activity)}
              className="transition-all hover:shadow-md"
            >
              <Card.Content className="p-3">
                <div className="flex">
                  <div className={clsx(
                    "p-2 rounded-full mr-2 h-8 w-8 flex items-center justify-center",
                    `${themePrefix}-icon-bg`
                  )}>
                    {getContentIcon(activity.type, 20)}
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between">
                      <Typography variant="body-sm" color="secondary" className="text-xs">
                        {getTypeLabel(activity.type)}
                      </Typography>
                      <Typography variant="body-sm" color="secondary" className="text-xs">
                        {formatDate(activity.timestamp)}
                      </Typography>
                    </div>
                    <Typography variant="h4" className="truncate text-sm">
                      {activity.title}
                    </Typography>
                    {activity.actor && (
                      <Typography variant="body-sm" color="secondary" className="text-xs mt-1">
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