// src/components/features/rumors/RumorCard.tsx - Updated attribution display
import React, { useState } from 'react';
import { Rumor, RumorStatus } from '../../../types/rumor';
import Card from '../../core/Card';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import Input from '../../core/Input';
import { useAuth } from '../../../context/firebase';
import { useRumors } from '../../../context/RumorContext';
import { useNavigation } from '../../../hooks/useNavigation';
import { useNPCs } from '../../../context/NPCContext';
import { useLocations } from '../../../context/LocationContext';
import { useTheme } from '../../../context/ThemeContext';
import AttributionInfo from '../../shared/AttributionInfo';
import DeleteConfirmationDialog from '../../shared/DeleteConfirmationDialog';
import clsx from 'clsx';
import { 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  Users,
  MapPin,
  MessageSquare,
  Edit,
  Trash,
  PlusCircle,
  Save,
  X
} from 'lucide-react';

interface RumorCardProps {
  rumor: Rumor;
  onSelect?: (id: string, selected: boolean) => void;
  selected?: boolean;
  selectionMode?: boolean;
}

const RumorCard: React.FC<RumorCardProps> = ({ 
  rumor, 
  onSelect, 
  selected = false,
  selectionMode = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const { user } = useAuth();
  const { updateRumorNote, updateRumorStatus, deleteRumor } = useRumors();
  const { navigateToPage, createPath } = useNavigation();
  const { getNPCById } = useNPCs();
  const { getLocationById } = useLocations();
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Format source type for display
  const formatSourceType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Handle NPC click - navigate to the NPC's page
  const handleNPCClick = (npcId: string) => {
    navigateToPage(createPath('/npcs', {}, { highlight: npcId }));
  };

  // Handle location click - navigate to the location's page
  const handleLocationClick = (locationId: string) => {
    navigateToPage(createPath('/locations', {}, { highlight: locationId }));
  };

  // Handle status change
  const handleStatusChange = async (status: RumorStatus) => {
    try {
      await updateRumorStatus(rumor.id, status);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Handle adding a note
  const handleAddNote = async () => {
    if (!noteInput.trim()) return;

    try {
      await updateRumorNote(rumor.id, {
        id: crypto.randomUUID(),
        content: noteInput.trim(),
        dateAdded: '',  // Will be set in context
        addedBy: '',    // Will be set in context
        addedByUsername: '' // Will be set in context
      });
      
      // Reset form
      setNoteInput('');
      setIsAddingNote(false);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  // Handle convert to quest
  const handleConvertToQuest = () => {
    navigateToPage(createPath('/quests/create', {}, { fromRumor: rumor.id }));
  };

  // Handle edit rumor
  const handleEdit = () => {
    navigateToPage(`/rumors/edit/${rumor.id}`);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  // Handle selection
  const handleSelectChange = () => {
    if (onSelect) {
      onSelect(rumor.id, !selected);
    }
  };

  // Ensure relatedNPCs is always an array
  const relatedNPCs = Array.isArray(rumor.relatedNPCs) ? rumor.relatedNPCs : [];
  
  // Ensure relatedLocations is always an array
  const relatedLocations = Array.isArray(rumor.relatedLocations) ? rumor.relatedLocations : [];

  // Get NPC names instead of IDs
  const relatedNPCsWithNames = relatedNPCs.map(npcId => {
    const npc = getNPCById(npcId);
    return { id: npcId, name: npc?.name || npcId };
  });

  // Get Location names instead of IDs
  const relatedLocationsWithNames = relatedLocations.map(locationId => {
    const location = getLocationById(locationId);
    return { id: locationId, name: location?.name || locationId };
  });

  return (
    <Card className={clsx(
      `${themePrefix}-rumor-card`,
      `${themePrefix}-rumor-card-${rumor.status}`,
      selectionMode && 'border-l-0'
    )}>
      <Card.Content className="space-y-4">
        {/* Rumor Header */}
        <div className="flex items-start gap-4">
          {/* Selection checkbox (only in selection mode) */}
          {selectionMode && (
            <input 
              type="checkbox" 
              checked={selected}
              onChange={handleSelectChange}
              className="mt-1.5"
            />
          )}
          
          {/* Status indicator and title */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Typography variant="h3">
                  {rumor.title}
                </Typography>
              </div>
              
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
            
            {/* Source information */}
            <div className="flex items-center gap-2 mt-1">
              <Typography color="secondary">
                From: {rumor.sourceName} ({formatSourceType(rumor.sourceType)})
              </Typography>
            </div>

            {/* Location display (if present) */}
            {rumor.location && (
              <div className="flex items-center gap-2 mt-1">
                <MapPin size={14} className={`${themePrefix}-typography-secondary`} />
                <Typography variant="body-sm" color="secondary">
                  Location: {rumor.location}
                </Typography>
              </div>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="pt-4 space-y-4">

            {/* Creator and modifier attribution */}
            <AttributionInfo
              createdByUsername={rumor.createdByUsername}
              dateAdded={rumor.dateAdded}
              modifiedByUsername={rumor.modifiedByUsername}
              dateModified={rumor.dateModified}
            />
            
            {/* Rumor Content */}
            <Typography color="secondary">
              {rumor.content}
            </Typography>

            {/* Related NPCs */}
            {relatedNPCsWithNames.length > 0 && (
              <div>
                <Typography variant="h4" className="mb-2">
                  Related NPCs
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {relatedNPCsWithNames.map(({id, name}) => (
                    <Button
                      key={id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNPCClick(id)}
                      startIcon={<Users size={16} />}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Related Locations */}
            {relatedLocationsWithNames.length > 0 && (
              <div>
                <Typography variant="h4" className="mb-2">
                  Related Locations
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {relatedLocationsWithNames.map(({id, name}) => (
                    <Button
                      key={id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLocationClick(id)}
                      startIcon={<MapPin size={16} />}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {rumor.notes && rumor.notes.length > 0 && (
              <div>
                <Typography variant="h4" className="mb-2">
                  Notes
                </Typography>
                <div className="space-y-2">
                  {rumor.notes.map((note) => (
                    <div
                      key={note.id}
                      className={clsx(
                        "p-3 rounded-lg space-y-1",
                        `${themePrefix}-note`
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className={`${themePrefix}-typography-secondary`} />
                        <Typography variant="body-sm" color="secondary">
                          {new Date(note.dateAdded).toLocaleDateString()} by {note.addedByUsername}
                        </Typography>
                      </div>
                      <Typography variant="body-sm">
                        {note.content}
                      </Typography>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Note Adding Form - Only visible when authenticated */}
            {user && (
              <div>
                {isAddingNote ? (
                  <div className="space-y-2">
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
              </div>
            )}

            {/* Action Buttons */}
            {user && (
              <div className="flex gap-3 pt-2">
                {/* Edit Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  startIcon={<Edit size={16} />}
                >
                  Edit
                </Button>

                {/* Convert to Quest Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleConvertToQuest}
                  startIcon={<MessageSquare size={16} />}
                >
                  Convert to Quest
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteClick}
                  startIcon={<Trash size={16} />}
                >
                  Delete
                </Button>

                {/* Status Update Buttons */}
                <div className="flex-1 flex justify-end gap-2">
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusChange('confirmed')}
                    startIcon={<CheckCircle size={16} className={`${themePrefix}-rumor-status-confirmed`} />}
                    disabled={rumor.status === 'confirmed'}
                  >
                    Confirm
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusChange('unconfirmed')}
                    startIcon={<HelpCircle size={16} className={`${themePrefix}-rumor-status-unconfirmed`} />}
                    disabled={rumor.status === 'unconfirmed'}
                  >
                    Unconfirm
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusChange('false')}
                    startIcon={<XCircle size={16} className={`${themePrefix}-rumor-status-false`} />}
                    disabled={rumor.status === 'false'}
                  >
                    Mark False
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card.Content>
      <DeleteConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={() => deleteRumor(rumor.id)}
        itemName={rumor.title}
        itemType="Rumor"
      />
    </Card>
  );
};

export default RumorCard;