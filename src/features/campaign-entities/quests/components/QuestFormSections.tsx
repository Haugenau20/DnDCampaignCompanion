// src/features/campaign-entities/quests/components/QuestFormSections.tsx
import { NPC } from '../../npcs/types';
import React from 'react';
import { Quest, QuestStatus } from '../types';
import Typography from '../../../../core/components/Typography';
import { SelectableChip, RemovableChip } from '../../../../core/components/Chip';
import Input from '../../../../core/components/Input';
import Select from '../../../../core/components/Select';
import Button from '../../../../core/components/Button';
import LocationCombobox from '../../locations/components/LocationCombobox';
import Dialog from '../../../../core/components/Dialog';
import clsx from 'clsx';
import { PlusCircle, X, Target } from 'lucide-react';

interface SectionProps {
  formData: Partial<Quest>;
  handleInputChange: (field: keyof Quest, value: any) => void;
}

interface RelatedNPCsSectionProps extends SectionProps {
    npcs: NPC[];
    selectedNPCs: Set<string>;
    setSelectedNPCs: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    isNPCDialogOpen: boolean;
    setIsNPCDialogOpen: (isOpen: boolean) => void;
  }
  
  export const RelatedNPCsSection: React.FC<RelatedNPCsSectionProps> = ({ 
    npcs,
    selectedNPCs,
    setSelectedNPCs,
    isNPCDialogOpen,
    setIsNPCDialogOpen
  }) => {

    const handleRemoveNPC = (npcId: string) => {
      setSelectedNPCs((prev: Set<string>) => {
        const newSet = new Set(prev);
        newSet.delete(npcId);
        return newSet;
      });
    };
  
    const handleToggleNPC = (npcId: string) => {
      setSelectedNPCs((prev: Set<string>) => {
        const newSet = new Set(prev);
        if (newSet.has(npcId)) {
          newSet.delete(npcId);
        } else {
          newSet.add(npcId);
        }
        return newSet;
      });
    };
  
    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsNPCDialogOpen(true)}
            startIcon={<PlusCircle />}
          ></Button>
          <Typography variant="h4">Related NPCs</Typography>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from(selectedNPCs).map(npcId => {
            const npc = npcs.find(n => n.id === npcId);
            return npc ? (
              <RemovableChip
                key={npcId}
                onRemove={() => handleRemoveNPC(npcId)}
                removeLabel={`Remove ${npc.name}`}
              >
                {npc.name}
              </RemovableChip>
            ) : null;
          })}
        </div>
  
        <Dialog
          open={isNPCDialogOpen}
          onClose={() => setIsNPCDialogOpen(false)}
          title="Select Related NPCs"
          maxWidth="max-w-3xl"
        >
          <div className="max-h-96 overflow-y-auto mb-4">
            <div className="grid grid-cols-3 gap-2">
              {npcs.map(npc => (
                <SelectableChip
                  key={npc.id}
                  selected={selectedNPCs.has(npc.id)}
                  onToggle={() => handleToggleNPC(npc.id)}
                  className="text-center"
                >
                  {npc.name}
                </SelectableChip>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"  // Explicitly set type to "button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsNPCDialogOpen(false);
              }}
            >
              Done
            </Button>
          </div>
        </Dialog>
      </div>
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

      <div className="grid grid-cols-2 gap-4">
        <div>
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
        </div>

        <LocationCombobox
          label="Location"
          value={formData.location || ''}
          onChange={(value) => handleInputChange('location', value)}
          onSelectLocation={(loc) => handleInputChange('locationId', loc?.id ?? '')}
        />
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
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};