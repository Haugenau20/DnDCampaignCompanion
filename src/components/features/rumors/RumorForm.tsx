// src/components/features/rumors/RumorForm.tsx
import React, { useState, useEffect } from 'react';
import { Rumor, RumorStatus, SourceType } from '../../../types/rumor';
import { useRumors } from '../../../context/RumorContext';
import { useNPCs } from '../../../context/NPCContext';
import { useLocations } from '../../../context/LocationContext';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import Button from '../../core/Button';
import Card from '../../core/Card';
import Dialog from '../../core/Dialog';
import { useAuth, useUser } from '../../../context/firebase';
import { useTheme } from '../../../themes/ThemeContext';
import clsx from 'clsx';
import { AlertCircle, Save, X, Users, MapPin } from 'lucide-react';

interface RumorFormProps {
  /** Existing rumor for editing, or undefined for creating a new one */
  rumor?: Rumor;
  /** Title for the form */
  title: string;
  /** Callback when form is submitted successfully */
  onSuccess?: () => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
}

const RumorForm: React.FC<RumorFormProps> = ({
  rumor,
  title,
  onSuccess,
  onCancel
}) => {
  // Basic form state
  const [formData, setFormData] = useState<Partial<Rumor>>({
    title: '',
    content: '',
    status: 'unconfirmed',
    sourceType: 'other',
    sourceName: '',
    sourceNpcId: '',
    location: '',
    locationId: '',
    relatedNPCs: [],
    relatedLocations: [],
    notes: []
  });

  // Dialog and selection state
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(new Set());
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());

  // Form validation and submission state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get theme context
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Get NPCs and Locations for selection
  const { npcs } = useNPCs();
  const { locations } = useLocations();
  const { addRumor, updateRumor } = useRumors();
  const { user } = useAuth();
  const { userProfile } = useUser();

  // Pre-populate form if editing an existing rumor
  useEffect(() => {
    if (rumor) {
      setFormData({
        ...rumor,
      });
      
      // Initialize selection sets
      setSelectedNPCs(new Set(rumor.relatedNPCs || []));
      setSelectedLocations(new Set(rumor.relatedLocations || []));
    }
  }, [rumor]);

  // Handle basic input changes
  const handleInputChange = <K extends keyof Rumor>(
    field: K,
    value: Rumor[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle source type change
  const handleSourceTypeChange = (newSourceType: SourceType) => {
    setFormData(prev => ({
      ...prev,
      sourceType: newSourceType,
      // Clear NPC-specific fields if not an NPC source
      ...(newSourceType !== 'npc' ? { sourceNpcId: '' } : {})
    }));
  };

  // Handle source NPC selection
  const handleSourceNPCSelect = (npcId: string) => {
    const selectedNPC = npcs.find(npc => npc.id === npcId);
    
    if (selectedNPC) {
      setFormData(prev => ({
        ...prev,
        sourceNpcId: npcId,
        sourceName: selectedNPC.name
      }));
    }
  };

  // Handle location selection
  const handleLocationSelect = (locationId: string) => {
    const selectedLocation = locations.find(loc => loc.id === locationId);
    
    if (selectedLocation) {
      setFormData(prev => ({
        ...prev,
        locationId,
        location: selectedLocation.name
      }));
    }
  };

  // Handle NPC selection in dialog
  const handleNPCToggle = (npcId: string) => {
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

  // Handle location selection in dialog
  const handleLocationToggle = (locationId: string) => {
    setSelectedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate required fields
    if (!formData.title || !formData.content || !formData.sourceName) {
      setError('Title, content, and source name are required');
      return;
    }
  
    if (!user || !userProfile) {
      setError('You must be logged in to submit rumors');
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      // Update form data with selections
      const updatedFormData = {
        ...formData,
        relatedNPCs: Array.from(selectedNPCs),
        relatedLocations: Array.from(selectedLocations)
      };
  
      if (rumor) {
        // Updating existing rumor
        await updateRumor({
          ...rumor,
          ...updatedFormData,
        });
      } else {
        // Creating new rumor - no need to specify ID here
        await addRumor(updatedFormData as Omit<Rumor, 'id'>);
      }
      
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rumor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <Card.Header title={title} />
      <Card.Content>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <Typography variant="h4">Basic Information</Typography>
            <Input
              label="Title *"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
              disabled={isSubmitting}
            />
            
            <Input
              label="Content *"
              value={formData.content || ''}
              onChange={(e) => handleInputChange('content', e.target.value)}
              isTextArea
              required
              disabled={isSubmitting}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={clsx("block text-sm font-medium mb-1", `${themePrefix}-form-label`)}>Status *</label>
                <select
                  className={clsx("w-full rounded-lg border p-2", `${themePrefix}-input`)}
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as RumorStatus)}
                  required
                  disabled={isSubmitting}
                >
                  <option value="unconfirmed">Unconfirmed</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="false">False</option>
                </select>
              </div>

              <div>
                <label className={clsx("block text-sm font-medium mb-1", `${themePrefix}-form-label`)}>Source Type *</label>
                <select
                  className={clsx("w-full rounded-lg border p-2", `${themePrefix}-input`)}
                  value={formData.sourceType}
                  onChange={(e) => handleSourceTypeChange(e.target.value as SourceType)}
                  required
                  disabled={isSubmitting}
                >
                  <option value="npc">NPC</option>
                  <option value="tavern">Tavern/Inn</option>
                  <option value="notice">Written Notice</option>
                  <option value="traveler">Traveler</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Source information - changes based on source type */}
            {formData.sourceType === 'npc' ? (
              <div>
                <label className={clsx("block text-sm font-medium mb-1", `${themePrefix}-form-label`)}>Source NPC *</label>
                <select
                  className={clsx("w-full rounded-lg border p-2", `${themePrefix}-input`)}
                  value={formData.sourceNpcId || ''}
                  onChange={(e) => handleSourceNPCSelect(e.target.value)}
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Select an NPC</option>
                  {npcs.map(npc => (
                    <option key={npc.id} value={npc.id}>{npc.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <Input
                label="Source Name *"
                value={formData.sourceName || ''}
                onChange={(e) => handleInputChange('sourceName', e.target.value)}
                placeholder={
                  formData.sourceType === 'tavern' ? "Tavern name" :
                  formData.sourceType === 'notice' ? "Notice description" :
                  formData.sourceType === 'traveler' ? "Traveler description" :
                  "Source name"
                }
                required
                disabled={isSubmitting}
              />
            )}

            {/* Location */}
            <div>
              <label className={clsx("block text-sm font-medium mb-1", `${themePrefix}-form-label`)}>Location</label>
              <select
                className={clsx("w-full rounded-lg border p-2", `${themePrefix}-input`)}
                value={formData.locationId || ''}
                onChange={(e) => handleLocationSelect(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Select a location</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Related NPCs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Typography variant="h4">Related NPCs</Typography>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNPCDialogOpen(true)}
                startIcon={<Users />}
                disabled={isSubmitting}
              >
                Select NPCs
              </Button>
            </div>
            
            {/* Display selected NPCs */}
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedNPCs).map(npcId => {
                const npc = npcs.find(n => n.id === npcId);
                return npc ? (
                  <div
                    key={npcId}
                    className={clsx(
                      "flex items-center gap-1 rounded-full px-3 py-1",
                      `${themePrefix}-tag`
                    )}
                  >
                    <span>{npc.name}</span>
                    <button
                      type="button"
                      onClick={() => handleNPCToggle(npcId)}
                      className={clsx(
                        `${themePrefix}-typography-secondary`,
                        `hover:${themePrefix}-button-ghost-hover`,
                      )}
                      disabled={isSubmitting}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : null;
              })}
              {selectedNPCs.size === 0 && (
                <Typography variant="body-sm" color="secondary">
                  No NPCs selected
                </Typography>
              )}
            </div>
          </div>

          {/* Related Locations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Typography variant="h4">Related Locations</Typography>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsLocationDialogOpen(true)}
                startIcon={<MapPin />}
                disabled={isSubmitting}
              >
                Select Locations
              </Button>
            </div>
            
            {/* Display selected Locations */}
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedLocations).map(locationId => {
                const location = locations.find(l => l.id === locationId);
                return location ? (
                  <div
                    key={locationId}
                    className={clsx(
                      "flex items-center gap-1 rounded-full px-3 py-1",
                      `${themePrefix}-tag`
                    )}
                  >
                    <span>{location.name}</span>
                    <button
                      type="button"
                      onClick={() => handleLocationToggle(locationId)}
                      className={clsx(
                        `${themePrefix}-typography-secondary`,
                        `hover:${themePrefix}-button-ghost-hover`,
                      )}
                      disabled={isSubmitting}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : null;
              })}
              {selectedLocations.size === 0 && (
                <Typography variant="body-sm" color="secondary">
                  No locations selected
                </Typography>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className={`${themePrefix}-rumor-status-false`} />
              <Typography color="error">{error}</Typography>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              variant="ghost"
              onClick={onCancel}
              type="button"
              startIcon={<X />}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              startIcon={<Save />}
              isLoading={isSubmitting}
            >
              {rumor ? 'Save Changes' : 'Add Rumor'}
            </Button>
          </div>
        </form>

        {/* NPC Selection Dialog */}
        <Dialog
          open={isNPCDialogOpen}
          onClose={() => setIsNPCDialogOpen(false)}
          title="Select Related NPCs"
          maxWidth="max-w-3xl"
        >
          <div className="max-h-96 overflow-y-auto mb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {npcs.map(npc => (
                <button
                  key={npc.id}
                  type="button"
                  onClick={() => handleNPCToggle(npc.id)}
                  className={clsx(
                    `p-2 rounded text-center transition-colors`,
                    selectedNPCs.has(npc.id)
                      ? `${themePrefix}-selected-item`
                      : `${themePrefix}-selectable-item`
                  )}
                >
                  <Typography 
                    variant="body-sm"
                    className={selectedNPCs.has(npc.id) ? 'font-medium' : ''}
                  >
                    {npc.name}
                  </Typography>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setIsNPCDialogOpen(false)}
            >
              Done
            </Button>
          </div>
        </Dialog>

        {/* Location Selection Dialog */}
        <Dialog
          open={isLocationDialogOpen}
          onClose={() => setIsLocationDialogOpen(false)}
          title="Select Related Locations"
          maxWidth="max-w-3xl"
        >
          <div className="max-h-96 overflow-y-auto mb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {locations.map(location => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => handleLocationToggle(location.id)}
                  className={clsx(
                    `p-2 rounded text-center transition-colors`,
                    selectedLocations.has(location.id)
                      ? `${themePrefix}-selected-item`
                      : `${themePrefix}-selectable-item`
                  )}
                >
                  <Typography 
                    variant="body-sm"
                    className={selectedLocations.has(location.id) ? 'font-medium' : ''}
                  >
                    {location.name}
                  </Typography>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setIsLocationDialogOpen(false)}
            >
              Done
            </Button>
          </div>
        </Dialog>
      </Card.Content>
    </Card>
  );
};

export default RumorForm;