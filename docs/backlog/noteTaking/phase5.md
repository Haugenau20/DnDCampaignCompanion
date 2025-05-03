# Phase 5: UI Component Development


# Phase 5: UI Component Development

## Component Architecture

### Component Structure
```
src/components/features/notes/
├── NotePage.tsx
├── NoteEditor.tsx
├── NotesList.tsx
├── NoteCard.tsx
├── EntityExtractor.tsx
├── EntityCard.tsx
└── SessionInfo.tsx
```

## Component Implementation

### 1. NoteEditor Component
Path: `src/components/features/notes/NoteEditor.tsx`

```typescript
// src/components/features/notes/NoteEditor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { SessionNote } from '../../../types/note';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import Button from '../../core/Button';
import { Save, ChevronRight, PlayCircle } from 'lucide-react';
import { useNotes } from '../../../context/NoteContext';
import { debounce } from 'lodash';

interface NoteEditorProps {
  noteId: string;
  readOnly?: boolean;
  onExtractEntities?: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ 
  noteId, 
  readOnly = false,
  onExtractEntities 
}) => {
  const { getNoteById, updateNoteContent } = useNotes();
  const [note, setNote] = useState<SessionNote | undefined>();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const noteData = getNoteById(noteId);
    setNote(noteData);
    setContent(noteData?.content || '');
  }, [noteId, getNoteById]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (noteId: string, content: string) => {
      try {
        setIsSaving(true);
        await updateNoteContent(noteId, content);
      } catch (error) {
        console.error('Failed to save note:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [updateNoteContent]
  );

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    if (!readOnly && note) {
      debouncedSave(note.id, newContent);
    }
  };

  return (
    <div className="space-y-4">
      {/* Note header */}
      <div className="flex justify-between items-center">
        <Typography variant="h3">
          {note?.title || 'New Session'}
        </Typography>
        <Button
          onClick={onExtractEntities}
          startIcon={<PlayCircle />}
          variant="outline"
          size="sm"
        >
          Extract Entities
        </Button>
      </div>

      {/* Content editor */}
      <Input
        value={content}
        onChange={handleContentChange}
        isTextArea={true}
        rows={15}
        placeholder="Write your session notes here..."
        disabled={readOnly}
        className="font-mono"
      />

      {/* Status bar */}
      <div className="flex justify-between items-center">
        <Typography variant="body-sm" color="secondary">
          {isSaving ? 'Saving...' : 'All changes saved'}
        </Typography>
        {note?.status === 'active' && (
          <Typography variant="body-sm" color="primary">
            Active Session
          </Typography>
        )}
      </div>
    </div>
  );
};

export default NoteEditor;
```

### 2. EntityExtractor Component
Path: `src/components/features/notes/EntityExtractor.tsx`

```typescript
// src/components/features/notes/EntityExtractor.tsx
import React, { useState } from 'react';
import { ExtractedEntity } from '../../../types/note';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import Card from '../../core/Card';
import EntityCard from './EntityCard';
import { useEntityExtractor } from '../../../hooks/useEntityExtractor';
import { PlayCircle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface EntityExtractorProps {
  noteId: string;
  onEntityConverted?: (entityId: string, createdId: string) => void;
}

const EntityExtractor: React.FC<EntityExtractorProps> = ({ 
  noteId, 
  onEntityConverted 
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { extractWithOpenAI } = useEntityExtractor();

  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    try {
      const entities = await extractWithOpenAI(noteId);
      setExtractedEntities(entities);
    } catch (err) {
      setError('Failed to extract entities');
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Card>
      <Card.Content>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <Typography variant="h4">Entity Extraction</Typography>
            <Button
              onClick={handleExtract}
              startIcon={isExtracting ? <Loader2 className="animate-spin" /> : <PlayCircle />}
              disabled={isExtracting}
            >
              {isExtracting ? 'Extracting...' : 'Extract Entities'}
            </Button>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded bg-status-failed/10">
              <AlertCircle className="status-failed" />
              <Typography variant="body-sm" color="error">
                {error}
              </Typography>
            </div>
          )}

          {/* Extracted entities */}
          {extractedEntities.length > 0 ? (
            <div className="space-y-3">
              <Typography variant="h5">Extracted Entities</Typography>
              <div className="grid gap-3">
                {extractedEntities.map(entity => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    noteId={noteId}
                    onConverted={onEntityConverted}
                  />
                ))}
              </div>
            </div>
          ) : (
            isExtracting && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin primary" />
                <Typography color="secondary">
                  Analyzing session notes...
                </Typography>
              </div>
            )
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default EntityExtractor;
```

### 3. EntityCard Component
Path: `src/components/features/notes/EntityCard.tsx`

```typescript
// src/components/features/notes/EntityCard.tsx
import React, { useState } from 'react';
import { ExtractedEntity, EntityType } from '../../../types/note';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import Card from '../../core/Card';
import { useNotes } from '../../../context/NoteContext';
import { 
  Check, 
  Users, 
  MapPin, 
  Scroll, 
  Package,
  MessageSquare,
  Loader2
} from 'lucide-react';

interface EntityCardProps {
  entity: ExtractedEntity;
  noteId: string;
  onConverted?: (entityId: string, createdId: string) => void;
}

const entityIcons = {
  npc: Users,
  location: MapPin,
  quest: Scroll,
  item: Package,
  rumor: MessageSquare
};

const EntityCard: React.FC<EntityCardProps> = ({ 
  entity, 
  noteId, 
  onConverted 
}) => {
  const { convertEntity } = useNotes();
  const [isConverting, setIsConverting] = useState(false);
  const Icon = entityIcons[entity.type];

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const createdId = await convertEntity(noteId, entity.id, entity.type);
      onConverted?.(entity.id, createdId);
    } catch (error) {
      console.error('Failed to convert entity:', error);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Card className={`${entity.isConverted ? 'border-green-500' : ''}`}>
      <Card.Content className="p-4">
        <div className="flex items-center gap-4">
          <Icon className="w-5 h-5 primary" />
          <div className="flex-1">
            <Typography variant="body" className="font-medium">
              {entity.text}
            </Typography>
            <Typography variant="body-sm" color="secondary">
              Type: {entity.type} • Confidence: {(entity.confidence * 100).toFixed(0)}%
            </Typography>
          </div>
          {entity.isConverted ? (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 status-success" />
              <Typography variant="body-sm" color="success">
                Converted
              </Typography>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={handleConvert}
              disabled={isConverting}
              startIcon={isConverting ? <Loader2 className="animate-spin" /> : undefined}
            >
              {isConverting ? 'Converting...' : 'Convert'}
            </Button>
          )}
        </div>
      </Card.Content>
    </Card>
  );
};

export default EntityCard;
```

### 4. NotesList Component
Path: `src/components/features/notes/NotesList.tsx`

```typescript
// src/components/features/notes/NotesList.tsx
import React from 'react';
import { SessionNote } from '../../../types/note';
import Typography from '../../core/Typography';
import NoteCard from './NoteCard';
import { useNotes } from '../../../context/NoteContext';
import { Book, Search } from 'lucide-react';

const NotesList: React.FC = () => {
  const { notes, isLoading, error } = useNotes();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Typography color="secondary">Loading session notes...</Typography>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <Typography color="error">{error}</Typography>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Typography variant="h3">Session Notes</Typography>
        <Typography variant="body-sm" color="secondary">
          {notes.length} {notes.length === 1 ? 'session' : 'sessions'}
        </Typography>
      </div>

      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map(note => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Book className="w-12 h-12 mx-auto mb-4 typography-secondary" />
          <Typography variant="h4" className="mb-2">
            No session notes yet
          </Typography>
          <Typography color="secondary">
            Start a new session to create your first note
          </Typography>
        </div>
      )}
    </div>
  );
};

export default NotesList;
```

### 5. NoteCard Component
Path: `src/components/features/notes/NoteCard.tsx`

```typescript
// src/components/features/notes/NoteCard.tsx
import React from 'react';
import { SessionNote } from '../../../types/note';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import Button from '../../core/Button';
import { useNavigation } from '../../../context/NavigationContext';
import { Book, Calendar, Users, ChevronRight } from 'lucide-react';

interface NoteCardProps {
  note: SessionNote;
}

const NoteCard: React.FC<NoteCardProps> = ({ note }) => {
  const { navigateToPage } = useNavigation();
  
  const handleViewNote = () => {
    navigateToPage(`/notes/${note.id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card hoverable onClick={handleViewNote}>
      <Card.Content className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Typography variant="h4" className="mb-2">
              {note.title}
            </Typography>
            
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 typography-secondary" />
                <Typography variant="body-sm" color="secondary">
                  {formatDate(note.sessionDate)}
                </Typography>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 typography-secondary" />
                <Typography variant="body-sm" color="secondary">
                  {note.attendingPlayers.length} players
                </Typography>
              </div>
            </div>

            <Typography variant="body-sm" color="secondary" className="line-clamp-2">
              {note.content.substring(0, 150)}...
            </Typography>
          </div>

          <Button variant="ghost" onClick={handleViewNote}>
            <ChevronRight />
          </Button>
        </div>
      </Card.Content>
    </Card>
  );
};

export default NoteCard;
```

### Next Steps
Proceed to Phase 6: Session Flow Implementation