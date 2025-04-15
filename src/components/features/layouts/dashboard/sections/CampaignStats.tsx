// components/features/dashboard/CampaignStats.tsx
import React from 'react';
import Typography from '../../../../core/Typography';
import Card from '../../../../core/Card';
import { useTheme } from '../../../../../context/ThemeContext';
import { useNavigation } from '../../../../../context/NavigationContext';
import { Users, Map, Scroll, BookOpen, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { NPC } from '../../../../../types/npc';
import { Location } from '../../../../../types/location';
import { Quest } from '../../../../../types/quest';
import { Chapter } from '../../../../../types/story';
import { Rumor } from '../../../../../types/rumor';

interface CampaignStatsProps {
  npcs?: NPC[];
  locations?: Location[];
  quests?: Quest[];
  chapters?: Chapter[];
  rumors?: Rumor[];
  loading?: boolean;
}

/**
 * CampaignStats component that displays statistics about the current campaign
 */
const CampaignStats: React.FC<CampaignStatsProps> = ({ 
  npcs = [], 
  locations = [], 
  quests = [], 
  chapters = [], 
  rumors = [],
  loading = false
}) => {
  const { theme } = useTheme();
  const { navigateToPage } = useNavigation();
  const themePrefix = theme.name;
  
  // Calculate quest stats - safely with default values
  const activeQuests = quests.filter(quest => quest.status === 'active').length;
  const completedQuests = quests.filter(quest => quest.status === 'completed').length;
  const totalQuests = quests.length;
  
  // Calculate quest completion percentage (avoid division by zero)
  const questCompletionPercentage = totalQuests > 0 
    ? (completedQuests / totalQuests) * 100 
    : 0;
  
  if (loading) {
    return (
      <div>
        <Typography variant="h3" className="text-lg sm:text-xl md:text-2xl mb-3 sm:mb-4">Campaign Stats</Typography>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="animate-pulse">
              <Card.Content className="h-24">
                <div className={clsx(
                  "w-full h-full rounded-lg",
                  `${themePrefix}-bg-secondary opacity-30`
                )}></div>
              </Card.Content>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <Typography variant="h3" className="text-lg sm:text-xl md:text-2xl mb-3 sm:mb-4">Campaign Stats</Typography>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {/* NPCs Stat */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/npcs')}
        >
          <Card.Content className="flex items-center p-3 sm:p-4 md:p-6">
            <div className={clsx(
              "p-2 sm:p-3 rounded-full mr-2 sm:mr-3 md:mr-4 flex items-center justify-center",
              `${themePrefix}-icon-bg`
            )}>
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1">
              <Typography variant="h4" className="sm:text-xl md:text-2xl">{npcs.length}</Typography>
              <Typography variant="body-sm" className="sm:text-base" color="secondary">NPCs</Typography>
            </div>
          </Card.Content>
        </Card>
        
        {/* Locations Stat */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/locations')}
        >
          <Card.Content className="flex items-center p-3 sm:p-4 md:p-6">
            <div className={clsx(
              "p-2 sm:p-3 rounded-full mr-2 sm:mr-3 md:mr-4 flex items-center justify-center",
              `${themePrefix}-icon-bg`
            )}>
              <Map className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1">
              <Typography variant="h4" className="sm:text-xl md:text-2xl">{locations.length}</Typography>
              <Typography variant="body-sm" className="sm:text-base" color="secondary">Locations</Typography>
            </div>
          </Card.Content>
        </Card>
        
        {/* Quests Stat */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/quests')}
        >
          <Card.Content className="flex items-center p-3 sm:p-4 md:p-6">
            <div className={clsx(
              "p-2 sm:p-3 rounded-full mr-2 sm:mr-3 md:mr-4 flex items-center justify-center",
              `${themePrefix}-icon-bg`
            )}>
              <Scroll className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1">
              <Typography variant="h4" className="sm:text-xl md:text-2xl">
                {activeQuests} / {totalQuests}
              </Typography>
              <Typography variant="body-sm" className="sm:text-base" color="secondary">Active Quests</Typography>
              
              {/* Progress bar */}
              <div className={clsx(
                "mt-3 h-2 w-full rounded-full overflow-hidden",
                `${themePrefix}-progress-container`
              )}>
                <div 
                  className={clsx(
                    "h-full rounded-full",
                    `${themePrefix}-progress-bar`
                  )}
                  style={{ width: `${questCompletionPercentage}%` }}
                ></div>
              </div>
            </div>
          </Card.Content>
        </Card>
        
        {/* Chapters Stat */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/story/chapters')}
        >
          <Card.Content className="flex items-center p-3 sm:p-4 md:p-6">
            <div className={clsx(
              "p-2 sm:p-3 rounded-full mr-2 sm:mr-3 md:mr-4 flex items-center justify-center",
              `${themePrefix}-icon-bg`
            )}>
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1">
              <Typography variant="h4" className="sm:text-xl md:text-2xl">{chapters.length}</Typography>
              <Typography variant="body-sm" className="sm:text-base" color="secondary">Story Chapters</Typography>
            </div>
          </Card.Content>
        </Card>
        
        {/* Rumors Stat */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/rumors')}
        >
          <Card.Content className="flex items-center p-3 sm:p-4 md:p-6">
            <div className={clsx(
              "p-2 sm:p-3 rounded-full mr-2 sm:mr-3 md:mr-4 flex items-center justify-center",
              `${themePrefix}-icon-bg`
            )}>
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1">
              <Typography variant="h4" className="sm:text-xl md:text-2xl">{rumors.length}</Typography>
              <Typography variant="body-sm" className="sm:text-base" color="secondary">Rumors</Typography>
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default CampaignStats;