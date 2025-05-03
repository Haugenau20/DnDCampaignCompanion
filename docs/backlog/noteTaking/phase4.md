# Phase 4: Hook Development (Updated for OpenAI)


# Phase 4: Hook Development (Updated for OpenAI)

## useNoteData Hook Implementation

### Create Hook File
Path: `src/hooks/useNoteData.ts`

### Implementation Steps

1. **Create Hook Structure**
   ```typescript
   // src/hooks/useNoteData.ts
   import { useState, useEffect, useCallback } from 'react';
   import { SessionNote } from '../types/note';
   import { useFirebaseData } from './useFirebaseData';
   import { useAuth, useGroups, useCampaigns } from '../context/firebase';
   
   export const useNoteData = () => {
     const [notes, setNotes] = useState<SessionNote[]>([]);
     const { getData, loading, error, data } = useFirebaseData<SessionNote>({ collection: 'notes' });
     const { user } = useAuth();
     const { activeGroupId } = useGroups();
     const { activeCampaignId } = useCampaigns();
   ```

2. **Implement Data Fetching**
   ```typescript
   // Fetch notes from Firebase
   const fetchNotes = useCallback(async () => {
     try {
       if (!activeGroupId || !activeCampaignId) {
         setNotes([]);
         return [];
       }
       
       const data = await getData();
       // Sort notes by session number descending (most recent first)
       const sortedNotes = data.sort((a, b) => b.sessionNumber - a.sessionNumber);
       setNotes(sortedNotes);
       return sortedNotes;
     } catch (err) {
       console.error('Error fetching notes:', err);
       setNotes([]);
       return [];
     }
   }, [getData, activeGroupId, activeCampaignId]);
   ```

3. **Add Effect Hooks**
   ```typescript
   // Load notes on mount and when group/campaign changes
   useEffect(() => {
     fetchNotes();
   }, [fetchNotes, activeGroupId, activeCampaignId]);
   
   // Update notes when Firebase data changes
   useEffect(() => {
     if (data.length > 0) {
       const sortedNotes = [...data].sort((a, b) => b.sessionNumber - a.sessionNumber);
       setNotes(sortedNotes);
     } else if (!user || !activeGroupId || !activeCampaignId) {
       setNotes([]);
     }
   }, [data, user, activeGroupId, activeCampaignId]);
   ```

4. **Return Hook Values**
   ```typescript
   return {
     notes,
     loading,
     error,
     refreshNotes: fetchNotes,
     hasRequiredContext: !!activeGroupId && !!activeCampaignId
   };
   ```

## useOpenAIExtractor Hook (New)

### Create OpenAI Hook File
Path: `src/hooks/useOpenAIExtractor.ts`

### Implementation Steps

1. **Create OpenAI Hook**
   ```typescript
   // src/hooks/useOpenAIExtractor.ts
   import { useState, useCallback } from 'react';
   import { ExtractedEntity } from '../types/note';
   import { extractEntitiesFromNote } from '../services/openai/entityExtractor';
   
   export const useOpenAIExtractor = () => {
     const [isExtracting, setIsExtracting] = useState(false);
     const [error, setError] = useState<string | null>(null);
     
     const extractEntities = useCallback(async (
       content: string,
       options?: {
         model?: 'gpt-3.5-turbo' | 'gpt-4o';
         temperature?: number;
       }
     ): Promise<ExtractedEntity[]> => {
       setIsExtracting(true);
       setError(null);
       
       try {
         const entities = await extractEntitiesFromNote(content, options);
         return entities;
       } catch (err) {
         const errorMessage = err instanceof Error ? err.message : 'Failed to extract entities';
         setError(errorMessage);
         console.error('Entity extraction error:', err);
         return [];
       } finally {
         setIsExtracting(false);
       }
     }, []);
     
     return {
       extractEntities,
       isExtracting,
       error,
       resetError: () => setError(null)
     };
   };
   ```

## useEntityExtractor Hook (Updated)

### Update Extractor Hook File
Path: `src/hooks/useEntityExtractor.ts`

### Implementation Steps

1. **Update Extractor Hook to use OpenAI**
   ```typescript
   // src/hooks/useEntityExtractor.ts
   import { useCallback } from 'react';
   import { ExtractedEntity } from '../types/note';
   import { useNotes } from '../context/NoteContext';
   import { useOpenAIExtractor } from './useOpenAIExtractor';
   
   export const useEntityExtractor = () => {
     const { getNoteById, extractEntities } = useNotes();
     const { extractEntities: openAIExtract, isExtracting } = useOpenAIExtractor();
     
     // Extract entities with OpenAI
     const extractWithOpenAI = useCallback(async (
       noteId: string,
       options?: {
         model?: 'gpt-3.5-turbo' | 'gpt-4o';
       }
     ): Promise<ExtractedEntity[]> => {
       const note = getNoteById(noteId);
       if (!note) throw new Error('Note not found');
       
       // Use OpenAI to extract entities
       const entities = await openAIExtract(note.content, options);
       
       // Update note with extracted entities
       await extractEntities(noteId);
       
       return entities;
     }, [getNoteById, openAIExtract, extractEntities]);
     
     return {
       extractWithOpenAI,
       isExtracting
     };
   };
   ```

## useSessionNote Hook

### Create Session Hook File
Path: `src/hooks/useSessionNote.ts`

### Implementation Steps

1. **Create Session Hook**
   ```typescript
   // src/hooks/useSessionNote.ts
   import { useCallback } from 'react';
   import { SessionNote } from '../types/note';
   import { useNotes } from '../context/NoteContext';
   import { useFirebaseData } from './useFirebaseData';
   import { useAuth, useUser, useGroups, useCampaigns } from '../context/firebase';
   ```

2. **Implement Session Management**
   ```typescript
   export const useSessionNote = () => {
     const { notes, getActiveNote, refreshNotes } = useNotes();
     const { addData } = useFirebaseData<SessionNote>({ collection: 'notes' });
     const { user } = useAuth();
     const { userProfile } = useUser();
     const { activeGroupId } = useGroups();
     const { activeCampaignId } = useCampaigns();
     
     // Generate session ID
     const generateSessionId = useCallback((sessionNumber: number, date: Date) => {
       const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
       return `session-${sessionNumber.toString().padStart(3, '0')}-${dateStr}`;
     }, []);
     
     // Get next session number
     const getNextSessionNumber = useCallback(() => {
       if (notes.length === 0) return 1;
       return Math.max(...notes.map(n => n.sessionNumber)) + 1;
     }, [notes]);
   ```

3. **Create Session Functions**
   ```typescript
   // Start new session
   const startSession = useCallback(async (
     attendingPlayers: string[],
     date: Date = new Date()
   ): Promise<SessionNote> => {
     if (!user || !activeGroupId || !activeCampaignId) {
       throw new Error('User must be authenticated and group/campaign context must be set');
     }
     
     const sessionNumber = getNextSessionNumber();
     const sessionId = generateSessionId(sessionNumber, date);
     
     const newNote: SessionNote = {
       id: sessionId,
       sessionNumber,
       sessionDate: date.toISOString(),
       title: `Session ${sessionNumber}`,
       content: '',
       attendingPlayers,
       extractedEntities: [],
       status: 'active',
       tags: [],
       createdBy: user.uid,
       createdByUsername: user.email || '',
       dateAdded: new Date().toISOString(),
       modifiedBy: user.uid,
       modifiedByUsername: user.email || '',
       dateModified: new Date().toISOString()
     };
     
     await addData(newNote, sessionId);
     await refreshNotes();
     return newNote;
   }, [user, activeGroupId, activeCampaignId, getNextSessionNumber, generateSessionId, addData, refreshNotes]);
   ```

### Next Steps
Proceed to Phase 5: UI Component Development