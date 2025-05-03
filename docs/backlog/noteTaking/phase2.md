# Phase 2: Data Model

# Phase 2: Data Model & Schema Design

## Note Data Model

### SessionNote Interface
Create file: `src/types/note.ts`

```typescript
// src/types/note.ts
import { ContentAttribution, BaseContent } from './common';

export interface SessionNote extends BaseContent {
  id: string;
  sessionNumber: number;
  sessionDate: string;
  title: string;
  content: string;
  attendingPlayers: string[];
  extractedEntities: ExtractedEntity[];
  status: NoteStatus;
  tags: string[];
}

export type NoteStatus = 'active' | 'completed' | 'archived';

export interface ExtractedEntity {
  id: string;
  text: string;
  type: EntityType;
  confidence: number;
  isConverted: boolean;
  convertedToId?: string;
  createdAt: string;
}

export type EntityType = 'npc' | 'location' | 'item' | 'quest' | 'rumor';

export interface NoteContextValue {
  notes: SessionNote[];
  isLoading: boolean;
  error: string | null;
  getNoteById: (id: string) => SessionNote | undefined;
  getNotesBySession: (sessionNumber: number) => SessionNote[];
  getActiveNote: () => SessionNote | undefined;
  extractEntities: (noteId: string) => Promise<ExtractedEntity[]>;
  convertEntity: (noteId: string, entityId: string, type: EntityType) => Promise<string>;
  updateNoteContent: (noteId: string, content: string) => Promise<void>;
}
```

### Firebase Schema

#### Notes Collection Structure
Path: `/groups/{groupId}/campaigns/{campaignId}/notes/{noteId}`

```json
{
  "notes": {
    "session-001-20250503": {
      "id": "session-001-20250503",
      "sessionNumber": 1,
      "sessionDate": "2025-05-03T19:00:00Z",
      "title": "The Adventure Begins",
      "content": "The party met with Lady Silverleaf...",
      "attendingPlayers": ["player1", "player2"],
      "extractedEntities": [
        {
          "id": "entity-001",
          "text": "Lady Silverleaf",
          "type": "npc",
          "confidence": 0.95,
          "isConverted": false,
          "createdAt": "2025-05-03T19:30:00Z"
        }
      ],
      "status": "active",
      "tags": ["chapter-1", "introductory"],
      "createdBy": "userId",
      "createdByUsername": "DungeonMaster",
      "dateAdded": "2025-05-03T19:00:00Z",
      "modifiedBy": "userId",
      "modifiedByUsername": "DungeonMaster",
      "dateModified": "2025-05-03T20:00:00Z"
    }
  }
}
```

### ID Generation Strategy
- Format: `session-{sessionNumber:padded}-{date:YYYYMMDD}`
- Example: `session-001-20250503`

### Schema Migration Plan
1. Create new 'notes' collection in Firebase
2. Add notes metadata to campaign documents
3. No breaking changes to existing collections

### Steps to Implement

1. Create `src/types/note.ts`
   ```typescript
   // Copy the SessionNote interface and related types
   ```

2. Add notes collection to Firebase Rules
   ```
   // Add to firebase/firestore.rules
   match /notes/{noteId} {
     allow read: if isAuthenticated();
     allow write: if isGroupMember();
   }
   ```

3. Update Campaign interface
   ```typescript
   // Update src/types/user.ts
   interface Campaign {
     // ... existing fields
     sessionCount: number;
     lastSessionDate: string;
   }
   ```

### Next Steps
Proceed to Phase 3: Context & State Management Setup# Phase 2: Data Model

# Phase 2: Data Model & Schema Design

## Note Data Model

### SessionNote Interface
Create file: `src/types/note.ts`

```typescript
// src/types/note.ts
import { ContentAttribution, BaseContent } from './common';

export interface SessionNote extends BaseContent {
  id: string;
  sessionNumber: number;
  sessionDate: string;
  title: string;
  content: string;
  attendingPlayers: string[];
  extractedEntities: ExtractedEntity[];
  status: NoteStatus;
  tags: string[];
}

export type NoteStatus = 'active' | 'completed' | 'archived';

export interface ExtractedEntity {
  id: string;
  text: string;
  type: EntityType;
  confidence: number;
  isConverted: boolean;
  convertedToId?: string;
  createdAt: string;
}

export type EntityType = 'npc' | 'location' | 'item' | 'quest' | 'rumor';

export interface NoteContextValue {
  notes: SessionNote[];
  isLoading: boolean;
  error: string | null;
  getNoteById: (id: string) => SessionNote | undefined;
  getNotesBySession: (sessionNumber: number) => SessionNote[];
  getActiveNote: () => SessionNote | undefined;
  extractEntities: (noteId: string) => Promise<ExtractedEntity[]>;
  convertEntity: (noteId: string, entityId: string, type: EntityType) => Promise<string>;
  updateNoteContent: (noteId: string, content: string) => Promise<void>;
}
```

### Firebase Schema

#### Notes Collection Structure
Path: `/groups/{groupId}/campaigns/{campaignId}/notes/{noteId}`

```json
{
  "notes": {
    "session-001-20250503": {
      "id": "session-001-20250503",
      "sessionNumber": 1,
      "sessionDate": "2025-05-03T19:00:00Z",
      "title": "The Adventure Begins",
      "content": "The party met with Lady Silverleaf...",
      "attendingPlayers": ["player1", "player2"],
      "extractedEntities": [
        {
          "id": "entity-001",
          "text": "Lady Silverleaf",
          "type": "npc",
          "confidence": 0.95,
          "isConverted": false,
          "createdAt": "2025-05-03T19:30:00Z"
        }
      ],
      "status": "active",
      "tags": ["chapter-1", "introductory"],
      "createdBy": "userId",
      "createdByUsername": "DungeonMaster",
      "dateAdded": "2025-05-03T19:00:00Z",
      "modifiedBy": "userId",
      "modifiedByUsername": "DungeonMaster",
      "dateModified": "2025-05-03T20:00:00Z"
    }
  }
}
```

### ID Generation Strategy
- Format: `session-{sessionNumber:padded}-{date:YYYYMMDD}`
- Example: `session-001-20250503`

### Schema Migration Plan
1. Create new 'notes' collection in Firebase
2. Add notes metadata to campaign documents
3. No breaking changes to existing collections

### Steps to Implement

1. Create `src/types/note.ts`
   ```typescript
   // Copy the SessionNote interface and related types
   ```

2. Add notes collection to Firebase Rules
   ```
   // Add to firebase/firestore.rules
   match /notes/{noteId} {
     allow read: if isAuthenticated();
     allow write: if isGroupMember();
   }
   ```

3. Update Campaign interface
   ```typescript
   // Update src/types/user.ts
   interface Campaign {
     // ... existing fields
     sessionCount: number;
     lastSessionDate: string;
   }
   ```

### Next Steps
Proceed to Phase 3: Context & State Management Setup