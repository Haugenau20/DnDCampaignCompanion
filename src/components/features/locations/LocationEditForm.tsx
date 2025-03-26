// src/components/features/locations/LocationEditForm.tsx
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
import { useTheme } from '../../../context/ThemeContext';
import clsx from 'clsx';
import { useAuth, useUser, useGroups, useCampaigns } from '../../../context/firebase';
import { useLocations } from '../../../context/LocationContext';

interface LocationEditFormProps {
  /** The location being edited */
  location: Location;
  /** Callback when edit is successful */
  onSuccess?: () => void;
  /** Callback when editing is cancelled */
  onCancel?: () => void;
}

const LocationEditForm: React.FC<LocationEditFormProps> = ({
    location,
    onSuccess,
    onCancel,
  }) => {
    // Form state initialized with existing location data
    const [formData, setFormData] = useState<Location>(location);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Firebase user for attribution
    const { user } = useAuth();
    const { userProfile } = useUser();
    const { activeGroupId } = useGroups();
    const { activeCampaignId } = useCampaigns();
    
    // Keep selection state local until form submission
    const [isQuestDialogOpen, setIsQuestDialogOpen] = useState(false);
    const [selectedQuests, setSelectedQuests] = useState<Set<string>>(
      new Set(location.relatedQuests || [])
    );
    const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
    const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(
      new Set(location.connectedNPCs || [])
    );

    // Check if we have required context
    const hasRequiredContext = !!activeGroupId && !!activeCampaignId;
  
    // Get NPCs data
    const { npcs } = useNPCs();
    const { theme } = useTheme();
    const themePrefix = theme.name;

    // Use LocationContext for updating
    const { updateLocation } = useLocations();

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

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.name || !formData.description || !formData.type || !formData.status) {
        return;
      }

      // Check if we have required context
      if (!user || !activeGroupId || !activeCampaignId) {
        throw new Error('User must be authenticated and group/campaign context must be set to update a location');
      }

      setLoading(true);
      setError(null);

      try {
        // Now we include the selected NPCs and Quests only during final submission
        const updatedLocation: Partial<Location> = {
          ...formData,
          connectedNPCs: Array.from(selectedNPCs),
          relatedQuests: Array.from(selectedQuests),
        };

        await updateLocation(location.id, updatedLocation);
        
        if (onSuccess) {
          onSuccess();
        }
      } catch (err) {
        console.error('Failed to update location:', err);
        setError(err instanceof Error ? err.message : 'Failed to update location');
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
              Please select a group and campaign to edit a location.
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
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    );
};

export default LocationEditForm;