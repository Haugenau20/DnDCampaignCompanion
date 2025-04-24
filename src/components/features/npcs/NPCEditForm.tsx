import React, { useState } from 'react';
import { NPC } from '../../../types/npc';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import Button from '../../core/Button';
import Card from '../../core/Card';
import Dialog from '../../core/Dialog';
import { Save, X, Users, Scroll } from 'lucide-react';
import { useQuests } from '../../../context/QuestContext';
import { useTheme } from '../../../themes/ThemeContext';
import { useAuth, useUser } from '../../../context/firebase';
import clsx from 'clsx';
import { getUserDisplayName } from '../../../utils/user-utils';

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
  // Theme context
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Firebase user for attribution
  const { user } = useAuth();
  const { userProfile } = useUser();

  // Form state initialized with existing NPC data
  const [formData, setFormData] = useState<NPC>(npc);
  
  // State for managing connections
  const [affiliationInput, setAffiliationInput] = useState('');
  const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(new Set(npc.connections?.relatedNPCs || []));
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set(npc.connections?.relatedQuests || []));
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [isQuestDialogOpen, setIsQuestDialogOpen] = useState(false);

  // Get quests data
  const { quests } = useQuests();

  // Firebase hook
  const { updateData, loading, error } = useFirebaseData<NPC>({
    collection: 'npcs'
  });

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
      // Get user info for attribution
      const displayName = getUserDisplayName(userProfile);
      const currentDate = new Date().toISOString();
      
      const updatedNPC: NPC = {
        ...formData,
        connections: {
          ...formData.connections,
          relatedNPCs: Array.from(selectedNPCs),
          relatedQuests: Array.from(selectedQuests)
        },
        // Update modification attribution
        modifiedBy: user?.uid || '',
        modifiedByUsername: displayName,
        dateModified: currentDate
      };

      await updateData(npc.id, updatedNPC);
      onSuccess?.();
    } catch (err) {
      console.error('Failed to update NPC:', err);
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={clsx("block text-sm font-medium mb-1", `${themePrefix}-form-label`)}>Status *</label>
                  <select
                    className={clsx("w-full rounded-lg border p-2", `${themePrefix}-input`)}
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    required
                  >
                    <option value="alive">Alive</option>
                    <option value="deceased">Deceased</option>
                    <option value="missing">Missing</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className={clsx("block text-sm font-medium mb-1", `${themePrefix}-form-label`)}>Relationship *</label>
                  <select
                    className={clsx("w-full rounded-lg border p-2", `${themePrefix}-input`)}
                    value={formData.relationship}
                    onChange={(e) => handleInputChange('relationship', e.target.value)}
                    required
                  >
                    <option value="friendly">Friendly</option>
                    <option value="neutral">Neutral</option>
                    <option value="hostile">Hostile</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
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

              <Input
                label="Location"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
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
              <div>
                <Typography variant="body" className="font-medium mb-2">
                  Related NPCs
                </Typography>
                <Button
                  variant="outline"
                  onClick={() => setIsNPCDialogOpen(true)}
                  startIcon={<Users />}
                  className="w-full mb-2"
                  type="button"
                >
                  Select Related NPCs
                </Button>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedNPCs).map(npcId => {
                    const relatedNPC = existingNPCs.find(n => n.id === npcId);
                    return relatedNPC ? (
                      <div
                        key={npcId}
                        className={clsx(
                          "flex items-center gap-1 px-3 py-1 rounded-full",
                          `${themePrefix}-tag`
                        )}
                      >
                        <span>{relatedNPC.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newSet = new Set(selectedNPCs);
                            newSet.delete(npcId);
                            setSelectedNPCs(newSet);
                          }}
                          className={clsx(`${themePrefix}-typography-secondary`, "hover:opacity-75")}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Related Quests */}
              <div>
                <Typography variant="body" className="font-medium mb-2">
                  Related Quests
                </Typography>
                <Button
                  variant="outline"
                  onClick={() => setIsQuestDialogOpen(true)}
                  startIcon={<Scroll />}
                  className="w-full mb-2"
                  type="button"
                >
                  Select Related Quests
                </Button>
                <div className="flex flex-wrap gap-2">
                  {Array.from(selectedQuests).map(questId => {
                    const quest = quests.find(q => q.id === questId);
                    return quest ? (
                      <div
                        key={questId}
                        className={clsx(
                          "flex items-center gap-1 px-3 py-1 rounded-full",
                          `${themePrefix}-tag`
                        )}
                      >
                        <span>{quest.title}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newSet = new Set(selectedQuests);
                            newSet.delete(questId);
                            setSelectedQuests(newSet);
                          }}
                          className={clsx(`${themePrefix}-typography-secondary`, "hover:opacity-75")}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Affiliations */}
              <div>
                <Typography variant="body" className="font-medium mb-2">
                  Affiliations
                </Typography>
                <div className="flex gap-2">
                  <Input
                    value={affiliationInput}
                    onChange={(e) => setAffiliationInput(e.target.value)}
                    placeholder="Enter affiliation..."
                    className="flex-1"
                  />
                  <Button 
                    type="button"
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
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.connections?.affiliations.map((affiliation, index) => (
                    <div
                      key={index}
                      className={clsx(
                        "flex items-center gap-1 px-3 py-1 rounded-full",
                        `${themePrefix}-tag`
                      )}
                    >
                      <span>{affiliation}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            connections: {
                              ...prev.connections!,
                              affiliations: prev.connections!.affiliations.filter((_, i) => i !== index)
                            }
                          }));
                        }}
                        className={clsx(`${themePrefix}-typography-secondary`, "hover:opacity-75")}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <Typography color="error" className="mt-2">
                {error}
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
                disabled={loading}
                startIcon={<Save />}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>

      {/* NPC Selection Dialog */}
      <Dialog
        open={isNPCDialogOpen}
        onClose={() => setIsNPCDialogOpen(false)}
        title="Select Related NPCs"
        maxWidth="max-w-3xl"
      >
        <div className="max-h-96 overflow-y-auto mb-4">
          <div className="grid grid-cols-3 gap-2">
            {existingNPCs
              .filter(n => n.id !== npc?.id) // Don't show the current NPC
              .map(otherNPC => (
                <button
                  key={otherNPC.id}
                  onClick={() => {
                    const newSet = new Set(selectedNPCs);
                    if (newSet.has(otherNPC.id)) {
                      newSet.delete(otherNPC.id);
                    } else {
                      newSet.add(otherNPC.id);
                    }
                    setSelectedNPCs(newSet);
                  }}
                  className={clsx(
                    "p-2 rounded text-center transition-colors",
                    selectedNPCs.has(otherNPC.id)
                      ? `${themePrefix}-selected-item`
                      : `${themePrefix}-selectable-item`
                  )}
                >
                  <Typography variant="body-sm" className={selectedNPCs.has(otherNPC.id) ? 'font-medium' : ''}>
                    {otherNPC.name}
                  </Typography>
                </button>
              ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setIsNPCDialogOpen(false)}>Done</Button>
        </div>
      </Dialog>

      {/* Quest Selection Dialog */}
      <Dialog
        open={isQuestDialogOpen}
        onClose={() => setIsQuestDialogOpen(false)}
        title="Select Related Quests"
        maxWidth="max-w-3xl"
      >
        <div className="max-h-96 overflow-y-auto mb-4">
          <div className="space-y-2">
            {quests.map(quest => (
              <button
                key={quest.id}
                onClick={() => {
                  const newSet = new Set(selectedQuests);
                  if (newSet.has(quest.id)) {
                    newSet.delete(quest.id);
                  } else {
                    newSet.add(quest.id);
                  }
                  setSelectedQuests(newSet);
                }}
                className={clsx(
                  "w-full p-2 rounded text-left transition-colors",
                  selectedQuests.has(quest.id)
                    ? `${themePrefix}-selected-item`
                    : `${themePrefix}-selectable-item`
                )}
              >
                <Typography variant="body-sm" className={selectedQuests.has(quest.id) ? 'font-medium' : ''}>
                  {quest.title}
                </Typography>
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setIsQuestDialogOpen(false)}>Done</Button>
        </div>
      </Dialog>
    </>
  );
};

export default NPCEditForm;