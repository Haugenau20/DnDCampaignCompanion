// src/hooks/useNoteData.ts
import { useState, useEffect, useCallback } from "react";
import { Note } from "../types/note";
import DocumentService from "../services/firebase/data/DocumentService";
import { useAuth, useGroups, useCampaigns } from "../context/firebase";

/**
 * Hook for fetching and managing user notes filtered by active campaign
 * Uses Firebase to retrieve notes from the user-specific path and filters by campaign
 */
export const useNoteData = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const documentService = DocumentService.getInstance();

  /**
   * Fetches notes from Firebase for the current user and filters by active campaign
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
      
      // Fetch all notes using DocumentService
      const fetchedData = await documentService.getCollection<Note>(notesPath);
      
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
      
      console.log(`useNoteData: Fetched ${fetchedData.length} total notes, showing ${sortedNotes.length} for campaign ${activeCampaignId}`);
      
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
  }, [user?.uid, activeGroupId, activeCampaignId, documentService]);

  // Load notes on mount and when user/group/campaign changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  /**
   * Get notes for a specific campaign (utility function)
   * @param campaignId The campaign ID to filter by
   * @returns Promise resolving to filtered notes array
   */
  const getNotesForCampaign = useCallback(async (campaignId: string): Promise<Note[]> => {
    try {
      if (!user?.uid || !activeGroupId) {
        return [];
      }
      
      const notesPath = `groups/${activeGroupId}/users/${user.uid}/notes`;
      const allNotes = await documentService.getCollection<Note>(notesPath);
      
      // Filter by the specified campaign ID
      const campaignNotes = allNotes.filter(note => note.campaignId === campaignId);
      
      // Sort by updatedAt descending
      return campaignNotes.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (err) {
      console.error(`Error fetching notes for campaign ${campaignId}:`, err);
      return [];
    }
  }, [user?.uid, activeGroupId, documentService]);

  /**
   * Get count of notes for a specific campaign (utility function)
   * @param campaignId The campaign ID to count notes for
   * @returns Promise resolving to note count
   */
  const getNoteCountForCampaign = useCallback(async (campaignId: string): Promise<number> => {
    try {
      const campaignNotes = await getNotesForCampaign(campaignId);
      return campaignNotes.length;
    } catch (err) {
      console.error(`Error counting notes for campaign ${campaignId}:`, err);
      return 0;
    }
  }, [getNotesForCampaign]);

  return {
    notes,
    loading,
    error,
    refreshNotes: fetchNotes,
    getNotesForCampaign,
    getNoteCountForCampaign,
    hasRequiredContext: !!activeGroupId && !!user?.uid,
    activeCampaignId // Expose active campaign ID for debugging/display
  };
};