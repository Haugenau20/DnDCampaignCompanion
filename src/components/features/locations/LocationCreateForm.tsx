// LocationCreateForm.tsx
import React, { useState } from 'react';
import { Location } from '../../../types/location';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import Card from '../../core/Card';
import { useNPCs } from '../../../context/NPCContext';
import {
  BasicInfoSection,
  FeaturesSection,
  RelatedNPCsSection,
  TagsSection,
  RelatedQuestsSection
} from './LocationFormSections';
import { AlertCircle, Save, X } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useFirebase } from '../../../context/FirebaseContext';
import clsx from 'clsx';
import { getUserDisplayName } from '../../../utils/user-utils';

interface LocationCreateFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const LocationCreateForm: React.FC<LocationCreateFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  // Form state
  const [formData, setFormData] = useState<Partial<Location>>({
    status: 'known',
    type: 'poi',
    features: [],
    connectedNPCs: [],
    notes: [],
    tags: []
  });

  // Dialog and selection state - moved to local state
  const [isQuestDialogOpen, setIsQuestDialogOpen] = useState(false);
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set());
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(new Set()); 
  // Firebase user for attribution
  const { user, userProfile } = useFirebase();
  
  // Get NPCs data
  const { npcs } = useNPCs();
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Firebase hook - only used during final submission
  const { addData, loading, error } = useFirebaseData<Location>({
    collection: 'locations'
  });

  // Handle basic input changes
  const handleInputChange = <K extends keyof Location>(
    field: K,
    value: Location[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generate location ID from name
  const generateLocationId = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Handle form submission - now includes all selected NPCs and Quests
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.type || !formData.status) {
      return;
    }

    try {
      const displayName = getUserDisplayName(userProfile);
      const currentDate = new Date().toISOString();
      const locationId = generateLocationId(formData.name);
      const locationData: Location = {
        id: locationId,
        name: formData.name,
        type: formData.type,
        status: formData.status,
        description: formData.description,
        parentId: formData.parentId || '',
        features: formData.features || [],
        connectedNPCs: Array.from(selectedNPCs), // Use local state
        relatedQuests: Array.from(selectedQuests), // Use local state
        notes: [],
        tags: formData.tags || [],
        lastVisited: formData.lastVisited || new Date().toISOString().split('T')[0],
        createdBy: user?.uid || '',
        createdByUsername: displayName,
        dateAdded: currentDate
      };

      await addData(locationData, locationId);
      onSuccess?.();
    } catch (err) {
      console.error('Failed to create location:', err);
    }
  };

  return (
    <Card>
      <Card.Content>
        <form onSubmit={handleSubmit} className="space-y-6">
          <BasicInfoSection 
            formData={formData}
            handleInputChange={handleInputChange}
          />
          
          <FeaturesSection 
            formData={formData}
            handleInputChange={handleInputChange}
          />

          <RelatedQuestsSection 
            formData={formData}
            handleInputChange={handleInputChange}
            selectedQuests={selectedQuests}
            setSelectedQuests={setSelectedQuests}
            isQuestDialogOpen={isQuestDialogOpen}
            setIsQuestDialogOpen={setIsQuestDialogOpen}
          />

          <RelatedNPCsSection
            formData={formData}
            handleInputChange={handleInputChange}
            npcs={npcs}
            selectedNPCs={selectedNPCs}
            setSelectedNPCs={setSelectedNPCs}
            isNPCDialogOpen={isNPCDialogOpen}
            setIsNPCDialogOpen={setIsNPCDialogOpen}
          />

          <TagsSection 
            formData={formData}
            handleInputChange={handleInputChange}
          />

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className={clsx(`${themePrefix}-form-error`)} />
              <Typography color="error">
                {error}
              </Typography>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              variant="ghost"
              onClick={onCancel}
              type="button"
              startIcon={<X />}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              startIcon={<Save />}
            >
              {loading ? 'Creating...' : 'Create Location'}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
};

export default LocationCreateForm;