// components/features/layouts/journal/sections/ActiveQuestsList.tsx
import React from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import { useNavigation } from '../../../../../context/NavigationContext';
import { Quest } from '../../../../../types/quest';
import { Scroll, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import SectionHeading from '../../common/components/SectionHeading';
import LoadingState from '../../common/components/LoadingState';
import EmptyState from '../../common/components/EmptyState';
import { calculateCompletionPercentage } from '../../common/utils/layoutUtils';

interface ActiveQuestsListProps {
  quests: Quest[];
  loading: boolean;
}

/**
 * Displays the active quests in a journal style list
 */
const ActiveQuestsList: React.FC<ActiveQuestsListProps> = ({ quests, loading }) => {
  const { theme } = useTheme();
  const { navigateToPage } = useNavigation();
  const themePrefix = theme.name;

  // Filter to just active quests
  const activeQuests = quests.filter(quest => quest.status === 'active');

  const handleQuestClick = (questId: string) => {
    navigateToPage(`/quests?highlight=${questId}`);
  };

  return (
    <div className={clsx("relative", `${themePrefix}-journal-section`)}>
      <SectionHeading 
        title="Active Quests" 
        count={activeQuests.length} 
        loading={loading} 
        icon={<Scroll size={18} />}
      />

      {loading ? (
        <LoadingState count={3} height="h-8" />
      ) : activeQuests.length === 0 ? (
        <EmptyState 
          icon={<Scroll size={24} />}
          message="No active quests" 
        />
      ) : (
        <ul className={clsx("space-y-2 list-none pl-0", `${themePrefix}-journal-quests-list`)}>
          {activeQuests.map(quest => {
            const completionPercentage = calculateCompletionPercentage(quest.objectives);
            
            return (
              <li 
                key={quest.id}
                onClick={() => handleQuestClick(quest.id)}
                className={clsx(
                  "pl-6 py-1 relative cursor-pointer",
                  `${themePrefix}-journal-quest-item`,
                  "border-l-2 border-primary rounded-sm"
                )}
              >
                {/* Quest bullet */}
                <span className={clsx(
                  "absolute left-2 top-1.5 w-2 h-2 rounded-full",
                  `${themePrefix}-journal-quest-bullet`
                )}></span>
                
                <div>
                  <div className="flex items-center justify-between">
                    <span className={clsx("text-sm font-medium", `${themePrefix}-journal-quest-title`)}>
                      {quest.title}
                    </span>
                    
                    {/* Show objectives completion if available */}
                    {quest.objectives && quest.objectives.length > 0 && (
                      <span className={clsx("text-xs flex items-center gap-1", `${themePrefix}-journal-quest-completion`)}>
                        <CheckCircle size={12} />
                        {completionPercentage}%
                      </span>
                    )}
                  </div>
                  
                  {/* Optional quest note */}
                  {quest.description && (
                    <p className={clsx("text-xs italic mt-0.5 line-clamp-1", `${themePrefix}-journal-quest-note`)}>
                      {quest.description}
                    </p>
                  )}
                  
                  {/* Quest location if available */}
                  {quest.location && (
                    <p className={clsx("text-xs mt-0.5", `${themePrefix}-typography-secondary`)}>
                      Location: {quest.location}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ActiveQuestsList;