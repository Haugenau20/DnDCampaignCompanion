// components/features/dashboard/ActivityFeed.tsx
import React, { useState, useMemo } from 'react';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import { useTheme } from '../../../context/ThemeContext';
import { useNavigation } from '../../../context/NavigationContext';
import { BookOpen, User, Scroll, MessageSquare, MapPin, Clock, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { Activity } from '../../../pages/HomePage';
import Button from '../../core/Button';
import { trackContentView } from './ContinueReading';

interface ActivityFeedProps {
  activities: Activity[];
  loading: boolean;
}

/**
 * ActivityFeed component that displays recent activity across content types
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, loading }) => {
  const { theme } = useTheme();
  const { navigateToPage } = useNavigation();
  const themePrefix = theme.name;
  
  // State for filtering activities
  const [filter, setFilter] = useState<string | null>(null);
  
  // Create a map of activities grouped by type (pre-sort each group by date)
  const activityMap = useMemo(() => {
    const result: Record<string, Activity[]> = {
      'chapter': [],
      'npc': [],
      'quest': [],
      'rumor': [],
      'location': []
    };
    
    // Group by type
    activities.forEach(activity => {
      if (result[activity.type]) {
        result[activity.type].push(activity);
      }
    });
    
    // Sort each group by timestamp (newest first)
    Object.keys(result).forEach(key => {
      result[key].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
    
    return result;
  }, [activities]);
  
  // Get filtered activities based on selection
  const filteredActivities = useMemo(() => {
    if (!filter) {
      // For "All", take the 4 most recent activities overall
      return [...activities]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 4);
    } else {
      // For specific filter, take the 4 most recent of that type
      return activityMap[filter]?.slice(0, 4) || [];
    }
  }, [filter, activities, activityMap]);
    
  // Get icon based on activity type
  const getIcon = (type: string) => {
    switch (type) {
      case 'chapter':
        return <BookOpen className="w-5 h-5" />;
      case 'npc':
        return <User className="w-5 h-5" />;
      case 'quest':
        return <Scroll className="w-5 h-5" />;
      case 'rumor':
        return <MessageSquare className="w-5 h-5" />;
      case 'location':
        return <MapPin className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };
  
  // Get human-readable type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'chapter':
        return 'Story';
      case 'npc':
        return 'NPC';
      case 'quest':
        return 'Quest';
      case 'rumor':
        return 'Rumor';
      case 'location':
        return 'Location';
      default:
        return type;
    }
  };
  
  // Get time relative to now (e.g., "2 hours ago")
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 7) return date.toLocaleDateString();
    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    return 'Just now';
  };
  
  // Handle card click with tracking
  const handleCardClick = (activity: Activity) => {
    // Track this content view
    trackContentView(
      activity.id,
      activity.type,
      activity.title,
      activity.link
    );
    
    // Navigate to the content
    navigateToPage(activity.link);
  };
  
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
      
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-16 animate-pulse">
              <Card.Content className="h-full">
                <div className={clsx(
                  "w-full h-full rounded-lg",
                  `${themePrefix}-bg-secondary opacity-30`
                )}></div>
              </Card.Content>
            </Card>
          ))}
        </div>
      ) : filteredActivities.length === 0 ? (
        <Card>
          <Card.Content className="text-center py-12">
            <BookOpen className={clsx(
              "w-16 h-16 mx-auto mb-4",
              `${themePrefix}-typography-secondary`
            )} />
            <Typography variant="h3" className="mb-2">No Recent Activity</Typography>
            <Typography color="secondary">
              {filter 
                ? `No ${getTypeLabel(filter)} activity found. Try a different filter.`
                : 'Start creating content to see activity here'
              }
            </Typography>
            {filter && (
              <Button
                variant="outline"
                className="mt-4"
                startIcon={<RefreshCw size={16} />}
                onClick={() => setFilter(null)}
              >
                Show All Activity
              </Button>
            )}
          </Card.Content>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          {filteredActivities.map(activity => (
            <Card 
              key={`${activity.type}-${activity.id}`}
              hoverable
              onClick={() => handleCardClick(activity)}
              className="transition-all hover:shadow-md"
            >
              <Card.Content className="p-3">
                <div className="flex">
                  <div className={clsx(
                    "p-2 rounded-full mr-2 h-8 w-8 flex items-center justify-center",
                    `${themePrefix}-icon-bg`
                  )}>
                    {getIcon(activity.type)}
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between">
                      <Typography variant="body-sm" color="secondary" className="text-xs">
                        {getTypeLabel(activity.type)}
                      </Typography>
                      <Typography variant="body-sm" color="secondary" className="text-xs">
                        {getRelativeTime(activity.timestamp)}
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