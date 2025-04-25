import React, { useState, useMemo } from 'react';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { NPC, NPCStatus, NPCRelationship } from '../../../types/npc';
import { AlertCircle, Save, X, Users, Scroll } from 'lucide-react';
import Input from '../../core/Input';
import Button from '../../core/Button';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Dialog from '../../core/Dialog';
import { useQuests } from '../../../context/QuestContext';
import { useAuth, useUser } from '../../../context/firebase';
import clsx from 'clsx';
import { getUserDisplayName } from '../../../utils/user-utils';

interface NPCFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  existingNPCs: NPC[];
}

const NPCForm: React.FC<NPCFormProps> = ({ 
  onSuccess, 
  onCancel,
  existingNPCs
}) => {

  // Firebase user for attribution
  const { user } = useAuth();
  const { userProfile } = useUser();

  // Form state
  const [formData, setFormData] = useState<Partial<NPC>>({
    status: 'alive',
    relationship: 'neutral',
    connections: {
      relatedNPCs: [],
      affiliations: [],
      relatedQuests: []
    },
    notes: []
  });

  const [affiliationInput, setAffiliationInput] = useState('');

  // NPC Selection Dialog state
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [selectedNPCs, setSelectedNPCs] = useState<Set<string>>(new Set());

  // Quest selection state
  const { quests } = useQuests();
  const [questDropdownValue, setQuestDropdownValue] = useState('');
  const [isQuestDialogOpen, setIsQuestDialogOpen] = useState(false);
  const [selectedQuests, setSelectedQuests] = useState<Set<string>>(new Set(formData.connections?.relatedQuests || []));

  // Firebase
  const { addData, loading, error } = useFirebaseData<NPC>({
    collection: 'npcs'
  });

  // Sort NPCs alphabetically
  const sortedNPCs = useMemo(() => {
    return [...existingNPCs].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }, [existingNPCs]);

  // Available quests (excluding already selected ones)
  const availableQuests = useMemo(() => 
    quests.filter(quest => 
      !formData.connections?.relatedQuests.includes(quest.id)
    ), [quests, formData.connections?.relatedQuests]
  );

  /**
   * Handle basic input changes
   */
  const handleInputChange = (field: keyof NPC, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle NPC selection
  const toggleNPCSelection = (npcId: string) => {
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

  const handleAffiliationAdd = () => {
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
  };

  const handleAffiliationRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      connections: {
        ...prev.connections!,
        affiliations: prev.connections!.affiliations.filter((_, i) => i !== index)
      }
    }));
  };

  // Add selected NPCs to form
  const handleAddSelectedNPCs = () => {
    setFormData(prev => ({
      ...prev,
      connections: {
        ...prev.connections!,
        relatedNPCs: [...Array.from(selectedNPCs)]
      }
    }));
    setIsNPCDialogOpen(false);
    setSelectedNPCs(new Set());
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.status || !formData.relationship) {
      return;
    }
  
    try {
      // Generate ID from name (slug)
      const id = formData.name.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
      
      // Get user info for attribution
      const displayName = getUserDisplayName(userProfile);
      const currentDate = new Date().toISOString();

      const npcData: NPC = {
        id,
        name: formData.name,
        title: formData.title || '',
        status: formData.status as NPCStatus,
        race: formData.race || '',
        occupation: formData.occupation || '',
        location: formData.location || '',
        relationship: formData.relationship as NPCRelationship,
        description: formData.description || '',
        appearance: formData.appearance || '',
        personality: formData.personality || '',
        background: formData.background || '',
        connections: {
          relatedNPCs: Array.from(selectedNPCs),
          affiliations: formData.connections?.affiliations || [],
          relatedQuests: Array.from(selectedQuests)
        },
        notes: [],
        // Attribution fields
        createdBy: user?.uid || '',
        createdByUsername: displayName,
        dateAdded: currentDate
      };
  
      // Use the generated ID when adding the document
      await addData(npcData, id); // Pass the ID explicitly
      onSuccess?.();
    } catch (err) {
      console.error('Failed to create NPC:', err);
    }
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
                  <label className="block text-sm font-medium mb-1 form-label">Status *</label>
                  <select
                    className="w-full rounded-lg border p-2 input"
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
                  <label className="block text-sm font-medium mb-1 form-label">Relationship *</label>
                  <select
                    className="w-full rounded-lg border p-2 input"
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
              <div>
                <label className="block text-sm font-medium mb-1 form-label">Description</label>
                <textarea
                  className="w-full rounded-lg border p-2 h-24 input"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 form-label">Appearance</label>
                <textarea
                  className="w-full rounded-lg border p-2 h-24 input"
                  value={formData.appearance || ''}
                  onChange={(e) => handleInputChange('appearance', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 form-label">Personality</label>
                <textarea
                  className="w-full rounded-lg border p-2 h-24 input"
                  value={formData.personality || ''}
                  onChange={(e) => handleInputChange('personality', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 form-label">Background</label>
                <textarea
                  className="w-full rounded-lg border p-2 h-24 input"
                  value={formData.background || ''}
                  onChange={(e) => handleInputChange('background', e.target.value)}
                />
              </div>
            </div>

            {/* Related NPCs Section */}
            <div className="space-y-4">
              <Typography variant="h4">Related NPCs</Typography>
                <Button
                  type="button"
                  onClick={() => setIsNPCDialogOpen(true)}
                  startIcon={<Users />}
                  variant="outline"
                  className="w-full"
                >
                  Select Related NPCs
                </Button>

              {/* Display selected NPCs */}
              <div className="flex flex-wrap gap-2">
                {formData.connections?.relatedNPCs.map(npcId => {
                  const npc = existingNPCs.find(n => n.id === npcId);
                  return npc ? (
                    <div
                      key={npcId}
                      className="flex items-center gap-1 px-3 py-1 rounded-full tag"
                    >
                      <span>{npc.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            connections: {
                              ...prev.connections!,
                              relatedNPCs: prev.connections!.relatedNPCs.filter(id => id !== npcId)
                            }
                          }));
                        }}
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
                        className="flex items-center gap-1 px-3 py-1 rounded-full tag"
                      >
                        <span>{quest.title}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newSet = new Set(selectedQuests);
                            newSet.delete(questId);
                            setSelectedQuests(newSet);
                          }}
                          className="typography-secondary hover:opacity-75">
                          <X size={14} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>


            {/* Affiliations */}
          <div className="space-y-4">
            <Typography variant="h4">Affiliations</Typography>
            <div className="flex gap-2">
              <Input
                value={affiliationInput}
                onChange={(e) => setAffiliationInput(e.target.value)}
                placeholder="Miners Exchange"
                className="flex-1"
                style={{ fontStyle: 'italic'}}
              />
              <Button 
                type="button"
                onClick={handleAffiliationAdd}
                disabled={!affiliationInput.trim()}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.connections?.affiliations.map((affiliation, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-3 py-1 rounded-full tag"
                >
                  <span>{affiliation}</span>
                  <button
                    type="button"
                    onClick={() => handleAffiliationRemove(index)}
                    className="typography-secondary hover:opacity-75">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="typography-error" />
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
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                startIcon={<Save />}
              >
                {loading ? 'Creating...' : 'Create NPC'}
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>

      {/* NPC Selection Dialog */}
      <Dialog 
        open={isNPCDialogOpen} 
        onClose={() => {
          setIsNPCDialogOpen(false);
          setSelectedNPCs(new Set());
        }}
        title="Select Related NPCs"
        maxWidth="max-w-3xl"
      >
        {/* NPC Grid */}
        <div className="max-h-96 overflow-y-auto mb-4">
          <div className="grid grid-cols-3 gap-2">
            {sortedNPCs.map(npc => (
              <button
                key={npc.id}
                onClick={() => toggleNPCSelection(npc.id)}
                className={clsx(
                  "p-2 rounded text-center transition-colors",
                  selectedNPCs.has(npc.id)
                    ? `selected-item`
                    : `selectable-item`
                )}
              >
                <Typography 
                  variant="body"
                  className={`${selectedNPCs.has(npc.id) ? 'font-medium' : ''}`}
                >
                  {npc.name}
                </Typography>
              </button>
            ))}
          </div>
        </div>

        {/* Dialog Actions */}
        <div className="flex justify-between border-t pt-4">
          <Typography variant="body-sm" color="secondary">
            {sortedNPCs.length} NPCs available
          </Typography>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsNPCDialogOpen(false);
                setSelectedNPCs(new Set());
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSelectedNPCs}
              disabled={selectedNPCs.size === 0}
              startIcon={<Users />}
            >
              Add Selected ({selectedNPCs.size})
            </Button>
          </div>
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
                    ? `selected-item`
                    : `selectable-item`
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

export default NPCForm;