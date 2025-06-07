import React, { useState, useMemo } from 'react';
import { NPCFormData, NPCStatus, NPCRelationship, NPCConnections } from '../../../types/npc';
import { AlertCircle, Save, X, Users, Scroll } from 'lucide-react';
import Input from '../../core/Input';
import Button from '../../core/Button';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Dialog from '../../core/Dialog';
import { useQuests } from '../../../context/QuestContext';
import { useNPCs } from '../../../context/NPCContext';
import { useNotes } from '../../../context/NoteContext';
import clsx from 'clsx';

interface NPCFormProps {
  /** Initial domain data for the form (e.g., from a converted entity) */
  initialData?: Partial<NPCFormData> & {
    noteId?: string;
    entityId?: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

const NPCForm: React.FC<NPCFormProps> = ({ 
  initialData,
  onSuccess, 
  onCancel,
}) => {
  // Get context for operations - only domain operations
  const { create: createNPC, isLoading, error, items: existingNPCs } = useNPCs();
  const { items: quests } = useQuests();
  const { markEntityAsConverted } = useNotes();

  // Pure domain form state - no system metadata
  const [formData, setFormData] = useState<NPCFormData>({
    name: initialData?.name || '',
    title: initialData?.title || '',
    status: initialData?.status || 'alive',
    race: initialData?.race || '',
    occupation: initialData?.occupation || '',
    location: initialData?.location || '',
    relationship: initialData?.relationship || 'neutral',
    description: initialData?.description || '',
    appearance: initialData?.appearance || '',
    personality: initialData?.personality || '',
    background: initialData?.background || '',
    connections: initialData?.connections || {
      relatedNPCs: [],
      affiliations: [],
      relatedQuests: []
    },
    notes: initialData?.notes || []
  });

  const [affiliationInput, setAffiliationInput] = useState('');

  // Dialog states
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [isQuestDialogOpen, setIsQuestDialogOpen] = useState(false);
  const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(
    new Set(formData.connections.relatedNPCs)
  );
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(
    new Set(formData.connections.relatedQuests)
  );

  // Generic input change handler
  const handleInputChange = (field: keyof NPCFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validation
  const isFormValid = useMemo(() => {
    return formData.name.trim() !== '' && formData.status && formData.relationship;
  }, [formData.name, formData.status, formData.relationship]);

  // Handle adding affiliation
  const handleAddAffiliation = () => {
    if (affiliationInput.trim()) {
      setFormData(prev => ({
        ...prev,
        connections: {
          ...prev.connections,
          affiliations: [...prev.connections.affiliations, affiliationInput.trim()]
        }
      }));
      setAffiliationInput('');
    }
  };

  // Handle removing affiliation
  const handleRemoveAffiliation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      connections: {
        ...prev.connections,
        affiliations: prev.connections.affiliations.filter((_, i) => i !== index)
      }
    }));
  };

  // Handle NPC selection
  const handleNPCSelectionConfirm = () => {
    setFormData(prev => ({
      ...prev,
      connections: {
        ...prev.connections,
        relatedNPCs: Array.from(selectedNPCs)
      }
    }));
    setIsNPCDialogOpen(false);
  };

  // Handle Quest selection
  const handleQuestSelectionConfirm = () => {
    setFormData(prev => ({
      ...prev,
      connections: {
        ...prev.connections,
        relatedQuests: Array.from(selectedQuests)
      }
    }));
    setIsQuestDialogOpen(false);
  };

  /**
   * Handle form submission - submits clean domain data only
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      return;
    }
  
    try {
      // Submit clean domain data - context handles all system metadata
      const createdNPC = await createNPC(formData);
      
      // If this was created from a note entity, mark it as converted
      if (initialData?.noteId && initialData?.entityId) {
        await markEntityAsConverted(initialData.noteId, initialData.entityId, createdNPC.id);
      }
      
      onSuccess?.();
    } catch (err) {
      console.error('Failed to create NPC:', err);
    }
  };

  // Remove NPC from connections
  const removeRelatedNPC = (npcId: string) => {
    setFormData(prev => ({
      ...prev,
      connections: {
        ...prev.connections,
        relatedNPCs: prev.connections.relatedNPCs.filter(id => id !== npcId)
      }
    }));
  };

  // Remove Quest from connections
  const removeRelatedQuest = (questId: string) => {
    setFormData(prev => ({
      ...prev,
      connections: {
        ...prev.connections,
        relatedQuests: prev.connections.relatedQuests.filter(id => id !== questId)
      }
    }));
  };

  return (
    <>
      <Card className="max-w-7xl mx-auto">
        <Card.Header title="Create New NPC" />
        <Card.Content>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <Typography variant="h4">Basic Information</Typography>
              <Input
                label="Name *"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
              
              <Input
                label="Title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 form-label">Status *</label>
                  <select
                    className="w-full rounded-lg border p-2 input"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as NPCStatus)}
                    required
                  >
                    <option value="alive">Alive</option>
                    <option value="deceased">Deceased</option>
                    <option value="missing">Missing</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 form-label">Relationship *</label>
                  <select
                    className="w-full rounded-lg border p-2 input"
                    value={formData.relationship}
                    onChange={(e) => handleInputChange('relationship', e.target.value as NPCRelationship)}
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
                value={formData.race}
                onChange={(e) => handleInputChange('race', e.target.value)}
              />

              <Input
                label="Occupation"
                value={formData.occupation}
                onChange={(e) => handleInputChange('occupation', e.target.value)}
              />

              <Input
                label="Location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
              />
            </div>

            {/* Character Details */}
            <div className="space-y-4">
              <Typography variant="h4">Character Details</Typography>
              <div>
                <label className="block text-sm font-medium mb-1 form-label">Description</label>
                <textarea
                  className="w-full rounded-lg border p-2 h-24 input"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 form-label">Appearance</label>
                <textarea
                  className="w-full rounded-lg border p-2 h-24 input"
                  value={formData.appearance}
                  onChange={(e) => handleInputChange('appearance', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 form-label">Personality</label>
                <textarea
                  className="w-full rounded-lg border p-2 h-24 input"
                  value={formData.personality}
                  onChange={(e) => handleInputChange('personality', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 form-label">Background</label>
                <textarea
                  className="w-full rounded-lg border p-2 h-24 input"
                  value={formData.background}
                  onChange={(e) => handleInputChange('background', e.target.value)}
                />
              </div>
            </div>

            {/* Connections */}
            <div className="space-y-4">
              <Typography variant="h4">Connections</Typography>
              
              {/* Related NPCs */}
              <div>
                <Typography variant="body" className="font-medium mb-2">Related NPCs</Typography>
                <Button
                  type="button"
                  onClick={() => setIsNPCDialogOpen(true)}
                  startIcon={<Users />}
                  variant="outline"
                  className="w-full mb-2"
                >
                  Select Related NPCs
                </Button>

                <div className="flex flex-wrap gap-2">
                  {formData.connections.relatedNPCs.map(npcId => {
                    const npc = existingNPCs.find(n => n.id === npcId);
                    return npc ? (
                      <div
                        key={npcId}
                        className="flex items-center gap-1 px-3 py-1 rounded-full tag"
                      >
                        <span>{npc.name}</span>
                        <button
                          type="button"
                          onClick={() => removeRelatedNPC(npcId)}
                          className="typography-secondary hover:opacity-75">
                          <X size={14} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Related Quests */}
              <div>
                <Typography variant="body" className="font-medium mb-2">Related Quests</Typography>
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
                  {formData.connections.relatedQuests.map(questId => {
                    const quest = quests.find(q => q.id === questId);
                    return quest ? (
                      <div
                        key={questId}
                        className="flex items-center gap-1 px-3 py-1 rounded-full tag"
                      >
                        <span>{quest.title}</span>
                        <button
                          type="button"
                          onClick={() => removeRelatedQuest(questId)}
                          className="typography-secondary hover:opacity-75">
                          <X size={14} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Affiliations */}
              <div>
                <Typography variant="body" className="font-medium mb-2">Affiliations</Typography>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add affiliation..."
                    value={affiliationInput}
                    onChange={(e) => setAffiliationInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAffiliation())}
                  />
                  <Button
                    type="button"
                    onClick={handleAddAffiliation}
                    variant="outline"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.connections.affiliations.map((affiliation, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-3 py-1 rounded-full tag"
                    >
                      <span>{affiliation}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAffiliation(index)}
                        className="typography-secondary hover:opacity-75">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <span className="text-red-800 dark:text-red-200">{error}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!isFormValid || isLoading}
                startIcon={<Save />}
              >
                {isLoading ? 'Creating...' : 'Create NPC'}
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
      >
        <div className="space-y-4">
          {existingNPCs.map(npc => (
            <div key={npc.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedNPCs.has(npc.id)}
                onChange={(e) => {
                  const newSet = new Set(selectedNPCs);
                  if (e.target.checked) {
                    newSet.add(npc.id);
                  } else {
                    newSet.delete(npc.id);
                  }
                  setSelectedNPCs(newSet);
                }}
              />
              <div>
                <div className="font-medium">{npc.name}</div>
                {npc.title && <div className="text-sm typography-secondary">{npc.title}</div>}
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsNPCDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleNPCSelectionConfirm}>
              Confirm Selection
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Quest Selection Dialog */}
      <Dialog
        open={isQuestDialogOpen}
        onClose={() => setIsQuestDialogOpen(false)}
        title="Select Related Quests"
      >
        <div className="space-y-4">
          {quests.map(quest => (
            <div key={quest.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedQuests.has(quest.id)}
                onChange={(e) => {
                  const newSet = new Set(selectedQuests);
                  if (e.target.checked) {
                    newSet.add(quest.id);
                  } else {
                    newSet.delete(quest.id);
                  }
                  setSelectedQuests(newSet);
                }}
              />
              <div>
                <div className="font-medium">{quest.title}</div>
                <div className="text-sm typography-secondary">{quest.status}</div>
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsQuestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuestSelectionConfirm}>
              Confirm Selection
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default NPCForm;