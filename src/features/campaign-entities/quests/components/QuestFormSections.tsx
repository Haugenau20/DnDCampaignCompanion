// src/features/campaign-entities/quests/components/QuestFormSections.tsx
import { NPC } from '../../npcs/types';
import React from 'react';
import { Quest, QuestStatus } from '../types';
import Typography from '../../../../core/components/Typography';
import { RemovableChip } from '../../../../core/components/Chip';
import AttachTray from 'shared/components/attach-tray/AttachTray';
import { useAttachSet } from 'shared/components/attach-tray/useAttachTray';
import { useLocations } from '../../locations/context/LocationContext';
import Input from '../../../../core/components/Input';
import Select from '../../../../core/components/Select';
import Button from '../../../../core/components/Button';
import clsx from 'clsx';
import { PlusCircle, X, Target } from 'lucide-react';

interface SectionProps {
  formData: Partial<Quest>;
  handleInputChange: (field: keyof Quest, value: any) => void;
}

interface RelatedNPCsSectionProps extends SectionProps {
  /**
   * Still accepted, still ignored: the tray reads the collection from the
   * provider that already owns it (T023 -- no new loader). Kept so the quest
   * forms need no change beyond deleting their dialog state.
   */
  npcs?: NPC[];
  selectedNPCs: Set<string>;
  setSelectedNPCs: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

export const RelatedNPCsSection: React.FC<RelatedNPCsSectionProps> = ({
  npcs = [],
  selectedNPCs,
  setSelectedNPCs,
}) => {
  const sources = React.useMemo(() => ({ npc: npcs }), [npcs]);
  const { attachedIds, onAttach, onDetach } = useAttachSet(
    selectedNPCs,
    setSelectedNPCs as (updater: (previous: Set<string>) => Set<string>) => void
  );

  return (
    <div className="space-y-4">
      <Typography variant="h4">Related NPCs</Typography>
      <AttachTray
        kinds={["npc"]}
        sources={sources}
        attachedIds={attachedIds}
        onAttach={onAttach}
        onDetach={onDetach}
        ariaLabel="Related NPCs"
      />
    </div>
  );
};

/** A quest's location: one relation, so the tray replaces rather than adds. */
const QuestLocationTray: React.FC<{
  locationId: string;
  onChange: (id: string, name: string) => void;
}> = ({ locationId, onChange }) => {
  const { locations } = useLocations();
  const sources = React.useMemo(() => ({ location: locations }), [locations]);
  const attachedIds = React.useMemo(() => (locationId ? [locationId] : []), [locationId]);

  return (
    <AttachTray
      kinds={["location"]}
      sources={sources}
      attachedIds={attachedIds}
      single
      ariaLabel="Where it happens"
      onAttach={(id) => {
        const found = (sources.location ?? []).find((l: any) => l.id === id);
        onChange(id, found?.name ?? '');
      }}
      onDetach={() => onChange('', '')}
    />
  );
};

export const BasicInfoSection: React.FC<SectionProps> = ({ formData, handleInputChange }) => {

  return (
    <div className="space-y-4">
      <Typography variant="h4">Basic Information</Typography>
      <Input
        label="Title *"
        value={formData.title || ''}
        onChange={(e) => handleInputChange('title', e.target.value)}
        required
      />
      
      <Input
        label="Description *"
        value={formData.description || ''}
        onChange={(e) => handleInputChange('description', e.target.value)}
        isTextArea
        required
      />

      <div className="space-y-4">
        <Select
          label="Status *"
          value={formData.status}
          onChange={(e) => handleInputChange('status', e.target.value as QuestStatus)}
          required
        >
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </Select>

        <div className="space-y-2">
          <Typography variant="body-sm" className="form-label">Where it happens</Typography>
          <QuestLocationTray
            locationId={formData.locationId || ''}
            onChange={(id, name) => {
              handleInputChange('locationId', id);
              // `location` stays the human-readable convenience the
              // `location`/`locationId` contract describes; `locationId` is
              // the one that is authoritative.
              handleInputChange('location', name);
            }}
          />
        </div>
      </div>

      <Input
        label="Level Range"
        value={formData.levelRange || ''}
        onChange={(e) => handleInputChange('levelRange', e.target.value)}
        placeholder="e.g., 1-5"
        startIcon={<Target className={`w-4 h-4 typography-secondary`} />}
      />

      <Input
        label="Background"
        value={formData.background || ''}
        onChange={(e) => handleInputChange('background', e.target.value)}
        isTextArea
      />
    </div>
  );
};

export const ObjectivesSection: React.FC<SectionProps> = ({ formData, handleInputChange }) => {

  const handleAddObjective = () => {
    handleInputChange('objectives', [
      ...(formData.objectives || []),
      { id: crypto.randomUUID(), description: '', completed: false }
    ]);
  };

  const handleRemoveObjective = (id: string) => {
    handleInputChange(
      'objectives',
      formData.objectives?.filter(obj => obj.id !== id) || []
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={handleAddObjective}
          aria-label="Add an objective"
          startIcon={<PlusCircle />}
        ></Button>
        <Typography variant="h4">Objectives</Typography>
      </div>
      <div className="space-y-2">
        {formData.objectives?.map((objective, index) => (
          <div key={objective.id} className="flex gap-4">
            <input
              type="checkbox"
              aria-label={`Mark objective ${index + 1} complete`}
              checked={objective.completed}
              onChange={(e) => {
                const newObjectives = formData.objectives?.map(obj =>
                  obj.id === objective.id
                    ? { ...obj, completed: e.target.checked }
                    : obj
                );
                handleInputChange('objectives', newObjectives || []);
              }}
              className={`mt-2 flex-shrink-0 input`}
            />
            <div className="flex-1">
              <Input
                aria-label={`Objective ${index + 1}`}
                value={objective.description}
                onChange={(e) => {
                  const newObjectives = formData.objectives?.map(obj =>
                    obj.id === objective.id
                      ? { ...obj, description: e.target.value }
                      : obj
                  );
                  handleInputChange('objectives', newObjectives || []);
                }}
                className="w-full"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleRemoveObjective(objective.id)}
              aria-label={`Remove objective ${index + 1}`}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LeadsSection: React.FC<SectionProps> = ({ formData, handleInputChange }) => {
  const handleAddLead = () => {
    handleInputChange('leads', [...(formData.leads || []), '']);
  };

  const handleLeadChange = (index: number, value: string) => {
    const newLeads = [...(formData.leads || [])];
    newLeads[index] = value;
    handleInputChange('leads', newLeads);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={handleAddLead}
          aria-label="Add a lead"
          startIcon={<PlusCircle />}
        ></Button>
        <Typography variant="h4">Initial Leads</Typography>
      </div>
      <div className="space-y-4">
        {formData.leads?.map((lead, index) => (
          <div key={`lead-${index}`} className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Input
                aria-label={`Initial lead ${index + 1}`}
                placeholder="Initial Lead"
                value={lead}
                onChange={(e) => handleLeadChange(index, e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const newLeads = formData.leads?.filter((_, i) => i !== index);
                handleInputChange('leads', newLeads || []);
              }}
              aria-label={`Remove lead ${index + 1}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const KeyLocationsSection: React.FC<SectionProps> = ({ formData, handleInputChange }) => {
  const handleAddLocation = () => {
    handleInputChange('keyLocations', [
      ...(formData.keyLocations || []),
      { name: '', description: '' }
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={handleAddLocation}
          aria-label="Add a key location"
          startIcon={<PlusCircle />}
        ></Button>
        <Typography variant="h4">Key Locations</Typography>
      </div>
      <div className="space-y-4">
        {formData.keyLocations?.map((location, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Input
                aria-label={`Key location ${index + 1} name`}
                placeholder="Location name"
                value={location.name}
                onChange={(e) => {
                  const newLocations = [...(formData.keyLocations || [])];
                  newLocations[index] = {
                    ...location,
                    name: e.target.value
                  };
                  handleInputChange('keyLocations', newLocations);
                }}
              />
              <Input
                aria-label={`Key location ${index + 1} description`}
                placeholder="Description"
                value={location.description}
                onChange={(e) => {
                  const newLocations = [...(formData.keyLocations || [])];
                  newLocations[index] = {
                    ...location,
                    description: e.target.value
                  };
                  handleInputChange('keyLocations', newLocations);
                }}
                isTextArea
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const newLocations = formData.keyLocations?.filter((_, i) => i !== index);
                handleInputChange('keyLocations', newLocations || []);
              }}
              aria-label={`Remove key location ${index + 1}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ComplicationsSection: React.FC<SectionProps> = ({ formData, handleInputChange }) => {
  const handleAddComplication = () => {
    handleInputChange('complications', [...(formData.complications || []), '']);
  };

  const handleComplicationChange = (index: number, value: string) => {
    const newComplications = [...(formData.complications || [])];
    newComplications[index] = value;
    handleInputChange('complications', newComplications);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={handleAddComplication}
          aria-label="Add a complication"
          startIcon={<PlusCircle />}
        ></Button>
        <Typography variant="h4">Possible Complications</Typography>
      </div>
      <div className="space-y-4">
        {formData.complications?.map((complication, index) => (
          <div key={`complication-${index}`} className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Input
                aria-label={`Complication ${index + 1}`}
                placeholder="Possible Complication"
                value={complication}
                onChange={(e) => handleComplicationChange(index, e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const newComplications = formData.complications?.filter((_, i) => i !== index);
                handleInputChange('complications', newComplications || []);
              }}
              aria-label={`Remove complication ${index + 1}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RewardsSection: React.FC<SectionProps> = ({ formData, handleInputChange }) => {
  const handleAddReward = () => {
    handleInputChange('rewards', [...(formData.rewards || []), '']);
  };

  const handleRewardChange = (index: number, value: string) => {
    const newRewards = [...(formData.rewards || [])];
    newRewards[index] = value;
    handleInputChange('rewards', newRewards);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={handleAddReward}
          aria-label="Add a reward"
          startIcon={<PlusCircle />}
        ></Button>
        <Typography variant="h4">Rewards</Typography>
      </div>
      <div className="space-y-4">
        {formData.rewards?.map((reward, index) => (
          <div key={`reward-${index}`} className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Input
                aria-label={`Reward ${index + 1}`}
                placeholder="Reward"
                value={reward}
                onChange={(e) => handleRewardChange(index, e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const newRewards = formData.rewards?.filter((_, i) => i !== index);
                handleInputChange('rewards', newRewards || []);
              }}
              aria-label={`Remove reward ${index + 1}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};