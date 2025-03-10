import { useState, useEffect, useCallback } from 'react';
import { Location, LocationNote, LocationType } from '../../../types/location';
import { useNPCs } from '../../../context/NPCContext';
import { useQuests } from '../../../context/QuestContext';
import { useFirebase } from '../../../context/FirebaseContext';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Button from '../../core/Button';
import Input from '../../core/Input';
import { useNavigation } from '../../../context/NavigationContext';
import { useTheme } from '../../../context/ThemeContext';
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
  Eye,
  EyeOff,
  Building,
  Landmark,
  Mountain,
  Home,
  MapPinOff,
  PlusCircle,
  Edit,
  X,
  Save
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
  const { getNPCById } = useNPCs();
  const { getQuestById } = useQuests();
  const { user } = useFirebase();
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [location, setLocation] = useState(initialLocation);
  const { navigateToPage, createPath } = useNavigation();
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Use Firebase hook to get real-time data
  const { data: locations, updateData } = useFirebaseData<Location>({
    collection: 'locations'
  });

  // Handle editing the location
  const handleEdit = () => {
    navigateToPage(`/locations/edit/${location.id}`);
  };

  // Handle quick note adding
  const handleAddNote = async () => {
    if (!noteInput.trim()) return;

    const newNote: LocationNote = {
      date: new Date().toISOString().split('T')[0],
      text: noteInput.trim()
    };

    try {
      // Create updated location with new note
      const updatedLocation = {
        ...location,
        notes: [...(location.notes || []), newNote]
      };

      // Update the database
      await updateData(location.id, updatedLocation);
      
      // Update local state immediately
      setLocation(updatedLocation);
      
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
        return <Mountain className={clsx(`${themePrefix}-location-type-region`)} />;
      case 'city':
        return <Building className={clsx(`${themePrefix}-location-type-city`)} />;
      case 'town':
        return <Home className={clsx(`${themePrefix}-location-type-town`)} />;
      case 'village':
        return <Home className={clsx(`${themePrefix}-location-type-village`)} />;
      case 'dungeon':
        return <Building className={clsx(`${themePrefix}-location-type-dungeon`)} />;
      case 'landmark':
        return <Landmark className={clsx(`${themePrefix}-location-type-landmark`)} />;
      case 'building':
        return <Building className={clsx(`${themePrefix}-location-type-building`)} />;
      case 'poi':
        return <MapPin className={clsx(`${themePrefix}-location-type-poi`)} />;
      default:
        return <MapPin className={clsx(`${themePrefix}-typography-secondary`)} />;
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
              className={clsx(
                "p-3 rounded-lg space-y-1",
                `${themePrefix}-note`
              )}
            >
              <div className="flex items-center gap-2">
                <Calendar size={14} className={clsx(`${themePrefix}-typography-secondary`)} />
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

  // Get status icon
  const getStatusIcon = () => {
    switch (location.status) {
      case 'explored':
        return <Eye className={clsx(`${themePrefix}-location-status-explored`)} />;
      case 'known':
        return <EyeOff className={clsx(`${themePrefix}-location-status-known`)} />;
      case 'visited':
        return <MapPin className={clsx(`${themePrefix}-location-status-visited`)} />;
      default:
        return <MapPinOff className={clsx(`${themePrefix}-typography-secondary`)} />;
    }
  };

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
    <Card className={clsx(
      `${themePrefix}-location-card`,
      `${themePrefix}-location-card-${location.status}`
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
                <Users size={16} className={clsx(`${themePrefix}-typography-secondary`)} />
                <Typography variant="body-sm" color="secondary">
                  {connectedNPCs.length} NPCs
                </Typography>
              </div>
            )}
            {location.relatedQuests && location.relatedQuests.length > 0 && (
              <div className="flex items-center gap-2">
                <Scroll size={16} className={clsx(`${themePrefix}-typography-secondary`)} />
                <Typography variant="body-sm" color="secondary">
                  {location.relatedQuests.length} Quests
                </Typography>
              </div>
            )}
          </div>

          {/* Expanded Content */}
          {isContentExpanded && (
            <div className={clsx("pt-4 space-y-4 border-t", `${themePrefix}-divider`)}>
              {/* Creator and modifier attribution */}
              <AttributionInfo
                createdByUsername={location.createdByUsername}
                dateAdded={location.dateAdded}
                modifiedByUsername={location.modifiedByUsername}
                dateModified={location.dateModified}
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
                        <Landmark size={16} className={clsx(`${themePrefix}-typography-secondary`, "mt-1")} />
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
                            className={clsx(
                              "mt-1",
                              `${themePrefix}-npc-relationship-${npc.relationship}`
                            )}
                          />
                          <div className="flex-1">
                            <Typography variant="body-sm" className="font-medium">
                              {npc.name}
                              {npc.title && (
                                <span className={clsx(`${themePrefix}-typography-secondary`, "ml-1")}>
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
                        className={clsx(
                          "flex items-center gap-1 px-2 py-1 rounded-full",
                          `${themePrefix}-tag`
                        )}
                      >
                        <Tag size={12} className={clsx(`${themePrefix}-typography-secondary`)} />
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

              <div className="flex gap-4">
                {/* Note Adding Form */}
                {renderNoteForm()}

                {user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    startIcon={<Edit size={16} />}
                  >
                    Edit Location
                  </Button>
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
  );
};

export default LocationCard;