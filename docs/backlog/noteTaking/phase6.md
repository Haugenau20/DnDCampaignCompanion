# Phase 6: Session Flow Implementation


# Phase 6: Session Flow Implementation

## Session Flow Overview

The session flow manages the lifecycle of a gaming session:
1. Start new session
2. Active note-taking during gameplay
3. Entity extraction
4. Session completion
5. Review and organization

## Component Implementation

### 1. SessionFlow Component
Path: `src/components/features/notes/SessionFlow.tsx`

```typescript
// src/components/features/notes/SessionFlow.tsx
import React, { useState, useEffect } from 'react';
import { SessionNote } from '../../../types/note';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import Card from '../../core/Card';
import Dialog from '../../core/Dialog';
import NoteEditor from './NoteEditor';
import EntityExtractor from './EntityExtractor';
import SessionInfo from './SessionInfo';
import { useSessionNote } from '../../../hooks/useSessionNote';
import { useNotes } from '../../../context/NoteContext';
import { PlayCircle, StopCircle, CheckCircle } from 'lucide-react';

interface Player {
  id: string;
  name: string;
}

const SessionFlow: React.FC = () => {
  const { startSession, endSession } = useSessionNote();
  const { getActiveNote } = useNotes();
  const [activeNote, setActiveNote] = useState<SessionNote | undefined>();
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const note = getActiveNote();
    setActiveNote(note);
  }, [getActiveNote]);

  const handleStartSession = async () => {
    const selectedPlayers = players.filter(p => /* selected logic */);
    const attendingIds = selectedPlayers.map(p => p.id);
    
    try {
      const newNote = await startSession(attendingIds);
      setActiveNote(newNote);
      setShowStartDialog(false);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Session status bar */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {activeNote ? (
                <>
                  <Typography variant="h4">
                    Session {activeNote.sessionNumber} in Progress
                  </Typography>
                  <Typography variant="body-sm" color="secondary">
                    Started: {new Date(activeNote.sessionDate).toLocaleTimeString()}
                  </Typography>
                </>
              ) : (
                <Typography variant="h4">
                  No Active Session
                </Typography>
              )}
            </div>
            <div className="flex gap-2">
              {activeNote ? (
                <Button 
                  variant="outline" 
                  startIcon={<StopCircle />}
                  onClick={() => setShowEndDialog(true)}
                >
                  End Session
                </Button>
              ) : (
                <Button 
                  startIcon={<PlayCircle />}
                  onClick={() => setShowStartDialog(true)}
                >
                  Start New Session
                </Button>
              )}
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Main content area */}
      {activeNote ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Note editor */}
          <div className="space-y-6">
            <NoteEditor noteId={activeNote.id} />
            <SessionInfo noteId={activeNote.id} />
          </div>
          
          {/* Entity extractor */}
          <div>
            <EntityExtractor noteId={activeNote.id} />
          </div>
        </div>
      ) : (
        <Card>
          <Card.Content className="text-center py-12">
            <PlayCircle className="w-12 h-12 mx-auto mb-4 typography-secondary" />
            <Typography variant="h4" className="mb-2">
              Ready to start a new session?
            </Typography>
            <Typography color="secondary" className="mb-6">
              Begin capturing your campaign's story and adventures
            </Typography>
            <Button 
              startIcon={<PlayCircle />}
              onClick={() => setShowStartDialog(true)}
            >
              Start New Session
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Start session dialog */}
      <StartSessionDialog
        isOpen={showStartDialog}
        onClose={() => setShowStartDialog(false)}
        onStart={handleStartSession}
        players={players}
        onPlayersChange={setPlayers}
      />

      {/* End session dialog */}
      <EndSessionDialog
        isOpen={showEndDialog}
        onClose={() => setShowEndDialog(false)}
        onConfirm={() => endSession(activeNote!.id)}
        note={activeNote}
      />
    </div>
  );
};

export default SessionFlow;
```

### 2. StartSessionDialog Component
Path: `src/components/features/notes/StartSessionDialog.tsx`

```typescript
// src/components/features/notes/StartSessionDialog.tsx
import React, { useState, useEffect } from 'react';
import Dialog from '../../core/Dialog';
import Typography from '../../core/Typography';
import Button from '../../core/Button';
import Input from '../../core/Input';
import { useGroups } from '../../../context/firebase';
import { PlayCircle, X, Check } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  selected: boolean;
}

interface StartSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (attendingPlayers: string[]) => void;
  groupId: string;
}

const StartSessionDialog: React.FC<StartSessionDialogProps> = ({
  isOpen,
  onClose,
  onStart,
  groupId
}) => {
  const { getAllUsers } = useGroups();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTitle, setSessionTitle] = useState('');

  useEffect(() => {
    const loadPlayers = async () => {
      if (!isOpen) return;
      
      try {
        const users = await getAllUsers();
        const playerList = users.map(user => ({
          id: user.id,
          name: user.username || user.email,
          selected: true // Default to all selected
        }));
        setPlayers(playerList);
      } catch (error) {
        console.error('Failed to load players:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPlayers();
  }, [isOpen, getAllUsers]);

  const togglePlayer = (playerId: string) => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId 
        ? { ...player, selected: !player.selected }
        : player
    ));
  };

  const handleStart = () => {
    const selectedPlayers = players
      .filter(p => p.selected)
      .map(p => p.id);
    
    onStart(selectedPlayers);
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      title="Start New Session"
      maxWidth="max-w-md"
    >
      <div className="space-y-6">
        <div>
          <Input
            label="Session Title (optional)"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="Enter session title..."
          />
        </div>

        <div>
          <Typography variant="h4" className="mb-3">
            Select Attending Players
          </Typography>
          
          {isLoading ? (
            <Typography color="secondary">Loading players...</Typography>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {players.map(player => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded border cursor-pointer transition-colors ${
                    player.selected 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => togglePlayer(player.id)}
                >
                  <Typography variant="body">
                    {player.name}
                  </Typography>
                  {player.selected && (
                    <Check className="w-4 h-4 status-success" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            startIcon={<PlayCircle />}
            onClick={handleStart}
            disabled={isLoading || players.every(p => !p.selected)}
          >
            Start Session
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default StartSessionDialog;
```

### 3. SessionInfo Component
Path: `src/components/features/notes/SessionInfo.tsx`

```typescript
// src/components/features/notes/SessionInfo.tsx
import React, { useState, useEffect } from 'react';
import { SessionNote } from '../../../types/note';
import Typography from '../../core/Typography';
import Card from '../../core/Card';
import { useNotes } from '../../../context/NoteContext';
import { Clock, Users, Tag, Calendar } from 'lucide-react';

interface SessionInfoProps {
  noteId: string;
}

const SessionInfo: React.FC<SessionInfoProps> = ({ noteId }) => {
  const { getNoteById } = useNotes();
  const [note, setNote] = useState<SessionNote | undefined>();

  useEffect(() => {
    const noteData = getNoteById(noteId);
    setNote(noteData);
  }, [noteId, getNoteById]);

  if (!note) return null;

  const sessionDuration = () => {
    const start = new Date(note.sessionDate);
    const end = note.status === 'completed' 
      ? new Date(note.dateModified) 
      : new Date();
    
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    return `${duration} minutes`;
  };

  return (
    <Card>
      <Card.Content className="space-y-4">
        <Typography variant="h4">Session Details</Typography>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 typography-secondary" />
            <div>
              <Typography variant="body-sm" color="secondary">
                Date
              </Typography>
              <Typography variant="body">
                {new Date(note.sessionDate).toLocaleDateString()}
              </Typography>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 typography-secondary" />
            <div>
              <Typography variant="body-sm" color="secondary">
                Duration
              </Typography>
              <Typography variant="body">
                {sessionDuration()}
              </Typography>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 typography-secondary" />
            <div>
              <Typography variant="body-sm" color="secondary">
                Players
              </Typography>
              <Typography variant="body">
                {note.attendingPlayers.length} attending
              </Typography>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 typography-secondary" />
            <div>
              <Typography variant="body-sm" color="secondary">
                Status
              </Typography>
              <Typography variant="body">
                {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
              </Typography>
            </div>
          </div>
        </div>

        <div>
          <Typography variant="body-sm" color="secondary" className="mb-1">
            Session Number
          </Typography>
          <Typography variant="body">
            #{note.sessionNumber}
          </Typography>
        </div>
      </Card.Content>
    </Card>
  );
};

export default SessionInfo;
```

### 4. NotePage Component
Path: `src/pages/notes/NotePage.tsx`

```typescript
// src/pages/notes/NotePage.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import Typography from '../../components/core/Typography';
import Button from '../../components/core/Button';
import NoteEditor from '../../components/features/notes/NoteEditor';
import EntityExtractor from '../../components/features/notes/EntityExtractor';
import { useNavigation } from '../../context/NavigationContext';
import { ArrowLeft } from 'lucide-react';

const NotePage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const { navigateToPage } = useNavigation();

  if (!noteId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Typography color="error">Invalid note ID</Typography>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigateToPage('/notes')}
          startIcon={<ArrowLeft />}
        >
          Back to Sessions
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <NoteEditor noteId={noteId} />
        </div>
        <div>
          <EntityExtractor noteId={noteId} />
        </div>
      </div>
    </div>
  );
};

export default NotePage;
```

### Routing Setup

Add these routes to `src/App.tsx`:

```typescript
// In src/App.tsx
<Route path="/notes" element={<NotesPage />} />
<Route path="/notes/:noteId" element={<NotePage />} />
```

### Next Steps
Proceed to Phase 7: Entity Extraction Integration