import React, { useState } from 'react';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Button from '../../core/Button';
import { useTheme } from '../../../context/ThemeContext';
import clsx from 'clsx';
import {
  Shield,
  Skull,
  AlertCircle,
  HelpCircle,
  Heart,
  SwordIcon,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

const NPCLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useTheme();
  const themePrefix = theme.name;

  const statusTypes = [
    { 
      icon: <Shield className={clsx(`${themePrefix}-npc-status-alive`)} />, 
      label: 'Alive', 
      description: 'NPC is alive' 
    },
    { 
      icon: <Skull className={clsx(`${themePrefix}-npc-status-deceased`)} />, 
      label: 'Deceased', 
      description: 'NPC is no longer living' 
    },
    { 
      icon: <AlertCircle className={clsx(`${themePrefix}-npc-status-missing`)} />, 
      label: 'Missing', 
      description: 'NPC\'s whereabouts are unknown' 
    },
    { 
      icon: <HelpCircle className={clsx(`${themePrefix}-npc-status-unknown`)} />, 
      label: 'Unknown', 
      description: 'NPC\'s status is uncertain' 
    }
  ];

  const relationshipTypes = [
    { 
      icon: <Heart className={clsx(`${themePrefix}-npc-relationship-friendly`)} />, 
      label: 'Friendly', 
      description: 'Ally or friend to the party' 
    },
    { 
      icon: <Shield className={clsx(`${themePrefix}-npc-relationship-neutral`)} />, 
      label: 'Neutral', 
      description: 'Neither friend nor foe' 
    },
    { 
      icon: <SwordIcon className={clsx(`${themePrefix}-npc-relationship-hostile`)} />, 
      label: 'Hostile', 
      description: 'Enemy or opponent of the party' 
    },
    { 
      icon: <HelpCircle className={clsx(`${themePrefix}-npc-relationship-unknown`)} />, 
      label: 'Unknown', 
      description: 'Relationship not yet determined' 
    }
  ];

  return (
    <Card>
      <Card.Content>
        <Button
          variant="ghost"
          className="w-full flex justify-between items-center"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Info size={20} className={clsx(`${themePrefix}-status-general`)} />
            <Typography variant="h4">Legend</Typography>
          </div>
          {isExpanded ? <ChevronUp /> : <ChevronDown />}
        </Button>

        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px] mt-4' : 'max-h-0'}`}>
          <div className="space-y-6">
            {/* Status Types */}
            <div>
              <Typography variant="h4" className="mb-3">NPC Status Types</Typography>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statusTypes.map(({ icon, label, description }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="mt-1">{icon}</div>
                    <div>
                      <Typography variant="body" className="font-medium">
                        {label}
                      </Typography>
                      <Typography variant="body-sm" color="secondary">
                        {description}
                      </Typography>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Relationship Types */}
            <div>
              <Typography variant="h4" className="mb-3">Relationship Types</Typography>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relationshipTypes.map(({ icon, label, description }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="mt-1">{icon}</div>
                    <div>
                      <Typography variant="body" className="font-medium">
                        {label}
                      </Typography>
                      <Typography variant="body-sm" color="secondary">
                        {description}
                      </Typography>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

export default NPCLegend;