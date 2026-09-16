import React, { useState } from 'react';
import Typography from '../../../../core/components/Typography';
import Card from '../../../../core/components/Card';
import Button from '../../../../core/components/Button';
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

  const statusTypes = [
    { 
      icon: <Shield className="valence-0" />, 
      label: 'Alive', 
      description: 'NPC is alive' 
    },
    { 
      icon: <Skull className="valence-4" />, 
      label: 'Deceased', 
      description: 'NPC is no longer living' 
    },
    { 
      icon: <AlertCircle className="valence-3" />, 
      label: 'Missing', 
      description: 'NPC\'s whereabouts are unknown' 
    },
    { 
      icon: <HelpCircle className="valence-1" />, 
      label: 'Unknown', 
      description: 'NPC\'s status is uncertain' 
    }
  ];

  const relationshipTypes = [
    { 
      icon: <Heart className="disposition-friendly" />, 
      label: 'Friendly', 
      description: 'Ally or friend to the party' 
    },
    { 
      icon: <Shield className="disposition-neutral" />, 
      label: 'Neutral', 
      description: 'Neither friend nor foe' 
    },
    { 
      icon: <SwordIcon className="disposition-hostile" />, 
      label: 'Hostile', 
      description: 'Enemy or opponent of the party' 
    },
    { 
      icon: <HelpCircle className="disposition-unknown" />, 
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
            <Info size={20} className="typography-secondary" />
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