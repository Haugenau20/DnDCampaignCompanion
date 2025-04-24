// src/components/features/quests/QuestCreateForm.tsx
import React, { useState, useEffect } from 'react';
import { Quest, QuestStatus } from '../../../types/quest';
import { useQuests } from '../../../context/QuestContext'; // Import useQuests from context
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import Card from '../../core/Card';
import { useNPCs } from '../../../context/NPCContext';
import { useTheme } from '../../../themes/ThemeContext';
import clsx from 'clsx';
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

interface QuestCreateFormProps {
  /** Initial data for the form (e.g., from a converted rumor) */
  initialData?: Partial<Quest>;
  /** Callback when creation is successful */
  onSuccess?: () => void;
  /** Callback when creation is cancelled */
  onCancel?: () => void;
}

const QuestCreateForm: React.FC<QuestCreateFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
}) => {
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  // Import addQuest from the context
  const { addQuest, isLoading, error: questError } = useQuests();

  // Initial quest state
  const [formData, setFormData] = useState<Partial<Quest>>({
    status: 'active',
    objectives: [],
    keyLocations: [],
    importantNPCs: [],
    relatedNPCIds: [],
    leads: [],
    complications: [],
    rewards: []
  });

  // Dialog and NPC selection state
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get NPCs data
  const { npcs } = useNPCs();

  // Apply initial data when available
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));

      // Set selected NPCs if provided
      if (initialData.relatedNPCIds && initialData.relatedNPCIds.length > 0) {
        setSelectedNPCs(new Set(initialData.relatedNPCIds));
      }
    }
  }, [initialData]);

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
    
    if (!formData.title || !formData.description) {
      setError("Title and description are required");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const questData = {
        title: formData.title,
        description: formData.description,
        status: formData.status as QuestStatus,
        background: formData.background || '',
        objectives: formData.objectives || [],
        leads: formData.leads || [],
        keyLocations: formData.keyLocations || [],
        importantNPCs: formData.importantNPCs || [],
        relatedNPCIds: Array.from(selectedNPCs),
        complications: formData.complications || [],
        rewards: formData.rewards || [],
        location: formData.location || '',
        levelRange: formData.levelRange || ''
      };

      await addQuest(questData);
      onSuccess?.();
    } catch (err) {
      console.error('Failed to create quest:', err);
      setError(err instanceof Error ? err.message : 'Failed to create quest');
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
            <div className={clsx("flex items-center gap-2", `${themePrefix}-form-error`)}>
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
              {isSubmitting || isLoading ? 'Creating...' : 'Create Quest'}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
};

export default QuestCreateForm;