// src/context/NoteContext.tsx - Complete Fixed Version
import React, { createContext, useContext, useCallback, useState, useEffect } from "react";
import { Note, NoteContextValue, ExtractedEntity, EntityType } from "../types/note";
import DocumentService from "../services/firebase/data/DocumentService";
import { useAuth, useGroups, useCampaigns, useUser } from "./firebase";
import { getUserName, getActiveCharacterName } from '../utils/user-utils';
import { useNavigate } from 'react-router-dom';

// Create the context with initial undefined value
const NoteContext = createContext<NoteContextValue | undefined>(undefined);

/**
 * Provider component for note-related state and functionality
 */
export const NoteProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { userProfile, activeGroupUserProfile } = useUser();
  const documentService = DocumentService.getInstance();
  const navigate = useNavigate();

  /**
   * Fetch notes from Firestore for the current user filtered by active campaign
   */
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.uid || !activeGroupId) {
        console.log('NoteContext: No user or active group, clearing notes');
        setNotes([]);
        return [];
      }
      
      // Use the correct path for user notes: groups/{groupId}/users/{userId}/notes
      const notesCollection = `groups/${activeGroupId}/users/${user.uid}/notes`;
      const fetchedData = await documentService.getCollection<Note>(notesCollection);
      
      // Filter notes by active campaign ID
      let filteredNotes: Note[] = [];
      
      if (activeCampaignId) {
        // Filter to show only notes for the active campaign
        filteredNotes = fetchedData.filter(note => {
          // Include notes that match the active campaign ID
          return note.campaignId === activeCampaignId;
        });
        
        console.log(`NoteContext: Filtered ${fetchedData.length} total notes to ${filteredNotes.length} notes for campaign ${activeCampaignId}`);
      } else {
        // If no active campaign, show no notes
        // This prevents showing all notes when no campaign is selected
        filteredNotes = [];
        console.log('NoteContext: No active campaign, showing no notes');
      }
      
      // Sort notes by updatedAt timestamp descending (most recent first)
      const sortedNotes = filteredNotes.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      setNotes(sortedNotes);
      return sortedNotes;
    } catch (err) {
      console.error("Error fetching notes:", err);
      setError("Failed to fetch notes");
      setNotes([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.uid, activeGroupId, activeCampaignId, documentService]);

  // Load notes when dependencies change
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

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
   * Create a new note locally (not saved to Firebase until saveNote is called)
   */
  const createNote = useCallback(async (title: string, content: string): Promise<string> => {
    if (!user || !activeGroupId) throw new Error("User not authenticated or no active group");
    
    if (!activeCampaignId) {
      throw new Error("No active campaign selected. Please select a campaign before creating notes.");
    }
    
    const noteId = generateSequentialNoteId();
    const now = new Date().toISOString();
    const username = getUserName(activeGroupUserProfile);
    const characterName = getActiveCharacterName(activeGroupUserProfile);
    
    // Create note object locally only - don't save to Firebase yet
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
      createdByUsername: username || "",
      createdByCharacterName: characterName || "",
      modifiedBy: user.uid,
      modifiedByUsername: username || "",
      modifiedByCharacterName: characterName || "",
      campaignId: activeCampaignId,
      isUnsaved: true, // Mark as unsaved
    };
    
    // Add to local state immediately for instant feedback
    setNotes(prevNotes => [newNote, ...prevNotes]);
    
    console.log(`NoteContext: Created local note ${noteId} for campaign ${activeCampaignId}`);
    
    return noteId;
  }, [user, activeGroupId, activeCampaignId, generateSequentialNoteId, activeGroupUserProfile]);

  /**
   * Save a note to Firebase (handles both new and existing notes)
   */
  const saveNote = useCallback(async (noteId: string, updates: Partial<Note> = {}) => {
    if (!user?.uid || !activeGroupId) {
      throw new Error("User not authenticated or no active group");
    }

    const note = getNoteById(noteId);
    if (!note) throw new Error("Note not found");
    
    const username = getUserName(activeGroupUserProfile);
    const characterName = getActiveCharacterName(activeGroupUserProfile);
    const now = new Date().toISOString();
    
    const updatedFields = {
      ...updates,
      dateModified: now,
      modifiedBy: user.uid,
      modifiedByUsername: username || "",
      modifiedByCharacterName: characterName || "",
      updatedAt: now,
      // Don't include isUnsaved in updates - we'll handle it separately
    };
    
    const notesCollection = `groups/${activeGroupId}/users/${user.uid}/notes`;
    
    if (note.isUnsaved) {
      // First save - create document (exclude isUnsaved field entirely)
      const noteToSave = { ...note, ...updatedFields };
      delete noteToSave.isUnsaved; // Remove before saving
      
      await documentService.createDocument(notesCollection, noteToSave, noteId);
      console.log(`NoteContext: Saved new note ${noteId} to Firebase`);
    } else {
      // Update existing document (don't send isUnsaved field)
      await documentService.updateDocument(notesCollection, noteId, updatedFields);
      console.log(`NoteContext: Updated note ${noteId} in Firebase`);
    }
    
    // Update local state (remove isUnsaved flag)
    setNotes(prevNotes => 
      prevNotes.map(n => 
        n.id === noteId 
          ? { ...n, ...updatedFields, isUnsaved: false } 
          : n
      )
    );
  }, [user, activeGroupId, documentService, getNoteById, activeGroupUserProfile]);

  /**
   * Update a note (now calls saveNote internally for saved notes, updates locally for unsaved)
   */
  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    const note = getNoteById(noteId);
    if (!note) throw new Error("Note not found");
    
    if (note.isUnsaved) {
      // Just update local state for unsaved notes (don't save to Firebase yet)
      const now = new Date().toISOString();
      const updatedLocalFields = {
        ...updates,
        updatedAt: now,
        dateModified: now,
        // Keep isUnsaved: true for local notes
      };
      
      setNotes(prevNotes => 
        prevNotes.map(n => 
          n.id === noteId 
            ? { ...n, ...updatedLocalFields }
            : n
        )
      );
    } else {
      // Save immediately for existing notes (this will remove isUnsaved if present)
      await saveNote(noteId, updates);
    }
  }, [getNoteById, saveNote]);
  
  /**
   * Convert an extracted entity to a campaign element
   * Now navigates to the create page instead of directly creating
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
    
    // Parse extra data from entity if available
    const extraData = entity.extraData || {};
    
    // Prepare initial data for the create form based on entity type
    let initialData: any = {};
    let description = `Created from note: ${note.title || note.id}`; // Declare once
    
    switch (type) {
      case "npc":
        initialData = {
          // Use proper name field, fall back to text if not available
          name: extraData.name || entity.text,
          title: extraData.title || undefined,
          race: extraData.race || undefined,
          occupation: extraData.occupation || undefined,
          location: extraData.location || undefined,
          relationship: extraData.relationship || undefined,
          description: extraData.description || 
            (extraData.context ? `${description}\n\nContext: ${extraData.context}` : description),
        };
        break;
        
      case "location":
        initialData = {
          // Use proper name field, fall back to text if not available
          name: extraData.name || entity.text,
          type: extraData.locationType || undefined,
          description: extraData.description || 
            (extraData.context ? `${description}\n\nContext: ${extraData.context}` : description),
          parentId: extraData.parentLocation || undefined,
        };
        break;
        
      case "quest":
        // Get raw objectives from entity data 
        const objectives = extraData.objectives || [];
        
        // Enhance description with NPC IDs if available
        if (extraData.relatedNPCIds?.length > 0) {
          description += `\n\nRelated NPCs: ${extraData.relatedNPCIds.join(', ')}`;
        }
        if (extraData.locationName) {
          description += `\n\nLocation: ${extraData.locationName}`;
        }
        
        initialData = {
          // Use proper title field, fall back to text if not available
          title: extraData.title || entity.text,
          description: description,
          objectives: objectives, // Pass raw objectives
          relatedNPCIds: extraData.relatedNPCIds || [],
          location: extraData.locationName || undefined,
        };
        break;
        
      case "rumor":
        // Map sourceType to valid values
        const validSourceTypes = ['npc', 'tavern', 'notice', 'traveler', 'other'];
        let sourceType = 'other';
        let sourceName = extraData.sourceType || '';
        
        if (extraData.sourceType && validSourceTypes.includes(extraData.sourceType)) {
          sourceType = extraData.sourceType;
        }
        
        initialData = {
          // Use proper title field, fall back to text if not available
          title: extraData.title || entity.text,
          content: extraData.content || undefined,
          status: extraData.status || 'unconfirmed',
          sourceType: sourceType,
          sourceName: sourceName,
        };
        break;
    }

    // Navigate to the appropriate create page with the initial data
    switch (type) {
      case "npc":
        navigate('/npcs/create', { 
          state: { 
            initialData,
            noteId, 
            entityId 
          } 
        });
        break;
      case "location":
        navigate('/locations/create', { 
          state: { 
            initialData,
            noteId, 
            entityId 
          } 
        });
        break;
      case "quest":
        navigate('/quests/create', { 
          state: { 
            initialData,
            noteId, 
            entityId 
          } 
        });
        break;
      case "rumor":
        navigate('/rumors/create', { 
          state: { 
            initialData,
            noteId, 
            entityId 
          } 
        });
        break;
    }
    
    // Return empty string since we're not creating immediately
    return "";
  }, [getNoteById, navigate]);
  
  /**
   * Mark an entity as converted in the note
   * This is called after the user successfully creates the campaign element
   */
  const markEntityAsConverted = useCallback(async (
    noteId: string,
    entityId: string,
    createdId: string
  ): Promise<void> => {
    const note = getNoteById(noteId);
    if (!note) throw new Error("Note not found");
    
    const updatedEntities = note.extractedEntities.map(e =>
      e.id === entityId ? { ...e, isConverted: true, convertedToId: createdId } : e
    );
    
    await updateNote(noteId, {
      extractedEntities: updatedEntities,
    });
  }, [getNoteById, updateNote]);
  
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
    if (!user?.uid || !activeGroupId) {
      throw new Error("User not authenticated or no active group");
    }

    // Delete document at the correct path
    const notesCollection = `groups/${activeGroupId}/users/${user.uid}/notes`;
    await documentService.deleteDocument(notesCollection, noteId);
    
    console.log(`NoteContext: Deleted note ${noteId}`);
    
    // Refresh notes list
    await fetchNotes();
  }, [user?.uid, activeGroupId, documentService, fetchNotes]);
  
  // Create context value
  const value: NoteContextValue = {
    notes,
    isLoading: loading,
    error,
    getNoteById,
    createNote,
    saveNote, // Add saveNote to context
    convertEntity,
    updateNote,
    archiveNote,
    deleteNote,
    markEntityAsConverted,
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