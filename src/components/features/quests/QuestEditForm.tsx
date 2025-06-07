// src/components/features/quests/QuestEditForm.tsx
import React, { useState } from 'react';
import { Quest } from '../../../types/quest';
import { useQuests } from '../../../context/QuestContext'; // Import useQuests from context
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import Card from '../../core/Card';
import { useNPCs } from '../../../context/NPCContext';
import {
  BasicInfoSection,
  ObjectivesSection,
  LeadsSection,
  KeyLocationsSection,
  ComplicationsSection,
  RewardsSection,
  RelatedNPCsSection
} from './QuestFormSections';
import { 
  AlertCircle, 
  Save, 
  X, 
} from 'lucide-react';

interface QuestEditFormProps {
  /** The quest being edited */
  quest: Quest;
  /** Callback when edit is successful */
  onSuccess?: () => void;
  /** Callback when editing is cancelled */
  onCancel?: () => void;
}

const QuestEditForm: React.FC<QuestEditFormProps> = ({
  quest,
  onSuccess,
  onCancel,
}) => {
  
  // Import updateQuest from the context
  const { update: updateQuest, isLoading, error: questError } = useQuests();

  // Form state initialized with existing quest data
  const [formData, setFormData] = useState<Quest>(quest);
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(
    new Set(quest.relatedNPCIds || [])
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get NPCs data
  const { npcs } = useNPCs();

  // Handle basic input changes
  const handleInputChange = <K extends keyof Quest>(
    field: K,
    value: Quest[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.status) {
      setError("Title and description are required");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create clean domain data for context (system metadata handled automatically)
      const domainData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        background: formData.background,
        objectives: formData.objectives,
        leads: formData.leads,
        keyLocations: formData.keyLocations,
        complications: formData.complications,
        rewards: formData.rewards,
        relatedNPCIds: Array.from(selectedNPCs),
        location: formData.location,
        dateCompleted: formData.dateCompleted
      };

      await updateQuest(quest.id, domainData);
      onSuccess?.();
    } catch (err) {
      console.error('Failed to update quest:', err);
      setError(err instanceof Error ? err.message : 'Failed to update quest');
    } finally {
      setIsSubmitting(false);
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
        
        <ObjectivesSection 
          formData={formData}
          handleInputChange={handleInputChange}
        />
        
        <LeadsSection 
          formData={formData}
          handleInputChange={handleInputChange}
        />
        
        <KeyLocationsSection 
          formData={formData}
          handleInputChange={handleInputChange}
        />
        
        <ComplicationsSection 
          formData={formData}
          handleInputChange={handleInputChange}
        />
        
        <RewardsSection 
          formData={formData}
          handleInputChange={handleInputChange}
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

          {/* Error Message */}
          {(error || questError) && (
            <div className="flex items-center gap-2 form-error">
              <AlertCircle size={16} />
              <Typography color="error">
                {error || questError}
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
              disabled={isSubmitting || isLoading}
              startIcon={<Save />}
              isLoading={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
};

export default QuestEditForm;