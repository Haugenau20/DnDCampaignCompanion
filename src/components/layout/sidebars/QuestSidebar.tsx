import React, { useMemo } from 'react';
import { useQuests } from '../../../context/QuestContext';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Button from '../../core/Button';
import { MapPin, ChevronRight, AlertCircle } from 'lucide-react';
import { useNavigation } from '../../../context/NavigationContext';
import { useTheme } from '../../../context/ThemeContext';
import clsx from 'clsx';

const QuestSidebar = () => {
  const { quests, hasRequiredContext } = useQuests();
  const { navigateToPage, createPath } = useNavigation();
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Group quests by location
  const questsByLocation = useMemo(() => {
    return quests.reduce((acc, quest) => {
      if (quest.location) {
        if (!acc[quest.location]) {
          acc[quest.location] = [];
        }
        acc[quest.location].push(quest);
      }
      return acc;
    }, {} as Record<string, typeof quests>);
  }, [quests]);

  // If missing context, show a notice
  if (!hasRequiredContext) {
    return (
      <div className="p-4">
        <Card>
          <Card.Content className="p-4 text-center">
            <AlertCircle className={clsx("w-8 h-8 mx-auto mb-2", `${themePrefix}-typography-secondary`)} />
            <Typography variant="body-sm" color="secondary">
              Select a group and campaign to view quests
            </Typography>
          </Card.Content>
        </Card>
      </div>
    );
  }

  // If no quests, show a message
  if (quests.length === 0) {
    return (
      <div className="p-4">
        <Card>
          <Card.Content className="space-y-4">
            <Typography variant="h4" className="flex items-center gap-2">
              <MapPin className={clsx("w-5 h-5", `${themePrefix}-primary`)} />
              Quests by Location
            </Typography>
            <Typography color="secondary" variant="body-sm">
              No quests available yet
            </Typography>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Quests by Location */}
      <Card>
        <Card.Content className="space-y-4">
          <Typography variant="h4" className="flex items-center gap-2">
            <MapPin className={clsx("w-5 h-5", `${themePrefix}-primary`)} />
            Quests by Location
          </Typography>

          <div className="space-y-4">
            {Object.entries(questsByLocation).map(([location, locationQuests]) => (
              <div key={location} className="space-y-1">
                <Typography variant="body" color="secondary" className="font-medium">
                  {location}
                </Typography>
                {locationQuests.map(quest => (
                  <Button
                    key={quest.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateToPage(createPath('/quests', {}, { highlight: quest.id}))}
                    className="w-full pl-4"
                    centered={false}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <ChevronRight className={clsx("w-4 h-4 flex-shrink-0", `${themePrefix}-typography-secondary`)} />
                      <Typography 
                        variant="body-sm" 
                        className="truncate max-w-[140px]"
                        title={quest.title} // Shows full title on hover
                      >
                        {quest.title}
                      </Typography>
                    </div>
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default QuestSidebar;