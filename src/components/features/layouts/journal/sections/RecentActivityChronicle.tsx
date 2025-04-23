// components/features/layouts/journal/sections/RecentActivityChronicle.tsx
import React from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import { Loader2, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
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
  const { theme } = useTheme();
  const themePrefix = theme.name;

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
    <div className={clsx("relative", `${themePrefix}-journal-section`)}>
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
              className={clsx(
                "cursor-pointer transition-transform hover:scale-[1.01]",
                `${themePrefix}-journal-activity-item`
              )}
            >
              <div className="flex items-start gap-2">
                <div className={clsx(
                  "p-1.5 rounded-full mt-0.5",
                  `${themePrefix}-journal-activity-icon-bg`
                )}>
                  {getContentIcon(activity.type, 16)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <span className={clsx(
                      "text-sm font-medium",
                      `${themePrefix}-journal-activity-title`
                    )}>
                      {activity.title}
                    </span>
                    
                    <span className={clsx(
                      "text-xs italic",
                      `${themePrefix}-journal-activity-date`
                    )}>
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                  
                  <div className={clsx(
                    "text-xs",
                    `${themePrefix}-journal-activity-type`
                  )}>
                    {getTypeLabel(activity.type)}
                  </div>
                  
                  {activity.description && (
                    <p className={clsx(
                      "text-xs mt-1 italic line-clamp-2",
                      `${themePrefix}-journal-activity-description`
                    )}>
                      "{activity.description}"
                    </p>
                  )}
                </div>
              </div>
              
              {/* Add a handwritten-style separator except for last item */}
              {index < recentActivities.length - 1 && (
                <div className={clsx(
                  "mt-3 text-center text-xs",
                  `${themePrefix}-journal-activity-separator`
                )}>
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