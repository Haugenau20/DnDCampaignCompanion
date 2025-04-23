// components/features/dashboard/CampaignStats.tsx
import React from 'react';
import Typography from '../../../../core/Typography';
import Card from '../../../../core/Card';
import { useTheme } from '../../../../../context/ThemeContext';
import { useNavigation } from '../../../../../context/NavigationContext';
import { Users, Map, Scroll, BookOpen, MessageSquare, List } from 'lucide-react';
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
 * With quest information split across three separate cards and a clean progress bar
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <Card.Content className="h-28">
                <div className={clsx(
                  "w-full h-full rounded-lg",
                  `${themePrefix}-journal-loading`
                )}></div>
              </Card.Content>
            </Card>
          ))}
          <Card className="animate-pulse sm:col-span-2">
            <Card.Content className="h-20">
              <div className={clsx(
                "w-full h-full rounded-lg",
                `${themePrefix}-journal-loading`
              )}></div>
            </Card.Content>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <Typography variant="h3" className="text-lg sm:text-xl md:text-2xl mb-3 sm:mb-4">Campaign Stats</Typography>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* NPCs Stat */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/npcs')}
          className="transform transition-transform hover:scale-102"
        >
            <Card.Content className="flex flex-col items-center text-center p-4">
              <div className={clsx(
                "p-2 rounded-full mb-1 flex items-center justify-center",
                `${themePrefix}-icon-bg`
              )}>
                <Users className="w-5 h-5" />
              </div>
              <Typography variant="h4" className="text-xl sm:text-2xl">{npcs.length}</Typography>
              <Typography variant="body-sm" className="text-sm" color="secondary">NPCs</Typography>
            </Card.Content>
        </Card>
        
        {/* Locations Stat */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/locations')}
          className="transform transition-transform hover:scale-102"
        >
          <Card.Content className="flex flex-col items-center text-center p-4">
            <div className={clsx(
              "p-2 rounded-full mb-1 flex items-center justify-center",
              `${themePrefix}-icon-bg`
            )}>
              <Map className="w-5 h-5" />
            </div>
            <Typography variant="h4" className="text-xl sm:text-2xl">{locations.length}</Typography>
            <Typography variant="body-sm" className="text-sm" color="secondary">Locations</Typography>
          </Card.Content>
        </Card>
        
        {/* Chapters Stat */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/story/chapters')}
          className="transform transition-transform hover:scale-102"
        >
          <Card.Content className="flex flex-col items-center text-center p-4">
            <div className={clsx(
              "p-2 rounded-full mb-1 flex items-center justify-center",
              `${themePrefix}-icon-bg`
            )}>
              <BookOpen className="w-5 h-5" />
            </div>
            <Typography variant="h4" className="text-xl sm:text-2xl">{chapters.length}</Typography>
            <Typography variant="body-sm" className="text-sm" color="secondary">Story Chapters</Typography>
          </Card.Content>
        </Card>
        
        {/* Rumors Stat */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/rumors')}
          className="transform transition-transform hover:scale-102"
        >
          <Card.Content className="flex flex-col items-center text-center p-4">
            <div className={clsx(
              "p-2 rounded-full mb-1 flex items-center justify-center",
              `${themePrefix}-icon-bg`
            )}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <Typography variant="h4" className="text-xl sm:text-2xl">{rumors.length}</Typography>
            <Typography variant="body-sm" className="text-sm" color="secondary">Rumors</Typography>
          </Card.Content>
        </Card>
        
        {/* Active Quests Stat */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/quests')}
          className="transform transition-transform hover:scale-102"
        >
          <Card.Content className="flex flex-col items-center text-center p-4">
            <div className={clsx(
              "p-2 rounded-full mb-1 flex items-center justify-center",
              `${themePrefix}-icon-bg`
            )}>
              <Scroll className="w-5 h-5" />
            </div>
            <Typography variant="h4" className="text-xl sm:text-2xl">{activeQuests}</Typography>
            <Typography variant="body-sm" className="text-sm" color="secondary">Active Quests</Typography>
          </Card.Content>
        </Card>
        
        {/* Total Quests Stat */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/quests')}
          className="transform transition-transform hover:scale-102"
        >
          <Card.Content className="flex flex-col items-center text-center p-4">
            <div className={clsx(
              "p-2 rounded-full mb-1 flex items-center justify-center",
              `${themePrefix}-icon-bg`
            )}>
              <List className="w-5 h-5" />
            </div>
            <Typography variant="h4" className="text-xl sm:text-2xl">{totalQuests}</Typography>
            <Typography variant="body-sm" className="text-sm" color="secondary">Total Quests</Typography>
          </Card.Content>
        </Card>
        
        {/* Quest Progress Bar - Spans full width */}
        <Card 
          hoverable
          onClick={() => navigateToPage('/quests')}
          className="sm:col-span-2 transform transition-transform hover:scale-102"
        >
          <Card.Content className="p-4 flex items-center justify-center">
            <div className="flex flex-col items-center text-center w-full max-w-md">
              <Typography variant="h4" className="mb-3">
                Quest Completion
              </Typography>
              
              {/* Progress bar without text inside */}
              <div className="w-full">
                <div className={clsx(
                  "h-5 w-full rounded-full overflow-hidden",
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
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default CampaignStats;