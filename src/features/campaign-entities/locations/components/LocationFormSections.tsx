// src/features/campaign-entities/locations/components/LocationFormSections.tsx
import React, { useState } from 'react';
import { Location, LocationType } from '../types';
import { NPC } from '../../npcs/types';
import Typography from '../../../../core/components/Typography';
import { SelectableChip, RemovableChip } from '../../../../core/components/Chip';
import Input from '../../../../core/components/Input';
import Select from '../../../../core/components/Select';
import Button from '../../../../core/components/Button';
import Dialog from '../../../../core/components/Dialog';
import { useQuests } from '../../quests/context/QuestContext';
import { useLocations } from '../context/LocationContext';
import LocationCombobox from './LocationCombobox';
import { 
  PlusCircle, 
  X, 
  Users, 
  Scroll,
} from 'lucide-react';
import clsx from 'clsx';

interface SectionProps {
  formData: Partial<Location>;
  handleInputChange: (field: keyof Location, value: any) => void;
}

interface RelatedNPCsSectionProps extends SectionProps {
  npcs: NPC[];
  selectedNPCs: Set<string>;
  setSelectedNPCs: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  isNPCDialogOpen: boolean;
  setIsNPCDialogOpen: (isOpen: boolean) => void;
}

interface RelatedQuestsSectionProps extends SectionProps {
  selectedQuests: Set<string>;
  setSelectedQuests: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  isQuestDialogOpen: boolean;
  setIsQuestDialogOpen: (isOpen: boolean) => void;
}

export const BasicInfoSection: React.FC<SectionProps> = ({ formData, handleInputChange }) => {
  const { locations } = useLocations();

  // The combobox displays location NAMES, but parentId stores a reference.
  // Resolve the stored id back to a name for display rather than showing the
  // raw id: they are only ever the same string for a location that has never
  // been renamed and never needed a disambiguating suffix. See #303.
  const parentLocationName =
    locations.find(loc => loc.id === formData.parentId)?.name ?? '';

  return (
    <div className="space-y-4">
      <Typography variant="h4">Basic Information</Typography>
      <Input
        label="Name *"
        value={formData.name || ''}
        onChange={(e) => handleInputChange('name', e.target.value)}
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
          label="Type *"
          value={formData.type}
          onChange={(e) => handleInputChange('type', e.target.value as LocationType)}
          required
        >
          <option value="region">Region</option>
          <option value="city">City</option>
          <option value="town">Town</option>
          <option value="village">Village</option>
          <option value="dungeon">Dungeon</option>
          <option value="landmark">Landmark</option>
          <option value="building">Building</option>
          <option value="poi">Point of Interest</option>
        </Select>

        <Select
          label="Status *"
          value={formData.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
          required
        >
          <option value="known">Known</option>
          <option value="explored">Explored</option>
          <option value="visited">Visited</option>
        </Select>
      </div>

      <LocationCombobox
        label="Parent Location"
        value={parentLocationName}
        // Display text is deliberately not stored. parentId is a reference,
        // and it comes from onSelectLocation below, which hands back the
        // actual Location rather than a name to re-slugify. See #303.
        onChange={() => undefined}
        onSelectLocation={(location) => handleInputChange('parentId', location?.id ?? '')}
        strictMode={true}
        placeholder="Select parent location..."
      />
    </div>
  );
};

export const FeaturesSection: React.FC<SectionProps> = ({ formData, handleInputChange }) => {
  const handleAddFeature = () => {
    handleInputChange('features', [...(formData.features || []), '']);
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...(formData.features || [])];
    newFeatures[index] = value;
    handleInputChange('features', newFeatures);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={handleAddFeature}
          startIcon={<PlusCircle />}
        />
        <Typography variant="h4">Notable Features</Typography>
      </div>
      <div className="space-y-4">
        {formData.features?.map((feature, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex-1">
              <Input
                aria-label={`Feature ${index + 1}`}
                value={feature}
                onChange={(e) => handleFeatureChange(index, e.target.value)}
                placeholder="Feature description"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const newFeatures = formData.features?.filter((_, i) => i !== index);
                handleInputChange('features', newFeatures || []);
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

// RelatedQuestsSection.tsx
export const RelatedQuestsSection: React.FC<RelatedQuestsSectionProps> = ({
  selectedQuests,
  setSelectedQuests,
  isQuestDialogOpen,
  setIsQuestDialogOpen
}) => {
  const { quests } = useQuests();

  // This function ONLY updates the local selectedQuests state
  const handleToggleQuest = (questId: string) => {
    setSelectedQuests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questId)) {
        newSet.delete(questId);
      } else {
        newSet.add(questId);
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
          onClick={() => setIsQuestDialogOpen(true)}
          startIcon={<Scroll />}
        >
          Select Related Quests
        </Button>
      </div>

      {/* Display selected quests */}
      <div className="flex flex-wrap gap-2">
        {Array.from(selectedQuests).map(questId => {
          const quest = quests.find(q => q.id === questId);
          return quest ? (
            <RemovableChip
              key={questId}
              onRemove={() => handleToggleQuest(questId)}
              removeLabel={`Remove ${quest.title}`}
            >
              {quest.title}
            </RemovableChip>
          ) : null;
        })}
      </div>

      {/* Quest Selection Dialog */}
      <Dialog
        open={isQuestDialogOpen}
        onClose={() => setIsQuestDialogOpen(false)}
        title="Select Related Quests"
        maxWidth="max-w-3xl"
      >
        <div className="max-h-96 overflow-y-auto mb-4">
          <div className="space-y-2">
            {quests.map(quest => (
              <SelectableChip
                key={quest.id}
                selected={selectedQuests.has(quest.id)}
                onToggle={() => handleToggleQuest(quest.id)}
                className="w-full text-left"
              >
                {quest.title}
              </SelectableChip>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={() => setIsQuestDialogOpen(false)}>
            Done
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

// RelatedNPCsSection.tsx
export const RelatedNPCsSection: React.FC<RelatedNPCsSectionProps> = ({ 
  npcs,
  selectedNPCs,
  setSelectedNPCs,
  isNPCDialogOpen,
  setIsNPCDialogOpen
}) => {
  
  // This function ONLY updates the local selectedNPCs state
  const handleToggleNPC = (npcId: string) => {
    setSelectedNPCs(prev => {
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
          startIcon={<Users />}
        >
          Select Connected NPCs
        </Button>
      </div>

      {/* Display selected NPCs */}
      <div className="flex flex-wrap gap-2">
        {Array.from(selectedNPCs).map(npcId => {
          const npc = npcs.find(n => n.id === npcId);
          return npc ? (
            <RemovableChip
              key={npcId}
              onRemove={() => handleToggleNPC(npcId)}
              removeLabel={`Remove ${npc.name}`}
            >
              {npc.name}
            </RemovableChip>
          ) : null;
        })}
      </div>

      {/* NPC Selection Dialog */}
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
          <Button type="button" onClick={() => setIsNPCDialogOpen(false)}>
            Done
          </Button>
        </div>
      </Dialog>
    </div>
  );
};

export const TagsSection: React.FC<SectionProps> = ({ formData, handleInputChange }) => {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim()) {
      handleInputChange('tags', [...(formData.tags || []), tagInput.trim()]);
      setTagInput('');
    }
  };

  return (
    <div className="space-y-4">
      <Typography variant="h4">Tags</Typography>
      <div className="flex gap-2">
        <Input
          aria-label="Enter tag"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="Enter tag..."
          className="flex-1"
        />
        <Button 
          type="button"
          variant="outline"
          onClick={handleAddTag}
          disabled={!tagInput.trim()}
        >
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {formData.tags?.map((tag, index) => (
          <RemovableChip
            key={index}
            onRemove={() => {
                handleInputChange(
                  'tags',
                  formData.tags?.filter((_, i) => i !== index) || []
                );
              }}
            removeLabel={`Remove tag ${tag}`}
          >
            {tag}
          </RemovableChip>
        ))}
      </div>
    </div>
  );
};