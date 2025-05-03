# Phase 3: Context Setup


# Phase 3: Context & State Management Setup

## NoteContext Implementation

### Create NoteContext File
Path: `src/context/NoteContext.tsx`

### Implementation Steps

1. **Create Context File**
   ```typescript
   // src/context/NoteContext.tsx
   import React, { createContext, useContext, useCallback } from 'react';
   import { SessionNote, NoteContextValue, ExtractedEntity, EntityType } from '../types/note';
   import { useNoteData } from '../hooks/useNoteData';
   import { useFirebaseData } from '../hooks/useFirebaseData';
   import { useAuth, useUser, useGroups, useCampaigns } from './firebase';
   import { extractEntitiesFromNote } from '../services/openai/entityExtractor';
   
   const NoteContext = createContext<NoteContextValue | undefined>(undefined);
   ```

2. **Implement Provider Component**
   ```typescript
   export const NoteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     const { notes, loading, error, refreshNotes } = useNoteData();
     const { addData, updateData, deleteData } = useFirebaseData<SessionNote>({
       collection: 'notes'
     });
     const { user } = useAuth();
     const { userProfile } = useUser();
     const { activeGroupId } = useGroups();
     const { activeCampaignId } = useCampaigns();
   ```

3. **Create Core Methods**
   ```typescript
   // Get note by ID
   const getNoteById = useCallback((id: string) => {
     return notes.find(note => note.id === id);
   }, [notes]);
   
   // Get notes by session number
   const getNotesBySession = useCallback((sessionNumber: number) => {
     return notes.filter(note => note.sessionNumber === sessionNumber);
   }, [notes]);
   
   // Get active note (status === 'active')
   const getActiveNote = useCallback(() => {
     return notes.find(note => note.status === 'active');
   }, [notes]);
   ```

4. **Implement Entity Extraction**
   ```typescript
   // Extract entities from note content
   const extractEntities = useCallback(async (noteId: string): Promise<ExtractedEntity[]> => {
     const note = getNoteById(noteId);
     if (!note) throw new Error('Note not found');
     
     // Use OpenAI extraction utility
     const entities = await extractEntitiesFromNote(note.content);
     
     // Update note with extracted entities
     await updateData(noteId, {
       ...note,
       extractedEntities: entities
     });
     
     return entities;
   }, [getNoteById, updateData]);
   ```

5. **Implement Entity Conversion**
   ```typescript
   // Convert entity to campaign element
   const convertEntity = useCallback(async (
     noteId: string,
     entityId: string,
     type: EntityType
   ): Promise<string> => {
     const note = getNoteById(noteId);
     if (!note) throw new Error('Note not found');
     
     const entity = note.extractedEntities.find(e => e.id === entityId);
     if (!entity) throw new Error('Entity not found');
     
     // Create appropriate campaign element
     let createdId: string;
     
     switch (type) {
       case 'npc':
         createdId = await convertToNPC(entity, note);
         break;
       case 'location':
         createdId = await convertToLocation(entity, note);
         break;
       // ... handle other types
     }
     
     // Update entity status
     const updatedEntities = note.extractedEntities.map(e =>
       e.id === entityId ? { ...e, isConverted: true, convertedToId: createdId } : e
     );
     
     await updateData(noteId, {
       ...note,
       extractedEntities: updatedEntities
     });
     
     return createdId;
   }, [getNoteById, updateData]);
   ```

6. **Implement Content Update**
   ```typescript
   // Update note content
   const updateNoteContent = useCallback(async (noteId: string, content: string) => {
     const note = getNoteById(noteId);
     if (!note) throw new Error('Note not found');
     
     await updateData(noteId, {
       ...note,
       content,
       dateModified: new Date().toISOString(),
       modifiedBy: user?.uid || '',
       modifiedByUsername: user?.email || ''
     });
   }, [getNoteById, updateData, user]);
   ```

7. **Create Context Value**
   ```typescript
   const value: NoteContextValue = {
     notes,
     isLoading: loading,
     error,
     getNoteById,
     getNotesBySession,
     getActiveNote,
     extractEntities,
     convertEntity,
     updateNoteContent
   };
   
   return (
     <NoteContext.Provider value={value}>
       {children}
     </NoteContext.Provider>
   );
   ```

8. **Create UseNotes Hook**
   ```typescript
   export const useNotes = () => {
     const context = useContext(NoteContext);
     if (context === undefined) {
       throw new Error('useNotes must be used within a NoteProvider');
     }
     return context;
   };
   ```

### Integration Steps

1. **Add to App.tsx**
   ```typescript
   // src/App.tsx
   import { NoteProvider } from './context/NoteContext';
   
   // Wrap app with NoteProvider
   <NoteProvider>
     {/* ... existing providers and routes */}
   </NoteProvider>
   ```

### Next Steps
Proceed to Phase 4: Hook Development
