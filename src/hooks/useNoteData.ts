// src/hooks/useNoteData.ts
import { useState, useEffect, useCallback } from "react";
import { Note } from "../types/note";
import DocumentService from "../services/firebase/data/DocumentService";
import { useAuth, useGroups } from "../context/firebase";

/**
 * Hook for fetching and managing user notes
 * Uses Firebase to retrieve notes from the user-specific path
 */
export const useNoteData = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const documentService = DocumentService.getInstance();

  /**
   * Fetches notes from Firebase for the current user
   */
  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.uid || !activeGroupId) {
        setNotes([]);
        return [];
      }
      
      // Construct the correct path for user notes
      const notesPath = `groups/${activeGroupId}/users/${user.uid}/notes`;
      
      // Fetch notes using DocumentService
      const fetchedData = await documentService.getCollection<Note>(notesPath);
      
      // Sort notes by updatedAt timestamp descending (most recent first)
      const sortedNotes = fetchedData.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      setNotes(sortedNotes);
      return sortedNotes;
    } catch (err) {
      console.error("Error fetching notes:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch notes");
      setNotes([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.uid, activeGroupId, documentService]);

  // Load notes on mount and when user/group changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    loading,
    error,
    refreshNotes: fetchNotes,
    hasRequiredContext: !!activeGroupId && !!user?.uid
  };
};