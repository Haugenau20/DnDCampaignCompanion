// components/features/locations/LocationCreateForm.tsx
import React, { useState, useEffect } from 'react';
import { Location } from '../../../types/location';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import Card from '../../core/Card';
import { useNPCs } from '../../../context/NPCContext';
import { useNotes } from '../../../context/NoteContext';
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
  /** Initial data for the form (e.g., from a converted entity) */
  initialData?: {
    name?: string;
    title?: string;
    description?: string;
    parentId?: string;
    noteId?: string;
    entityId?: string;
    [key: string]: any;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Generate location ID from name
 */
const generateLocationId = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const LocationCreateForm: React.FC<LocationCreateFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
}) => {
  // Get locations to validate parent ID
  const { getLocationById } = useLocations();
  
  // Validate and clean initial data
  const validateInitialData = (data?: typeof initialData) => {
    if (!data) return {};
    
    const { parentId, ...rest } = data;
    
    // Verify parent location exists
    const validatedData = { ...rest };
    if (parentId) {
      const parentLocation = getLocationById(parentId);
      if (parentLocation) {
        validatedData.parentId = parentId;
      }
      // If parent location doesn't exist, we don't include parentId
    }
    
    return validatedData;
  };

  // Form state with validated initial data
  const [formData, setFormData] = useState<Partial<Location>>(() => {
    const validatedData = validateInitialData(initialData);
    
    return {
      status: validatedData.status || 'known',
      type: validatedData.type || 'poi',
      features: [],
      connectedNPCs: [],
      notes: [],
      tags: [],
      ...validatedData,
      name: validatedData.name || '',
      description: validatedData.description || '',
      parentId: validatedData.parentId || '',
    };
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
  const { markEntityAsConverted } = useNotes();

  // Check if we have required context
  const hasRequiredContext = !!activeGroupId && !!activeCampaignId;

  // Handle basic input changes
  const handleInputChange = <K extends keyof Location>(
    field: K,
    value: Location[K]
  ) => {
    // Validate parent ID when it's being changed
    if (field === 'parentId' && value) {
      const parentId = typeof value === 'string' ? value : String(value);
      const parentLocation = getLocationById(parentId);
      if (!parentLocation) {
        // If parent location doesn't exist, clear the value
        value = '' as Location[K];
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validate parent ID on mount and when it changes
  useEffect(() => {
    if (formData.parentId) {
      const parentLocation = getLocationById(formData.parentId);
      if (!parentLocation) {
        // Clear invalid parent ID
        setFormData(prev => ({
          ...prev,
          parentId: ''
        }));
      }
    }
  }, [formData.parentId, getLocationById]);

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

      const locationId = await createLocation(locationData);
      
      // If this was created from a note entity, mark it as converted
      if (initialData?.noteId && initialData?.entityId) {
        await markEntityAsConverted(initialData.noteId, initialData.entityId, locationId);
      }
      
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