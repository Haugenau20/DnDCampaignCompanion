import React, { useState, useMemo } from 'react';
import { NPC } from '../types';
import Typography from '../../../../core/components/Typography';
import { RemovableChip } from '../../../../core/components/Chip';
import AttachTray from 'shared/components/attach-tray/AttachTray';
import { useAttachSet } from 'shared/components/attach-tray/useAttachTray';
import Input from '../../../../core/components/Input';
import Select from '../../../../core/components/Select';
import Button from '../../../../core/components/Button';
import Card from '../../../../core/components/Card';
import { Save, X, Users, Scroll } from 'lucide-react';
import { useQuests } from '../../quests/context/QuestContext';
import { useNPCs } from '../context/NPCContext';
import { useUser } from 'features/user-management';
import LocationCombobox from '../../locations/components/LocationCombobox';
import clsx from 'clsx';

interface NPCEditFormProps {
  /** The NPC being edited */
  npc: NPC;
  /** Callback when edit is successful */
  onSuccess?: () => void;
  /** Callback when editing is cancelled */
  onCancel?: () => void;
  /** List of existing NPCs for relationship selection */
  existingNPCs: NPC[];
}

const NPCEditForm: React.FC<NPCEditFormProps> = ({
  npc,
  onSuccess,
  onCancel,
  existingNPCs
}) => {
  // Use the NPCs context. Renamed on destructure: this context error only ever reported
  // read failures until bug #1401 was fixed, and even after that fix it still can't cover
  // validation guards updateNPC throws before reaching useFirebaseData -- that's what the
  // local `error` state below is for. See bug #1400.
  const { updateNPC, isLoading, error: npcError } = useNPCs();

  // Authentication and user data
  const { userProfile } = useUser();

  // Form state initialized with existing NPC data
  const [formData, setFormData] = useState<NPC>(npc);

  // Local submit-error state -- mirrors the pattern already established by
  // QuestCreateForm/QuestEditForm/LocationCreateForm/LocationEditForm/RumorForm. Combined
  // with npcError (above) in the single error block below so there is exactly one banner,
  // never two stacked.
  const [error, setError] = useState<string | null>(null);
  
  // State for managing connections
  const [affiliationInput, setAffiliationInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(new Set(npc.connections?.relatedNPCs || []));
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set(npc.connections?.relatedQuests || []));


  // Get quests data
  const { quests } = useQuests();
  // Built from the collections this form already reads -- T023: no new loader.
  const attachSources = useMemo(() => ({ npc: existingNPCs, quest: quests }), [existingNPCs, quests]);
  const {
    attachedIds: npcIds,
    onAttach: attachNPC,
    onDetach: detachNPC,
  } = useAttachSet(selectedNPCs, setSelectedNPCs);
  const {
    attachedIds: questIds,
    onAttach: attachQuest,
    onDetach: detachQuest,
  } = useAttachSet(selectedQuests, setSelectedQuests);

  // Handle basic input changes
  const handleInputChange = (field: keyof NPC, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.status || !formData.relationship) {
      return;
    }

    try {
      // Attribution (modifiedBy/modifiedByUsername/dateModified/etc.) is intentionally NOT
      // recomputed here — it is stamped by DocumentService at the write layer
      // (core/services/firebase/data/DocumentService.ts, via useFirebaseData.updateData), which
      // spreads its own server-derived attribution AFTER this data. formData already carries the
      // existing entity's attribution via the initial useState(npc), so this update just passes
      // that through untouched. See bug #1204.
      const updatedNPC: NPC = {
        ...formData,
        connections: {
          ...formData.connections,
          relatedNPCs: Array.from(selectedNPCs),
          relatedQuests: Array.from(selectedQuests)
        },
      };

      // Use context method to update the NPC
      await updateNPC(updatedNPC);
      onSuccess?.();
    } catch (err) {
      console.error('Failed to update NPC:', err);
      setError(err instanceof Error ? err.message : 'Failed to update NPC');
    }
  };

  return (
    <>
      <Card>
        <Card.Content>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <Typography variant="h4">Basic Information</Typography>
              <Input
                label="Name *"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
              
              <Input
                label="Title"
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />

              <div className="space-y-4">
                <Select
                  label="Status *"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  required
                >
                  <option value="alive">Alive</option>
                  <option value="deceased">Deceased</option>
                  <option value="missing">Missing</option>
                  <option value="unknown">Unknown</option>
                </Select>

                <Select
                  label="Relationship *"
                  value={formData.relationship}
                  onChange={(e) => handleInputChange('relationship', e.target.value)}
                  required
                >
                  <option value="friendly">Friendly</option>
                  <option value="neutral">Neutral</option>
                  <option value="hostile">Hostile</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </div>

              <Input
                label="Race"
                value={formData.race || ''}
                onChange={(e) => handleInputChange('race', e.target.value)}
              />

              <Input
                label="Occupation"
                value={formData.occupation || ''}
                onChange={(e) => handleInputChange('occupation', e.target.value)}
              />

              <LocationCombobox
                label="Location"
                value={formData.location || ''}
                onChange={(value) => handleInputChange('location', value)}
                onSelectLocation={(loc) =>
                  setFormData(prev => ({ ...prev, locationId: loc?.id ?? '' }))
                }
              />
            </div>

            {/* Character Details */}
            <div className="space-y-4">
              <Typography variant="h4">Character Details</Typography>
              <Input
                label="Description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                isTextArea={true}
              />

              <Input
                label="Appearance"
                value={formData.appearance || ''}
                onChange={(e) => handleInputChange('appearance', e.target.value)}
                isTextArea={true}
              />

              <Input
                label="Personality"
                value={formData.personality || ''}
                onChange={(e) => handleInputChange('personality', e.target.value)}
                isTextArea={true}
              />

              <Input
                label="Background"
                value={formData.background || ''}
                onChange={(e) => handleInputChange('background', e.target.value)}
                isTextArea={true}
              />
            </div>

            {/* Connections Section */}
            <div className="space-y-4">
              <Typography variant="h4">Connections</Typography>

              {/* Related NPCs */}
              {/* Related NPCs -- one browse-first tray (`15-2`) */}
              <div>
                <Typography variant="body" className="font-medium mb-2">
                  Related NPCs
                </Typography>
                <AttachTray
                  kinds={["npc"]}
                  sources={attachSources}
                  attachedIds={npcIds}
                  onAttach={attachNPC}
                  onDetach={detachNPC}
                  // An NPC cannot relate to themselves.
                  excludeIds={[npc.id]}
                  ariaLabel="Related NPCs"
                />
              </div>

              {/* Related Quests -- the same tray, the same verb */}
              <div>
                <Typography variant="body" className="font-medium mb-2">
                  Related Quests
                </Typography>
                <AttachTray
                  kinds={["quest"]}
                  sources={attachSources}
                  attachedIds={questIds}
                  onAttach={attachQuest}
                  onDetach={detachQuest}
                  ariaLabel="Related Quests"
                />
              </div>

              {/* Affiliations */}
              <div>
                <Typography variant="body" className="font-medium mb-2">
                  Affiliations
                </Typography>
                <div className="flex gap-2">
                  <Input
                    aria-label="Enter affiliation"
                    value={affiliationInput}
                    onChange={(e) => setAffiliationInput(e.target.value)}
                    placeholder="Enter affiliation..."
                    className="flex-1"
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (affiliationInput.trim()) {
                        setFormData(prev => ({
                          ...prev,
                          connections: {
                            ...prev.connections!,
                            affiliations: [...(prev.connections?.affiliations || []), affiliationInput.trim()]
                          }
                        }));
                        setAffiliationInput('');
                      }
                    }}
                    disabled={!affiliationInput.trim()}
                    // One visible verb (§5 item 9); the accessible name still
                    // contains it, so two Attach buttons on one form stay
                    // distinguishable to a screen reader.
                    aria-label="Attach affiliation"
                  >
                    Attach
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.connections?.affiliations.map((affiliation, index) => (
                    <RemovableChip
                      key={index}
                      onRemove={() => {
                        setFormData(prev => ({
                          ...prev,
                          connections: {
                            ...prev.connections!,
                            affiliations: prev.connections!.affiliations.filter((_, i) => i !== index)
                          }
                        }));
                      }}
                      removeLabel={`Remove affiliation ${affiliation}`}
                    >
                      {affiliation}
                    </RemovableChip>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <Typography variant="body" className="font-medium mb-2">
                  Tags
                </Typography>
                <div className="flex gap-2">
                  <Input
                    aria-label="Enter tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="merchant"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (tagInput.trim()) {
                        setFormData(prev => ({
                          ...prev,
                          tags: [...(prev.tags || []), tagInput.trim()],
                        }));
                        setTagInput('');
                      }
                    }}
                    disabled={!tagInput.trim()}
                    aria-label="Attach tag"
                  >
                    Attach
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags?.map((tag, index) => (
                    <RemovableChip
                      key={index}
                      onRemove={() => {
                          setFormData(prev => ({
                            ...prev,
                            tags: (prev.tags || []).filter((_, i) => i !== index),
                          }));
                        }}
                      removeLabel={`Remove tag ${tag}`}
                    >
                      {tag}
                    </RemovableChip>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {(error || npcError) && (
              <Typography color="error" className="mt-2">
                {error || npcError}
              </Typography>
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
                disabled={isLoading}
                startIcon={<Save />}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>

      {/* NPC Selection Dialog */}
    </>
  );
};

export default NPCEditForm;