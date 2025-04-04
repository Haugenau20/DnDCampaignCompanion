// components/features/dashboard/ActivityFeed.tsx
import React, { useState } from 'react';
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
  
  // Get filtered activities
  const filteredActivities = filter 
    ? activities.filter(a => a.type === filter)
    : activities;
    
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <Typography variant="h3">Recent Activity</Typography>
        
        {/* Activity type filters */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilter(null)}
            className={clsx(
              "px-3 py-1 rounded-full text-sm",
              filter === null 
                ? `${themePrefix}-button-primary` 
                : `${themePrefix}-bg-secondary`
            )}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('chapter')}
            className={clsx(
              "px-3 py-1 rounded-full text-sm",
              filter === 'chapter' 
                ? `${themePrefix}-button-primary` 
                : `${themePrefix}-bg-secondary`
            )}
          >
            Story
          </button>
          <button 
            onClick={() => setFilter('npc')}
            className={clsx(
              "px-3 py-1 rounded-full text-sm",
              filter === 'npc' 
                ? `${themePrefix}-button-primary` 
                : `${themePrefix}-bg-secondary`
            )}
          >
            NPCs
          </button>
          <button 
            onClick={() => setFilter('quest')}
            className={clsx(
              "px-3 py-1 rounded-full text-sm",
              filter === 'quest' 
                ? `${themePrefix}-button-primary` 
                : `${themePrefix}-bg-secondary`
            )}
          >
            Quests
          </button>
          <button 
            onClick={() => setFilter('location')}
            className={clsx(
              "px-3 py-1 rounded-full text-sm",
              filter === 'location' 
                ? `${themePrefix}-button-primary` 
                : `${themePrefix}-bg-secondary`
            )}
          >
            Locations
          </button>
          <button 
            onClick={() => setFilter('rumor')}
            className={clsx(
              "px-3 py-1 rounded-full text-sm",
              filter === 'rumor' 
                ? `${themePrefix}-button-primary` 
                : `${themePrefix}-bg-secondary`
            )}
          >
            Rumors
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-32 animate-pulse">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filteredActivities.map(activity => (
            <Card 
              key={`${activity.type}-${activity.id}`}
              hoverable
              onClick={() => handleCardClick(activity)}
              className="transition-all hover:shadow-md"
            >
              <Card.Content className="h-full">
                <div className="flex h-full">
                  <div className={clsx(
                    "p-2 rounded-full mr-3 h-10 w-10 flex items-center justify-center",
                    `${themePrefix}-icon-bg`
                  )}>
                    {getIcon(activity.type)}
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div>
                      <div className="flex items-center">
                        <Typography variant="body-sm" color="secondary" className="mb-1">
                          {getTypeLabel(activity.type)}
                        </Typography>
                      </div>
                      <Typography variant="h4" className="truncate mb-1">
                        {activity.title}
                      </Typography>
                    </div>
                    {activity.description && (
                      <Typography color="secondary" className="line-clamp-2 text-sm mb-2 flex-grow">
                        {activity.description}
                      </Typography>
                    )}
                    <div className="flex justify-between items-center mt-auto text-sm">
                      <Typography variant="body-sm" color="secondary">
                        {activity.actor || 'Unknown'}
                      </Typography>
                      <Typography variant="body-sm" color="secondary">
                        {getRelativeTime(activity.timestamp)}
                      </Typography>
                    </div>
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