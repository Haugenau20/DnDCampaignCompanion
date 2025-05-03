// src/context/NoteContext.tsx
import React, { createContext, useContext, useCallback, useState, useEffect } from "react";
import { Note, NoteContextValue, ExtractedEntity, EntityType } from "../types/note";
import { useFirebaseData } from "../hooks/useFirebaseData";
import { useAuth, useGroups, useCampaigns } from "./firebase";
import { extractEntitiesFromNote } from "../services/openai/entityExtractor";

// Create the context with initial undefined value
const NoteContext = createContext<NoteContextValue | undefined>(undefined);

/**
 * Provider component for note-related state and functionality
 */
export const NoteProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();

  // Only initialize data fetching if all dependencies are available
  const path = activeGroupId && user?.uid ? 
    `groups/${activeGroupId}/users/${user.uid}/notes` : 
    null;
  
  const { 
    data, 
    loading, 
    error, 
    getData, 
    addData, 
    updateData, 
    deleteData 
  } = useFirebaseData<Note>({
    collection: path || ""
  });
  
  // Update notes when data changes
  useEffect(() => {
    if (data) {
      setNotes(data);
    }
  }, [data]);

  /**
   * Get a note by its ID
   */
  const getNoteById = useCallback((id: string) => {
    return notes.find(note => note.id === id);
  }, [notes]);

  /**
   * Generate sequential note ID (note-1, note-2, etc.)
   */
  const generateSequentialNoteId = useCallback((): string => {
    // Find highest existing number
    const noteIds = notes.map(note => note.id)
      .filter(id => id.startsWith('note-'))
      .map(id => {
        const match = id.match(/note-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    
    // Get next number in sequence (or start with 1 if none exist)
    const nextNumber = noteIds.length > 0 ? Math.max(...noteIds) + 1 : 1;
    return `note-${nextNumber}`;
  }, [notes]);


  /**
   * Create a new note
   */
  const createNote = useCallback(async (title: string, content: string): Promise<string> => {
    if (!user || !activeGroupId) throw new Error("User not authenticated or no active group");
    
    const noteId = generateSequentialNoteId();
    const now = new Date().toISOString();
    const newNote: Note = {
      id: noteId,
      title,
      content,
      extractedEntities: [],
      status: "active",
      tags: [],
      updatedAt: now,
      dateAdded: now,
      dateModified: now,
      createdBy: user.uid,
      createdByUsername: user.email || "",
      modifiedBy: user.uid,
      modifiedByUsername: user.email || "",
      campaignId: activeCampaignId || "",
    };
    
    await addData(newNote);
    return noteId;
  }, [user, activeGroupId, activeCampaignId, addData]);
  
  /**
   * Extract entities from a note using OpenAI
   */
  const extractEntities = useCallback(async (noteId: string): Promise<ExtractedEntity[]> => {
    const note = getNoteById(noteId);
    if (!note) throw new Error("Note not found");
    
    try {
      // Use OpenAI to extract entities
      const entities = await extractEntitiesFromNote(note.content);
      
      // Update note with extracted entities
      await updateData(noteId, {
        extractedEntities: [...note.extractedEntities, ...entities],
        dateModified: new Date().toISOString(),
        modifiedBy: user?.uid || "",
        modifiedByUsername: user?.email || ""
      });
      
      return entities;
    } catch (error) {
      console.error("OpenAI extraction failed:", error);
      throw error;
    }
  }, [getNoteById, updateData, user]);
  
  /**
   * Convert an extracted entity to a campaign element
   */
  const convertEntity = useCallback(async (
    noteId: string,
    entityId: string,
    type: EntityType
  ): Promise<string> => {
    const note = getNoteById(noteId);
    if (!note) throw new Error("Note not found");
    
    const entity = note.extractedEntities.find(e => e.id === entityId);
    if (!entity) throw new Error("Entity not found");
    
    // Import dynamically to avoid circular dependencies
    const { linkNoteToEntity } = await import("../utils/note-relationships");
    
    // Create appropriate campaign element
    let createdId: string = "";
    
    // In a real implementation, this would create the campaign element based on type
    // For now, we'll just simulate the creation and return a mock ID
    createdId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create proper entity in the correct Firebase collection
    switch (type) {
      case "npc":
        // This would call NPC creation service
        console.log("Creating NPC:", entity.text);
        break;
      case "location":
        // This would call Location creation service
        console.log("Creating Location:", entity.text);
        break;
      case "quest":
        // This would call Quest creation service
        console.log("Creating Quest:", entity.text);
        break;
      case "rumor":
        // This would call Rumor creation service
        console.log("Creating Rumor:", entity.text);
        break;
      case "item":
        // This would call Item creation service
        console.log("Creating Item:", entity.text);
        break;
    }
    
    // Link note to created entity
    await linkNoteToEntity(noteId, createdId, type);
    
    // Update entity status
    const updatedEntities = note.extractedEntities.map(e =>
      e.id === entityId ? { ...e, isConverted: true, convertedToId: createdId } : e
    );
    
    await updateData(noteId, {
      extractedEntities: updatedEntities,
      dateModified: new Date().toISOString(),
      modifiedBy: user?.uid || "",
      modifiedByUsername: user?.email || "",
      updatedAt: new Date().toISOString()
    });
    
    return createdId;
  }, [getNoteById, updateData, user]);
  
  /**
   * Update a note
   */
  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    const note = getNoteById(noteId);
    if (!note) throw new Error("Note not found");
    
    const updatedFields = {
      ...updates,
      dateModified: new Date().toISOString(),
      modifiedBy: user?.uid || "",
      modifiedByUsername: user?.email || "",
      updatedAt: new Date().toISOString()
    };
    
    await updateData(noteId, updatedFields);
  }, [getNoteById, updateData, user]);
  
  /**
   * Archive a note
   */
  const archiveNote = useCallback(async (noteId: string) => {
    await updateNote(noteId, { status: "archived" });
  }, [updateNote]);
  
  /**
   * Delete a note
   */
  const deleteNote = useCallback(async (noteId: string) => {
    await deleteData(noteId);
  }, [deleteData]);
  
  // Create context value
  const value: NoteContextValue = {
    notes,
    isLoading: loading,
    error,
    getNoteById,
    createNote,
    extractEntities,
    convertEntity,
    updateNote,
    archiveNote,
    deleteNote
  };
  
  return (
    <NoteContext.Provider value={value}>
      {children}
    </NoteContext.Provider>
  );
};

/**
 * Custom hook to use the note context
 * @throws Error if used outside of NoteProvider
 */
export const useNotes = (): NoteContextValue => {
  const context = useContext(NoteContext);
  if (context === undefined) {
    throw new Error("useNotes must be used within a NoteProvider");
  }
  return context;
};