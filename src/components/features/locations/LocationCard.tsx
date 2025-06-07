import React, { useState, useEffect} from 'react';
import { Location, LocationNote, LocationType } from '../../../types/location';
import { useNPCs } from '../../../context/NPCContext';
import { useQuests } from '../../../context/QuestContext';
import { useAuth } from '../../../context/firebase';
import { useLocations } from '../../../context/LocationContext';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Button from '../../core/Button';
import Input from '../../core/Input';
import DeleteConfirmationDialog from '../../shared/DeleteConfirmationDialog';
import { useNavigation } from '../../../context/NavigationContext';
import AttributionInfo from '../../shared/AttributionInfo';
import clsx from 'clsx';
import { 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  Scroll,
  Users,
  Calendar,
  Tag,
  Building,
  Landmark,
  Mountain,
  Home,
  PlusCircle,
  Edit,
  X,
  Save,
  Trash
} from 'lucide-react';

interface LocationCardProps {
  location: Location;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const formatLocationType = (type: LocationType): string => {
  if (type === 'poi') return 'Point of Interest';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const LocationCard: React.FC<LocationCardProps> = ({ 
  location: initialLocation,
  hasChildren,
  isExpanded,
  onToggleExpand
}) => {
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const { getById: getNPCById } = useNPCs();
  const { getById: getQuestById } = useQuests();
  const { user } = useAuth();
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [location, setLocation] = useState(initialLocation);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { navigateToPage, createPath } = useNavigation();

  // Use the LocationContext instead of direct Firebase access
  const { locations, updateLocationNote, deleteLocation } = useLocations();

  // Handle editing the location
  const handleEdit = () => {
    navigateToPage(`/locations/edit/${location.id}`);
  };

  const handleDelete = async () => {
    try {
      await deleteLocation(location.id);
      // Explicitly close the dialog after successful deletion
      setIsDeleteDialogOpen(false);
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to delete location:', error);
      return Promise.reject(error);
    }
  };

  // Create delete message based on whether location has children
  const deleteMessage = hasChildren 
    ? `Are you sure you want to delete location "${location.name}"? This will also delete all sub-locations. This action cannot be undone.`
    : undefined; // Use default message if no children

  // Handle quick note adding
  const handleAddNote = async () => {
    if (!noteInput.trim()) return;

    const newNote: LocationNote = {
      date: new Date().toISOString().split('T')[0],
      text: noteInput.trim()
    };

    try {
      await updateLocationNote(location.id, newNote);
      
      // Update local state immediately
      setLocation(prev => ({
        ...prev,
        notes: [...(prev.notes || []), newNote]
      }));
      
      // Reset form
      setNoteInput('');
      setIsAddingNote(false);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  // Map location types to icons with theme-specific colors
  const getTypeIcon = (type: LocationType) => {
    switch(type) {
      case 'region':
        return <Mountain className="location-type-region" />;
      case 'city':
        return <Building className="location-type-city" />;
      case 'town':
        return <Home className="location-type-town" />;
      case 'village':
        return <Home className="location-type-village" />;
      case 'dungeon':
        return <Building className="location-type-dungeon" />;
      case 'landmark':
        return <Landmark className="location-type-landmark" />;
      case 'building':
        return <Building className="location-type-building" />;
      case 'poi':
        return <MapPin className="location-type-poi" />;
      default:
        return <MapPin className="typography-secondary" />;
    }
  };

  // Render notes section
  const renderNotes = () => {
    if (!location.notes || location.notes.length === 0) {
      return null;
    }

    return (
      <div>
        <Typography variant="h4" className="mb-2">
          Notes
        </Typography>
        <div className="space-y-2">
          {location.notes.map((note, index) => (
            <div
              key={`${note.date}-${index}`}
              className="p-3 rounded-lg space-y-1 note"
            >
              <div className="flex items-center gap-2">
                <Calendar size={14} className="typography-secondary" />
                <Typography variant="body-sm" color="secondary">
                  {new Date(note.date).toLocaleDateString('en-uk', { year: 'numeric', day: '2-digit', month: '2-digit'})}
                </Typography>
              </div>
              <Typography variant="body-sm">
                {note.text}
              </Typography>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Quick Note Adding Form
  const renderNoteForm = () => {
    if (!user) return null;

    return (
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
    );
  };

  // Fetch NPC data at component level
  const connectedNPCs = location.connectedNPCs 
    ? location.connectedNPCs
        .map(id => getNPCById(id))
        .filter((npc): npc is NonNullable<ReturnType<typeof getNPCById>> => npc !== undefined)
    : [];

  // Handle NPC click
  const handleNPCClick = (npcId: string) => {
    navigateToPage(createPath('/npcs', {}, { highlight: npcId }));
  };

  // Handle Quest click
  const handleQuestClick = (questId: string) => {
    navigateToPage(createPath('/quests', {}, { highlight: questId }));
  };

  // Update local state when database data changes
  useEffect(() => {
    const updatedLocation = locations.find(loc => loc.id === initialLocation.id);
    if (updatedLocation) {
      setLocation(updatedLocation);
    }
  }, [locations, initialLocation.id]);

  return (
    <>
      <Card className={clsx(
        `location-card`,
        `location-card-${location.status}`
        )}>
        <Card.Content className="space-y-4">
          <div>
            {/* Location Header */}
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {getTypeIcon(location.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 justify-between">
                  <Typography variant="h4">
                    {location.name}
                  </Typography>

                  {/* Location content expand/collapse */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsContentExpanded(!isContentExpanded)}
                    className="ml-2"
                    startIcon={isContentExpanded ? <ChevronUp /> : <ChevronDown />}
                  >
                    {isContentExpanded ? 'Collapse' : 'Expand'}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Typography variant="body-sm" color="secondary">
                {formatLocationType(location.type)}
              </Typography>
            </div>

            {/* Description */}
            <Typography color="secondary">
              {location.description}
            </Typography>

            {/* Basic Info */}
            <div className="flex flex-wrap gap-4">
              {connectedNPCs.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users size={16} className="typography-secondary" />
                  <Typography variant="body-sm" color="secondary">
                    {connectedNPCs.length} NPCs
                  </Typography>
                </div>
              )}
              {location.relatedQuests && location.relatedQuests.length > 0 && (
                <div className="flex items-center gap-2">
                  <Scroll size={16} className="typography-secondary" />
                  <Typography variant="body-sm" color="secondary">
                    {location.relatedQuests.length} Quests
                  </Typography>
                </div>
              )}
            </div>

            {/* Expanded Content */}
            {isContentExpanded && (
              <div className="pt-4 space-y-4 border-t divider">
                {/* Creator and modifier attribution */}
                <AttributionInfo
                  item={location}
                />

                {/* Notable Features */}
                {location.features && location.features.length > 0 && (
                  <div>
                    <Typography variant="body" className="font-medium mb-2">
                      Notable Features
                    </Typography>
                    <ul className="space-y-1">
                      {location.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Landmark size={16} className="typography-secondary mt-1" />
                          <Typography variant="body-sm" color="secondary">
                            {feature}
                          </Typography>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Related Quests */}
                {location.relatedQuests && location.relatedQuests.length > 0 && (
                  <div>
                    <Typography variant="body" className="font-medium mb-2">
                      Related Quests
                    </Typography>
                    <div className="space-y-2">
                      {location.relatedQuests.map((questId) => {
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
                              <Scroll 
                                size={16} 
                                className={clsx("mt-1", `quest-status-${quest.status}`)}
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

                {/* Connected NPCs */}
                {connectedNPCs.length > 0 && (
                  <div>
                    <Typography variant="body" className="font-medium mb-2">
                      Connected NPCs
                    </Typography>
                    <div className="space-y-2">
                      {connectedNPCs.map((npc) => (
                        <Button
                          key={npc.id}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNPCClick(npc.id)}
                          className="w-full"
                          centered={false}
                        >
                          <div className="flex items-start gap-2 text-left">
                            <Users 
                              size={16} 
                              className={clsx("mt-1", `npc-relationship-${npc.relationship}`)}
                            />
                            <div className="flex-1">
                              <Typography variant="body-sm" className="font-medium">
                                {npc.name}
                                {npc.title && (
                                  <span className="typography-secondary ml-1">
                                    - {npc.title}
                                  </span>
                                )}
                              </Typography>
                              {npc.location && (
                                <Typography variant="body-sm" color="secondary">
                                  {npc.location}
                                </Typography>
                              )}
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {location.tags && location.tags.length > 0 && (
                  <div>
                    <Typography variant="body" className="font-medium mb-2">
                      Tags
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                      {location.tags.map((tag, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 px-2 py-1 rounded-full tag"
                        >
                          <Tag size={12} className="typography-secondary" />
                          <Typography variant="body-sm" color="secondary">
                            {tag}
                          </Typography>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {renderNotes()}

                {/* Actions Section with vertical layout matching rumor card */}
                <div className="flex flex-col gap-4 mt-4">
                  {/* Note Adding Form/Button at the top */}
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
                        className="text-primary-600"
                      >
                        Add Note
                      </Button>
                    )}
                  </div>

                  {/* Other actions below in a horizontal layout */}
                  {user && (
                    <div className="flex flex-wrap gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEdit}
                        startIcon={<Edit size={16} />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        startIcon={<Trash size={16} />}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              {/* Children expand/collapse */}
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleExpand}
                  className="ml-2"
                  startIcon={isExpanded ? <ChevronUp /> : <ChevronDown />}
                >
                  {isExpanded ? 'Collapse Sub Locations' : 'Expand Sub Locations'}
                </Button>
              )}
            </div>    
          </div>
        </Card.Content>
      </Card>
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          itemName={location.name}
          itemType="Location"
          message={deleteMessage}
        />
    </>
  );
};

export default LocationCard;