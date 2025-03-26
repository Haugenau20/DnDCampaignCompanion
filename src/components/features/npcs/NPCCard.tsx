import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { NPC, NPCNote } from '../../../types/npc';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Button from '../../core/Button';
import Input from '../../core/Input';
import DeleteConfirmationDialog from '../../shared/DeleteConfirmationDialog';
import { useQuests } from '../../../context/QuestContext';
import { useAuth } from '../../../context/firebase';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { useNavigation } from '../../../context/NavigationContext';
import { useTheme } from '../../../context/ThemeContext';
import AttributionInfo from '../../shared/AttributionInfo';
import clsx from 'clsx';
import { 
  ChevronDown, 
  ChevronUp, 
  Users,
  Calendar,
  Heart,
  Edit,
  PlusCircle,
  Save,
  X,
  Trash2
} from 'lucide-react';

interface NPCCardProps {
  npc: NPC;
  onEdit?: (npc: NPC) => void;
  onDelete?: (npcId: string) => void;
}

const NPCCard: React.FC<NPCCardProps> = ({ 
  npc: initialNpc,
  onEdit,
  onDelete
}) => {
  const [npc, setNpc] = useState<NPC>(initialNpc);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { getQuestById } = useQuests();
  const { user } = useAuth();
  const { updateData, deleteData } = useFirebaseData<NPC>({ collection: 'npcs' });
  const { navigateToPage, createPath } = useNavigation();
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Handle quick note adding
  const handleAddNote = async () => {
    if (!noteInput.trim()) return;

    const newNote: NPCNote = {
      date: new Date().toISOString().split('T')[0],
      text: noteInput.trim()
    };

    // Create updated NPC with new note (optimistic update)
    const updatedNPC = {
      ...npc,
      notes: [...npc.notes, newNote]
    };

    // Update local state immediately
    setNpc(updatedNPC);
    
    // Reset form
    setNoteInput('');
    setIsAddingNote(false);

    try {
      // Update Firebase in the background
      await updateData(npc.id, updatedNPC);
      
      // Notify parent component if needed
      if (onEdit) {
        onEdit(updatedNPC);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      // Revert the optimistic update in case of error
      setNpc(initialNpc);
    }
  };

  // Handle editing the NPC
  const handleEdit = () => {
    if (user) {
      navigateToPage(`/npcs/edit/${npc.id}`);
    }
  };

  // Handle NPC deletion
  const handleDeleteConfirm = async () => {
    await deleteData(npc.id);
    
    if (onDelete) {
      onDelete(npc.id);
    }
    
    setIsDeleteDialogOpen(false);
  };

  // Handle quest click
  const handleQuestClick = (questId: string) => {
    navigateToPage(createPath('/quests', {}, { highlight: questId }));
  };

  return (
    <>
      <Card className={clsx(
        `${themePrefix}-npc-card`,
        `${themePrefix}-npc-card-${npc.relationship}`
      )}>
        <Card.Content className="space-y-4">
          {/* NPC Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Typography variant="h4">
                  {npc.name}
                </Typography>
              </div>
              {npc.title && (
                <Typography color="secondary" className="mt-1">
                  {npc.title}
                </Typography>
              )}
            </div>

            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2"
              startIcon={isExpanded ? <ChevronUp /> : <ChevronDown />}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>

          {/* Basic Info */}
          <div className="space-y-3">
            {/* Status and Relationship */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Typography variant="body-sm" className="font-medium">
                  Status:
                </Typography>
                <Typography 
                  variant="body-sm" 
                  className={clsx(
                    "font-medium",
                    `${themePrefix}-npc-status-${npc.status}`
                  )}
                >
                  {npc.status.charAt(0).toUpperCase() + npc.status.slice(1)}
                </Typography>
              </div>
            </div>

            {/* Location and Occupation */}
            {(npc.occupation) && (
              <div className="space-y-2">
                {npc.occupation && (
                  <div className="flex items-center gap-2">
                    <Heart size={16} className={clsx(`${themePrefix}-typography-secondary`)} />
                    <Typography variant="body-sm">
                      {npc.occupation}
                    </Typography>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="pt-4 space-y-6">
              {/* Creator and modifier attribution */}
              <AttributionInfo
                createdByUsername={npc.createdByUsername}
                dateAdded={npc.dateAdded}
                modifiedByUsername={npc.modifiedByUsername}
                dateModified={npc.dateModified}
              />

              {/* Additional Details */}
              {(npc.description || npc.appearance || npc.personality || npc.background) && (
                <div className="space-y-3">
                  {npc.description && (
                    <div>
                      <Typography variant="body-sm" className="font-medium">
                        Description
                      </Typography>
                      <Typography variant="body-sm" color="secondary">
                        {npc.description}
                      </Typography>
                    </div>
                  )}
                  {npc.appearance && (
                    <div>
                      <Typography variant="body-sm" className="font-medium">
                        Appearance
                      </Typography>
                      <Typography variant="body-sm" color="secondary">
                        {npc.appearance}
                      </Typography>
                    </div>
                  )}
                  {npc.personality && (
                    <div>
                      <Typography variant="body-sm" className="font-medium">
                        Personality
                      </Typography>
                      <Typography variant="body-sm" color="secondary">
                        {npc.personality}
                      </Typography>
                    </div>
                  )}
                  {npc.background && (
                    <div>
                      <Typography variant="body-sm" className="font-medium">
                        Background
                      </Typography>
                      <Typography variant="body-sm" color="secondary">
                        {npc.background}
                      </Typography>
                    </div>
                  )}
                </div>
              )}

              {/* Related Quests */}
              {npc.connections.relatedQuests.length > 0 && (
                <div>
                  <Typography variant="h4" className="mb-2">
                    Related Quests
                  </Typography>
                  <div className="space-y-2">
                    {npc.connections.relatedQuests.map((questId) => {
                      const quest = getQuestById(questId);
                      return quest ? (
                        <Button
                          key={questId}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuestClick(questId)}
                          className="w-full"
                          centered={false}
                        >
                          <div className="flex items-start gap-2 text-left">
                            <Users 
                              size={16} 
                              className={clsx(
                                "mt-1",
                                `${themePrefix}-quest-status-${quest.status}`
                              )}
                            />
                            <div className="flex-1">
                              <Typography variant="body-sm" className="font-medium">
                                {quest.title}
                              </Typography>
                              <Typography variant="body-sm" color="secondary">
                                Status: {quest.status.charAt(0).toUpperCase() + quest.status.slice(1)}
                              </Typography>
                            </div>
                          </div>
                        </Button>
                      ) : null;
                    })}

                    
                  </div>
                </div>
              )}
          
              {/* Notes */}
              {npc.notes && npc.notes.length > 0 && (
                <div>
                  <Typography variant="h4" className="mb-2">
                    Notes
                  </Typography>
                  <div className="space-y-2">
                    {npc.notes.map((note, index) => (
                      <div
                        key={index}
                        className={clsx(
                          "p-3 rounded-lg space-y-1",
                          `${themePrefix}-note`
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className={clsx(`${themePrefix}-typography-secondary`)} />
                            <Typography variant="body-sm" color="secondary">
                              {new Date(note.date).toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})}
                            </Typography>
                          </div>
                        </div>
                        <Typography variant="body-sm">
                          {note.text}
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons - Only visible when authenticated */}
              {user && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {isAddingNote ? (
                    <div className="space-y-2 w-full">
                      <Input
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Enter note..."
                        isTextArea={true}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleAddNote}
                          disabled={!noteInput.trim()}
                          startIcon={<Save size={16} />}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsAddingNote(false);
                            setNoteInput('');
                          }}
                          startIcon={<X size={16} />}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingNote(true)}
                      startIcon={<PlusCircle size={16} />}
                    >
                      Add Note
                    </Button>
                  )}

                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    startIcon={<Edit size={16} />}
                  >
                    Edit
                  </Button>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    startIcon={<Trash2 size={16} />}
                    className={clsx(`${themePrefix}-button-ghost-danger`)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Delete Confirmation Dialog - Using shared component */}
      {isDeleteDialogOpen && createPortal (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
          itemName={npc.name}
          itemType="NPC"
        />,
        document.body
      )}
    </>
  );
};

export default NPCCard;