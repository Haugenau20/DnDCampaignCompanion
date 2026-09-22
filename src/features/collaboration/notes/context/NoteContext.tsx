// src/features/collaboration/notes/context/NoteContext.tsx - Complete Fixed Version
import React, { createContext, useContext, useCallback, useState, useEffect } from "react";
import { Note, NoteContextValue, ExtractedEntity, EntityType } from "../types";
import DocumentService from "core/services/firebase/data/DocumentService";
import { useAuth, useGroups, useCampaigns, useUser } from "features/user-management";
import { useRumors } from "features/campaign-entities";
import { useCampaignContextStatus } from "shared/hooks/useCampaignContextStatus";
import { buildCreationAttribution } from "core/attribution";
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
  // Ids of EVERY note this user owns in the active group, not just the active
  // campaign's. Notes are stored flat at `groups/{g}/users/{uid}/notes` and are
  // joined to a campaign by a `campaignId` field, so an id must be unique across
  // all campaigns even though the list we render is per-campaign. `notes` above
  // is the filtered view and is the wrong basis for allocating one -- that is
  // bug #1422. Kept as a separate slice rather than storing the unfiltered array
  // because nothing else needs the other campaigns' note bodies.
  const [allNoteIds, setAllNoteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  /**
   * Writing a rumour is part of converting one out of a note, because a
   * rumour has no create page to hand that job to. `RumorProvider` therefore
   * has to sit above `NoteProvider`, which it already does in `app/App.tsx`.
   */
  const { addRumor } = useRumors();
  const { userProfile, activeGroupUserProfile } = useUser();
  // Single shared source of truth for "still resolving vs. genuinely no
  // selection" (bug #1413) -- see the hook's doc comment. Folded into
  // `isLoading` below so `NotesList`'s existing loading-before-"no campaign"
  // ordering holds on a fresh page load instead of briefly showing "No
  // Campaign Selected" while auth/group/campaign are still restoring.
  const { isResolving } = useCampaignContextStatus();
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
        setNotes([]);
        setAllNoteIds([]);
        return [];
      }

      // Use the correct path for user notes: groups/{groupId}/users/{userId}/notes
      const notesCollection = `groups/${activeGroupId}/users/${user.uid}/notes`;
      const fetchedData = await documentService.getCollection<Note>(notesCollection);

      // Record the unfiltered id set before the campaign filter below discards
      // it. This is what new ids are allocated against (bug #1422).
      setAllNoteIds(fetchedData.map(note => note.id));

      // Filter notes by active campaign ID
      let filteredNotes: Note[] = [];
      
      if (activeCampaignId) {
        // Filter to show only notes for the active campaign
        filteredNotes = fetchedData.filter(note => {
          // Include notes that match the active campaign ID
          return note.campaignId === activeCampaignId;
        });
      } else {
        // If no active campaign, show no notes
        // This prevents showing all notes when no campaign is selected
        filteredNotes = [];
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
   *
   * Allocated against `allNoteIds` -- every note in the user's collection --
   * and NOT against `notes`, which holds only the active campaign's. The
   * documents share one flat collection, so a per-campaign maximum produces an
   * id that already exists as soon as the active campaign has fewer notes than
   * another: with two notes in campaign A and none in campaign B, B's first
   * note is allocated `note-1` and `createDocument` refuses to overwrite it,
   * which is bug #1422.
   */
  const generateSequentialNoteId = useCallback((): string => {
    // Find highest existing number
    const noteIds = allNoteIds
      .filter(id => id.startsWith('note-'))
      .map(id => {
        const match = id.match(/note-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });

    // Get next number in sequence (or start with 1 if none exist)
    const nextNumber = noteIds.length > 0 ? Math.max(...noteIds) + 1 : 1;
    return `note-${nextNumber}`;
  }, [allNoteIds]);

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
    const attribution = buildCreationAttribution({ uid: user.uid, activeGroupUserProfile });

    // Create note object locally only - don't save to Firebase yet
    const newNote: Note = {
      id: noteId,
      title,
      content,
      extractedEntities: [],
      status: "active",
      tags: [],
      updatedAt: now,
      ...attribution,
      campaignId: activeCampaignId,
      isUnsaved: true, // Mark as unsaved
    };
    
    // Add to local state immediately for instant feedback
    setNotes(prevNotes => [newNote, ...prevNotes]);
    // Claim the id straight away. Two creates in a row happen before any
    // refetch, so without this the second would be allocated the same number.
    setAllNoteIds(prevIds => prevIds.includes(noteId) ? prevIds : [...prevIds, noteId]);

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

    const now = new Date().toISOString();

    const updatedFields = {
      ...updates,
      updatedAt: now,
      // Don't include isUnsaved in updates - we'll handle it separately
    };

    const notesCollection = `groups/${activeGroupId}/users/${user.uid}/notes`;

    if (note.isUnsaved) {
      // First save - create document (exclude isUnsaved field entirely)
      const noteToSave = { ...note, ...updatedFields };
      delete noteToSave.isUnsaved; // Remove before saving

      await documentService.createDocument(notesCollection, noteToSave, noteId);
    } else {
      // Update existing document (don't send isUnsaved field). Attribution
      // is now stamped by DocumentService itself, not hand-rolled here.
      await documentService.updateDocumentWithAttribution(notesCollection, noteId, updatedFields);
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
   * Convert an extracted entity to a campaign element.
   *
   * Three of the four navigate to a create page with the extracted fields in
   * router state, and the form there writes the record.
   *
   * **The rumour does not, because a rumour has no page**
   * (`00-entity-authoring` §2.1). `/rumors/create` existed only to receive
   * this navigation -- the campaign-entities barrel said so in as many words
   * -- and what it offered was a form for reviewing five fields that were
   * already complete before it opened. The rumour is written here instead,
   * and the list opens its row, which is the same surface every other rumour
   * is edited in. That is what retired `RumorForm` and the page around it.
   *
   * It is also the only branch that returns a real id rather than `""`; the
   * other three cannot, because nothing is created until their form is
   * submitted.
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
    const provenance = `Created from note: ${note.title || note.id}`;
    let description = provenance; // Declare once

    /**
     * The note's own sentence about this entity, kept rather than dropped.
     *
     * `context` is the line the extractor read the entity out of, and it used
     * to survive only when the model returned no `description` -- the moment
     * it wrote one, the sentence the fact actually came from was discarded,
     * along with the note it came from. That is the opposite of the useful
     * case: a described entity is exactly the one worth being able to trace.
     *
     * Both are kept now, with the model's description first because it is the
     * summary, and the quoted sentence under it because it is the evidence.
     */
    const withContext = (modelDescription?: string): string => {
      const body = modelDescription?.trim() || provenance;
      const context = extraData.context?.trim();
      if (!context || body.includes(context)) return body;
      return `${body}\n\nContext: ${context}`;
    };

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
          description: withContext(extraData.description),
        };
        break;

      case "location":
        initialData = {
          // Use proper name field, fall back to text if not available
          name: extraData.name || entity.text,
          type: extraData.locationType || undefined,
          description: withContext(extraData.description),
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
        
      case "rumor": {
        // Map sourceType to valid values. Anything unrecognised is left unset
        // rather than coerced to 'other' -- since `15-9` that means "heard
        // from none of the other four", a real answer, and the extractor
        // guessing it would be answering on the reader's behalf.
        const validSourceTypes = ['npc', 'tavern', 'notice', 'traveler', 'other'];
        const sourceType =
          extraData.sourceType && validSourceTypes.includes(extraData.sourceType)
            ? extraData.sourceType
            : undefined;

        // Whitelisted, exactly as the source kind above is. The extraction
        // function's JSON schema offers a fourth status, "unknown", that
        // `RumorStatus` does not have -- and a rumour nobody has verified is
        // precisely what "unconfirmed" already names. This was taken on trust
        // until a converted note wrote `status: "unknown"` into Firestore,
        // where the rumours list could not group it and silently dropped the
        // row. `RumorForm`'s `<select>` had been sanitising it by accident.
        const validStatuses = ['confirmed', 'unconfirmed', 'false'];
        const status = validStatuses.includes(extraData.status)
          ? extraData.status
          : 'unconfirmed';

        const rumorId = await addRumor({
          title: extraData.title || entity.text,
          content: extraData.content || '',
          status,
          ...(sourceType ? { sourceType } : {}),
          /*
            The extractor's own `sourceName` ("Gaffer Gamgee"), which this
            ignored: it wrote `sourceType` into the name, so a converted
            rumour's source read "npc" under a source kind of NPC -- the same
            fact twice, once in the wrong field. The raw `sourceType` is still
            the fallback, but only when it was not a recognised kind, which is
            the case that fallback was actually for: an unrecognised value is
            usually the source's *name* in the wrong field.
          */
          sourceName: extraData.sourceName || (sourceType ? '' : extraData.sourceType || ''),
          relatedNPCs: [],
          relatedLocations: [],
          notes: [],
        });

        // Done here rather than by a form on arrival, which is what the
        // create page used to be for.
        await markEntityAsConverted(noteId, entityId, rumorId);
        navigate(`/rumors?highlight=${rumorId}`);
        return rumorId;
      }
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
    }
    
    // Return empty string since we're not creating immediately. The rumour
    // branch returned above, with a real id.
    return "";
  }, [getNoteById, navigate, addRumor, markEntityAsConverted]);
  
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

    // Refresh notes list
    await fetchNotes();
  }, [user?.uid, activeGroupId, documentService, fetchNotes]);
  
  // Create context value
  const value: NoteContextValue = {
    notes,
    isLoading: Boolean(loading) || isResolving,
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