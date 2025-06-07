// components/features/layouts/journal/sections/RecentActivityChronicle.tsx
import React from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { Activity } from '../../../../../pages/HomePage';
import { useActivityDisplay } from '../../common/hooks/useActivityDisplay';
import { getContentIcon } from '../../common/utils/contentTypeUtils';
import EmptyState from '../../common/components/EmptyState';
import SectionHeading from '../../common/components/SectionHeading';

interface RecentActivityChronicleProps {
  activities: Activity[];
  loading: boolean;
}

/**
 * Displays recent activity in a journal-style chronicle
 */
const RecentActivityChronicle: React.FC<RecentActivityChronicleProps> = ({ activities, loading }) => {

  // Use the activity display hook with journal styling
  const { 
    activities: recentActivities, 
    formatDate,
    handleActivityClick,
    getTypeLabel
  } = useActivityDisplay({ 
    activities, 
    limit: 4,
    journalStyle: true
  });

  return (
    <div className="relative journal-section">
      <SectionHeading 
        title="Recent Events" 
        loading={loading}
      />

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <Loader2 className="w-6 h-6 mx-auto animate-spin" />
        </div>
      ) : recentActivities.length === 0 ? (
        <EmptyState 
          icon={<MessageSquare className="w-8 h-8" />} // Add the missing icon prop
          message="No recent events recorded"
        />
      ) : (
        <div className="space-y-4">
          {recentActivities.map((activity, index) => (
            <div 
              key={`${activity.type}-${activity.id}`}
              onClick={() => handleActivityClick(activity)}
              className="cursor-pointer transition-transform hover:scale-[1.01] journal-activity-item"
            >
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-full mt-0.5 journal-activity-icon-bg">
                  {getContentIcon(activity.type, 16)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium journal-activity-title">
                      {activity.title}
                    </span>
                    
                    <span className="text-xs italic journal-activity-date">
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                  
                  <div className="text-xs journal-activity-type">
                    {getTypeLabel(activity.type)}
                  </div>
                  
                  {activity.description && (
                    <p className="text-xs mt-1 italic line-clamp-2 journal-activity-description">
                      "{activity.description}"
                    </p>
                  )}
                </div>
              </div>
              
              {/* Add a handwritten-style separator except for last item */}
              {index < recentActivities.length - 1 && (
                <div className="mt-3 text-center text-xs journal-activity-separator">
                  ✧ ✦ ✧
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivityChronicle;