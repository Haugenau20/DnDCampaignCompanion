// src/components/features/locations/LocationFormSections.tsx
import React, { useState } from 'react';
import { Location, LocationType } from '../../../types/location';
import { NPC } from '../../../types/npc';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import Button from '../../core/Button';
import Dialog from '../../core/Dialog';
import { useQuests } from '../../../context/QuestContext';
import LocationCombobox from '../locations/LocationCombobox';
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

// Generate location ID from name
const generateLocationId = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const BasicInfoSection: React.FC<SectionProps> = ({ formData, handleInputChange }) => {
  
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 form-label">Type *</label>
          <select
            className="w-full rounded-lg border p-2 input"
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
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 form-label">Status *</label>
          <select
            className="w-full rounded-lg border p-2 input"
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            required
          >
            <option value="known">Known</option>
            <option value="explored">Explored</option>
            <option value="visited">Visited</option>
          </select>
        </div>
      </div>

      <LocationCombobox
        label="Parent Location ID"
        value={formData.parentId || ''}
        onChange={(value) => handleInputChange('parentId', generateLocationId(value))}
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
            <div
              key={questId}
              className="flex items-center gap-1 rounded-full px-3 py-1 tag"
            >
              <span>{quest.title}</span>
              <button
                type="button"
                onClick={() => handleToggleQuest(questId)}
                className="typography-secondary hover:opacity-70">
                <X size={14} />
              </button>
            </div>
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
              <button
                key={quest.id}
                type="button"
                onClick={() => handleToggleQuest(quest.id)}
                className={clsx(
                  "w-full p-2 rounded text-left transition-colors",
                  selectedQuests.has(quest.id)
                    ? `selected-item`
                    : `selectable-item`
                )}
              >
                <Typography variant="body-sm">
                  {quest.title}
                </Typography>
              </button>
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
            <div
              key={npcId}
              className="flex items-center gap-1 rounded-full px-3 py-1 tag"
            >
              <span>{npc.name}</span>
              <button
                type="button"
                onClick={() => handleToggleNPC(npcId)}
                className="typography-secondary hover:opacity-70">
                <X size={14} />
              </button>
            </div>
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
              <button
                key={npc.id}
                type="button"
                onClick={() => handleToggleNPC(npc.id)}
                className={clsx(
                  "p-2 rounded text-center transition-colors",
                  selectedNPCs.has(npc.id)
                    ? `selected-item`
                    : `selectable-item`
                )}
              >
                <Typography variant="body-sm">
                  {npc.name}
                </Typography>
              </button>
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
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="Enter tag..."
          className="flex-1"
        />
        <Button 
          type="button"
          onClick={handleAddTag}
          disabled={!tagInput.trim()}
        >
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {formData.tags?.map((tag, index) => (
          <div
            key={index}
            className="flex items-center gap-1 rounded-full px-3 py-1 tag"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => {
                handleInputChange(
                  'tags',
                  formData.tags?.filter((_, i) => i !== index) || []
                );
              }}
              className="typography-secondary hover:opacity-70">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};