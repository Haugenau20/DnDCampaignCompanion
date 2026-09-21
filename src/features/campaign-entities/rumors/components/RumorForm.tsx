// src/features/campaign-entities/rumors/components/RumorForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Rumor, RumorStatus, SourceType } from '../types';
import { useRumors } from '../context/RumorContext';
import { useNPCs } from '../../npcs/context/NPCContext';
import { useLocations } from '../../locations/context/LocationContext';
import { useNotes } from 'features/collaboration';
import Typography from '../../../../core/components/Typography';
import AttachTray from 'shared/components/attach-tray/AttachTray';
import { useAttachSet } from 'shared/components/attach-tray/useAttachTray';
import Input from '../../../../core/components/Input';
import Select from '../../../../core/components/Select';
import Button from '../../../../core/components/Button';
import Card from '../../../../core/components/Card';
import { useAuth, useUser } from 'features/user-management';
import clsx from 'clsx';
import { AlertCircle, Save, X, Users, MapPin } from 'lucide-react';

interface RumorFormProps {
  /** Existing rumor for editing */
  rumor?: Rumor;
  /** Initial data for creating a new rumor (e.g., from note conversion) */
  initialData?: {
    title?: string;
    content?: string;
    noteId?: string;
    entityId?: string;
    status?: RumorStatus;
    sourceType?: SourceType;
    sourceName?: string;
  };
  /** Title for the form */
  title: string;
  /** Callback when form is submitted successfully */
  onSuccess?: () => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
}

const RumorForm: React.FC<RumorFormProps> = ({
  rumor,
  initialData,
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

  // Relation selection state
  const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(new Set());
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());


  // Form validation and submission state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get NPCs and Locations for selection
  const { npcs } = useNPCs();
  const { locations } = useLocations();
  // Built from the collections this form already reads -- T023: no new
  // loader, and no dependency on a provider the form does not need.
  const attachSources = useMemo(() => ({ npc: npcs, location: locations }), [npcs, locations]);
  const {
    attachedIds: npcIds,
    onAttach: attachNPC,
    onDetach: detachNPC,
  } = useAttachSet(selectedNPCs, setSelectedNPCs);
  const {
    attachedIds: locationIds,
    onAttach: attachLocation,
    onDetach: detachLocation,
  } = useAttachSet(selectedLocations, setSelectedLocations);
  const { addRumor, updateRumor } = useRumors();
  const { markEntityAsConverted } = useNotes();
  const { user } = useAuth();
  const { userProfile } = useUser();

  // Pre-populate form if editing or using initial data
  useEffect(() => {
    if (rumor) {
      setFormData({
        ...rumor,
      });
      
      // Initialize selection sets
      setSelectedNPCs(new Set(rumor.relatedNPCs || []));
      setSelectedLocations(new Set(rumor.relatedLocations || []));
    } else if (initialData) {
      setFormData(prev => ({
        ...prev,
        title: initialData.title || '',
        content: initialData.content || '',
        status: initialData.status || 'unconfirmed',
        sourceType: initialData.sourceType || 'other',
        sourceName: initialData.sourceName || '',
      }));
    }
  }, [rumor, initialData]);

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
    // Detaching passes '' -- clear both fields
    // rather than leaving a stale locationId/location pair behind. Before this fix,
    // choosing the placeholder found no match below and silently left whatever was
    // previously selected in place: a stale id paired with a blank-looking selection.
    if (!locationId) {
      setFormData(prev => ({
        ...prev,
        locationId: '',
        location: ''
      }));
      return;
    }

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
  
      if (rumor?.id) {
        // Updating existing rumor
        await updateRumor({
          ...rumor,
          ...updatedFormData,
        });
      } else {
        // Creating new rumor - no need to specify ID here
        const rumorId = await addRumor(updatedFormData as Omit<Rumor, 'id'>);
        
        // If this was created from a note entity, mark it as converted
        if (initialData?.noteId && initialData?.entityId) {
          await markEntityAsConverted(initialData.noteId, initialData.entityId, rumorId);
        }
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

            <div className="space-y-4">
              <Select
                label="Status *"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as RumorStatus)}
                required
                disabled={isSubmitting}
              >
                <option value="unconfirmed">Unconfirmed</option>
                <option value="confirmed">Confirmed</option>
                <option value="false">Disproved</option>
              </Select>

              <Select
                label="Source Type *"
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
              </Select>
            </div>

            {/* Source information - changes based on source type */}
            {formData.sourceType === 'npc' ? (
              <div className="space-y-2">
                <Typography variant="body-sm" className="form-label">Source NPC *</Typography>
                <AttachTray
                  kinds={["npc"]}
                  sources={attachSources}
                  attachedIds={formData.sourceNpcId ? [formData.sourceNpcId] : []}
                  single
                  ariaLabel="Source NPC"
                  onAttach={(id) => handleSourceNPCSelect(id)}
                  onDetach={() => handleSourceNPCSelect('')}
                />
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

            {/* Where it was heard -- one tray, not a flat list of every
                location in the campaign, which said nothing about any of
                them (§5). */}
            <div className="space-y-2">
              <Typography variant="body-sm" className="form-label">Location</Typography>
              <AttachTray
                kinds={["location"]}
                sources={attachSources}
                attachedIds={formData.locationId ? [formData.locationId] : []}
                single
                ariaLabel="Location"
                onAttach={(id) => handleLocationSelect(id)}
                onDetach={() => handleLocationSelect('')}
              />
            </div>
          </div>

          {/* Related NPCs -- one browse-first tray */}
          <div className="space-y-4">
            <Typography variant="h4">Related NPCs</Typography>
            <AttachTray
              kinds={["npc"]}
              sources={attachSources}
              attachedIds={npcIds}
              onAttach={attachNPC}
              onDetach={detachNPC}
              ariaLabel="Related NPCs"
            />
          </div>

          {/* Related Locations -- the same tray, the same verb */}
          <div className="space-y-4">
            <Typography variant="h4">Related Locations</Typography>
            <AttachTray
              kinds={["location"]}
              sources={attachSources}
              attachedIds={locationIds}
              onAttach={attachLocation}
              onDetach={detachLocation}
              ariaLabel="Related Locations"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="form-error" />
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
              {rumor?.id ? 'Save Changes' : 'Add Rumor'}
            </Button>
          </div>
        </form>

        {/* NPC Selection Dialog */}
      </Card.Content>
    </Card>
  );
};

export default RumorForm;