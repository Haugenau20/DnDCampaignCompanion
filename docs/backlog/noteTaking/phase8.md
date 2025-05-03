# Phase 8: Campaign Integration


# Phase 8: Campaign Integration

## Integration Overview

This phase connects the note-taking system with existing campaign elements, establishing relationships between notes and NPCs, locations, quests, and rumors.

## Implementation Steps

### 1. Add Note References to Campaign Elements

#### Update Existing Entity Types

Add note references to `src/types/npc.ts`:
```typescript
// Update NPC interface
export interface NPC extends BaseContent {
  // ... existing fields
  relatedNotes: string[]; // Array of note IDs
}
```

Add to `src/types/location.ts`:
```typescript
// Update Location interface
export interface Location extends BaseContent {
  // ... existing fields
  relatedNotes: string[]; // Array of note IDs
}
```

Add to `src/types/quest.ts`:
```typescript
// Update Quest interface
export interface Quest extends BaseContent {
  // ... existing fields
  relatedNotes: string[]; // Array of note IDs
}
```

### 2. Create Note-Entity Relationship Manager
Path: `src/utils/note-relationships.ts`

```typescript
// src/utils/note-relationships.ts
import firebaseServices from '../services/firebase';
import { EntityType } from '../types/note';

interface EntityReference {
  id: string;
  type: EntityType;
  noteId: string;
}

/**
 * Links a note to an entity (NPC, location, etc.)
 */
export const linkNoteToEntity = async (
  noteId: string,
  entityId: string,
  entityType: EntityType
): Promise<void> => {
  let collection: string;
  let fieldName: string = 'relatedNotes';
  
  switch (entityType) {
    case 'npc':
      collection = 'npcs';
      break;
    case 'location':
      collection = 'locations';
      break;
    case 'quest':
      collection = 'quests';
      break;
    case 'rumor':
      collection = 'rumors';
      break;
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
  
  // Get current entity
  const entity = await firebaseServices.document.getDocument(collection, entityId);
  if (!entity) throw new Error('Entity not found');
  
  // Add note ID to entity if not already present
  const currentNotes = entity[fieldName] || [];
  if (!currentNotes.includes(noteId)) {
    const updatedNotes = [...currentNotes, noteId];
    await firebaseServices.document.updateDocument(collection, entityId, {
      [fieldName]: updatedNotes
    });
  }
};

/**
 * Removes link between note and entity
 */
export const unlinkNoteFromEntity = async (
  noteId: string,
  entityId: string,
  entityType: EntityType
): Promise<void> => {
  let collection: string;
  let fieldName: string = 'relatedNotes';
  
  switch (entityType) {
    case 'npc':
      collection = 'npcs';
      break;
    case 'location':
      collection = 'locations';
      break;
    case 'quest':
      collection = 'quests';
      break;
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
  
  // Get current entity
  const entity = await firebaseServices.document.getDocument(collection, entityId);
  if (!entity) return;
  
  // Remove note ID from entity
  const currentNotes = entity[fieldName] || [];
  const updatedNotes = currentNotes.filter((id: string) => id !== noteId);
  
  await firebaseServices.document.updateDocument(collection, entityId, {
    [fieldName]: updatedNotes
  });
};

/**
 * Gets all entities related to a note
 */
export const getEntitiesForNote = async (noteId: string): Promise<EntityReference[]> => {
  const references: EntityReference[] = [];
  
  const collectionsToCheck = [
    { collection: 'npcs', type: 'npc' as EntityType },
    { collection: 'locations', type: 'location' as EntityType },
    { collection: 'quests', type: 'quest' as EntityType },
    { collection: 'rumors', type: 'rumor' as EntityType }
  ];
  
  for (const { collection, type } of collectionsToCheck) {
    const entities = await firebaseServices.document.queryDocuments(
      collection,
      'relatedNotes',
      '==',
      noteId
    );
    
    entities.forEach(entity => {
      references.push({
        id: entity.id,
        type,
        noteId
      });
    });
  }
  
  return references;
};
```

### 3. Create Note Reference Component
Path: `src/components/features/notes/NoteReferences.tsx`

```typescript
// src/components/features/notes/NoteReferences.tsx
import React, { useState, useEffect } from 'react';
import { EntityReference } from '../../../utils/note-relationships';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Button from '../../core/Button';
import { 
  Users, 
  MapPin, 
  Scroll, 
  MessageSquare,
  ChevronRight,
  Trash2 
} from 'lucide-react';
import { useNavigation } from '../../../context/NavigationContext';
import { getEntitiesForNote, unlinkNoteFromEntity } from '../../../utils/note-relationships';

const entityIcons = {
  npc: Users,
  location: MapPin,
  quest: Scroll,
  rumor: MessageSquare,
  item: Package
};

interface NoteReferencesProps {
  noteId: string;
}

const NoteReferences: React.FC<NoteReferencesProps> = ({ noteId }) => {
  const [references, setReferences] = useState<EntityReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { navigateToPage } = useNavigation();

  useEffect(() => {
    loadReferences();
  }, [noteId]);

  const loadReferences = async () => {
    try {
      const refs = await getEntitiesForNote(noteId);
      setReferences(refs);
    } catch (error) {
      console.error('Failed to load references:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async (entityId: string, entityType: string) => {
    try {
      await unlinkNoteFromEntity(noteId, entityId, entityType as EntityType);
      setReferences(prev => prev.filter(ref => ref.id !== entityId));
    } catch (error) {
      console.error('Failed to unlink reference:', error);
    }
  };

  const navigateToEntity = (reference: EntityReference) => {
    const paths = {
      npc: '/npcs',
      location: '/locations',
      quest: '/quests',
      rumor: '/rumors',
      item: '/items'
    };
    
    const path = paths[reference.type];
    if (path) {
      navigateToPage(`${path}?highlight=${reference.id}`);
    }
  };

  return (
    <Card>
      <Card.Content>
        <Typography variant="h4" className="mb-4">
          Related Campaign Elements
        </Typography>
        
        {isLoading ? (
          <Typography color="secondary">Loading references...</Typography>
        ) : references.length > 0 ? (
          <div className="space-y-2">
            {references.map(reference => {
              const Icon = entityIcons[reference.type];
              return (
                <div 
                  key={reference.id}
                  className="flex items-center justify-between p-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => navigateToEntity(reference)}
                  >
                    <Icon className="w-5 h-5 primary" />
                    <div>
                      <Typography variant="body" className="font-medium">
                        {reference.id}
                      </Typography>
                      <Typography variant="body-sm" color="secondary">
                        {reference.type.charAt(0).toUpperCase() + reference.type.slice(1)}
                      </Typography>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToEntity(reference)}
                      startIcon={<ChevronRight />}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlink(reference.id, reference.type)}
                      startIcon={<Trash2 className="delete-button" />}
                    >
                      Unlink
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Typography color="secondary">
            No related campaign elements yet
          </Typography>
        )}
      </Card.Content>
    </Card>
  );
};

export default NoteReferences;
```

### 4. Update Entity Converter to Create Relationships
Modify `src/context/NoteContext.tsx`:

```typescript
// In convertEntity method, add relationship linking
const convertEntity = useCallback(async (
  noteId: string,
  entityId: string,
  type: EntityType
): Promise<string> => {
  const note = getNoteById(noteId);
  if (!note) throw new Error('Note not found');
  
  const entity = note.extractedEntities.find(e => e.id === entityId);
  if (!entity) throw new Error('Entity not found');
  
  let createdId: string;
  
  // Create entity...
  // ... (existing creation code)
  
  // Link note to entity
  await linkNoteToEntity(noteId, createdId, type);
  
  // Update entity with converted status
  const updatedEntities = note.extractedEntities.map(e =>
    e.id === entityId ? { ...e, isConverted: true, convertedToId: createdId } : e
  );
  
  await updateData(noteId, {
    ...note,
    extractedEntities: updatedEntities
  });
  
  return createdId;
}, [getNoteById, updateData, user]);
```

### 5. Update Entity Cards to Show Related Notes
Path: `src/components/features/npcs/NPCCard.tsx` (and similar for other entity types):

```typescript
// Add to NoteReference component
import { useNotes } from '../../../context/NoteContext';

// In NPCCard component:
const { getNotesByEntity } = useNotes();

// Add method to get related notes
const getRelatedNotes = useCallback(() => {
  if (!npc.relatedNotes?.length) return [];
  
  return npc.relatedNotes
    .map(noteId => notes.find(n => n.id === noteId))
    .filter(Boolean);
}, [npc.relatedNotes, notes]);

// Add section to render related notes
{relatedNotes.length > 0 && (
  <div>
    <Typography variant="h4" className="mb-2">
      Related Session Notes
    </Typography>
    <div className="space-y-2">
      {relatedNotes.map(note => (
        <Button
          key={note.id}
          variant="ghost"
          size="sm"
          onClick={() => navigateToPage(`/notes/${note.id}`)}
          className="w-full"
          centered={false}
        >
          <div className="flex items-center gap-2 text-left">
            <BookOpen size={16} className="status-general" />
            <div className="flex-1">
              <Typography variant="body-sm" className="font-medium">
                Session {note.sessionNumber}: {note.title}
              </Typography>
              <Typography variant="body-sm" color="secondary">
                {new Date(note.sessionDate).toLocaleDateString()}
              </Typography>
            </div>
          </div>
        </Button>
      ))}
    </div>
  </div>
)}
```

### 6. Create Session Timeline View
Path: `src/components/features/notes/SessionTimeline.tsx`

```typescript
// src/components/features/notes/SessionTimeline.tsx
import React from 'react';
import { SessionNote } from '../../../types/note';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Button from '../../core/Button';
import { useNavigation } from '../../../context/NavigationContext';
import { useNotes } from '../../../context/NoteContext';
import { Calendar, Clock, ChevronRight } from 'lucide-react';

const SessionTimeline: React.FC = () => {
  const { notes } = useNotes();
  const { navigateToPage } = useNavigation();

  const groupedNotes = notes.reduce((groups, note) => {
    const date = new Date(note.sessionDate);
    const key = date.toLocaleDateString('en-GB', { 
      year: 'numeric', 
      month: 'long' 
    });
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(note);
    return groups;
  }, {} as Record<string, SessionNote[]>);

  return (
    <div className="space-y-6">
      <Typography variant="h3">Session Timeline</Typography>
      
      {Object.entries(groupedNotes).map(([month, monthNotes]) => (
        <div key={month}>
          <Typography variant="h4" className="mb-4">
            {month}
          </Typography>
          <div className="space-y-3">
            {monthNotes.map(note => (
              <Card 
                key={note.id} 
                hoverable 
                onClick={() => navigateToPage(`/notes/${note.id}`)}
              >
                <Card.Content className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Calendar className="w-5 h-5 primary" />
                      <div>
                        <Typography variant="body" className="font-medium">
                          Session {note.sessionNumber}: {note.title}
                        </Typography>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 typography-secondary" />
                            <Typography variant="body-sm" color="secondary">
                              {new Date(note.sessionDate).toLocaleTimeString()}
                            </Typography>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 typography-secondary" />
                            <Typography variant="body-sm" color="secondary">
                              {note.attendingPlayers.length} players
                            </Typography>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 typography-secondary" />
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SessionTimeline;
```

### Next Steps
Proceed to Phase 9: Testing & Validation