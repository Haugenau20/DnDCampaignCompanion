// components/features/locations/LocationCreateForm.tsx
import React, { useState } from 'react';
import { Location } from '../../../types/location';
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
import { useAuth, useUser, useGroups, useCampaigns } from '../../../context/firebase';
import { useLocations } from '../../../context/LocationContext';

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog and selection state - moved to local state
  const [isQuestDialogOpen, setIsQuestDialogOpen] = useState(false);
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set());
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(new Set()); 
  
  // Firebase user for attribution
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  
  // Get NPCs data
  const { npcs } = useNPCs();

  // Use LocationContext for creating
  const { createLocation } = useLocations();

  // Check if we have required context
  const hasRequiredContext = !!activeGroupId && !!activeCampaignId;

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

  // Handle form submission - now includes all selected NPCs and Quests
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.type || !formData.status) {
      return;
    }

    // Check if we have required context
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to create a location');
    }

    setLoading(true);
    setError(null);

    try {
      const locationData = {
        ...formData,
        connectedNPCs: Array.from(selectedNPCs),
        relatedQuests: Array.from(selectedQuests),
        lastVisited: formData.lastVisited || new Date().toISOString().split('T')[0],
      } as Omit<Location, 'id'>;

      await createLocation(locationData);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to create location:', err);
      setError(err instanceof Error ? err.message : 'Failed to create location');
    } finally {
      setLoading(false);
    }
  };

  // If we don't have required context, show a message
  if (!hasRequiredContext) {
    return (
      <Card>
        <Card.Content className="text-center py-8">
          <Typography variant="h3" className="mb-4">
            No Active Group or Campaign
          </Typography>
          <Typography color="secondary" className="mb-4">
            Please select a group and campaign to create a location.
          </Typography>
          <Button
            variant="ghost"
            onClick={onCancel}
          >
            Go Back
          </Button>
        </Card.Content>
      </Card>
    );
  }

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
              <AlertCircle size={16} className="form-error" />
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