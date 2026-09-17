// src/features/campaign-entities/locations/components/LocationFormSections.tsx
import React, { useState } from 'react';
import { Location, LocationType } from '../types';
import { NPC } from '../../npcs/types';
import Typography from '../../../../core/components/Typography';
import { RemovableChip } from '../../../../core/components/Chip';
import AttachTray from 'shared/components/attach-tray/AttachTray';
import { useAttachSet } from 'shared/components/attach-tray/useAttachTray';
import Input from '../../../../core/components/Input';
import Select from '../../../../core/components/Select';
import Button from '../../../../core/components/Button';
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
  /**
   * Still accepted, still ignored: the tray reads the collection from the
   * provider that already owns it rather than from a prop. Kept so the two
   * location forms need no change beyond deleting their dialog state, which
   * `15-8` retires along with the forms themselves.
   */
  npcs?: NPC[];
  selectedNPCs: Set<string>;
  setSelectedNPCs: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

interface RelatedQuestsSectionProps extends SectionProps {
  selectedQuests: Set<string>;
  setSelectedQuests: (value: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
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
          aria-label="Add a notable feature"
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
              aria-label={`Remove feature ${index + 1}`}
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
}) => {
  const { quests } = useQuests();
  const sources = React.useMemo(() => ({ quest: quests }), [quests]);
  const { attachedIds, onAttach, onDetach } = useAttachSet(
    selectedQuests,
    setSelectedQuests as (updater: (previous: Set<string>) => Set<string>) => void
  );

  return (
    <div className="space-y-4">
      <Typography variant="h4">Quests here</Typography>
      <AttachTray
        kinds={["quest"]}
        sources={sources}
        attachedIds={attachedIds}
        onAttach={onAttach}
        onDetach={onDetach}
        ariaLabel="Quests here"
      />
    </div>
  );
};

// RelatedNPCsSection.tsx
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
      <Typography variant="h4">Who is here</Typography>
      <AttachTray
        kinds={["npc"]}
        sources={sources}
        attachedIds={attachedIds}
        onAttach={onAttach}
        onDetach={onDetach}
        ariaLabel="Who is here"
      />
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
          aria-label="Attach tag"
          disabled={!tagInput.trim()}
        >
          Attach
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