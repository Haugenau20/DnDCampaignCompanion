// src/hooks/useNoteData.ts
import { useState, useEffect, useCallback } from "react";
import { Note } from "../types/note";
import { useFirebaseData } from "./useFirebaseData";
import { useAuth, useGroups } from "../context/firebase";

/**
 * Hook for fetching and managing user notes
 * Uses Firebase to retrieve notes from the user-specific path
 */
export const useNoteData = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  
  // Only create path if dependencies are available
  const path = user?.uid && activeGroupId 
    ? `groups/${activeGroupId}/users/${user.uid}/notes` 
    : null;
  
  const { 
    getData, 
    loading, 
    error, 
    data 
  } = useFirebaseData<Note>({ collection: path || "" });

  /**
   * Fetches notes from Firebase for the current user
   */
  const fetchNotes = useCallback(async () => {
    try {
      if (!path) {
        setNotes([]);
        return [];
      }
      
      const fetchedData = await getData();
      // Sort notes by updatedAt timestamp descending (most recent first)
      const sortedNotes = fetchedData.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setNotes(sortedNotes);
      return sortedNotes;
    } catch (err) {
      console.error("Error fetching notes:", err);
      setNotes([]);
      return [];
    }
  }, [getData, path]);

  // Load notes on mount and when user/group changes
  useEffect(() => {
    if (path) {
      fetchNotes();
    } else {
      setNotes([]);
    }
  }, [fetchNotes, path]);
  
  // Update notes when Firebase data changes
  useEffect(() => {
    if (data?.length > 0) {
      const sortedNotes = [...data].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setNotes(sortedNotes);
    } else if (!user || !activeGroupId) {
      setNotes([]);
    }
  }, [data, user, activeGroupId]);

  return {
    notes,
    loading,
    error,
    refreshNotes: fetchNotes,
    hasRequiredContext: !!activeGroupId && !!user?.uid
  };
};