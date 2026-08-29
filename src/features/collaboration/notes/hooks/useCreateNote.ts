// src/features/collaboration/notes/hooks/useCreateNote.ts

import { useCallback } from "react";
import { useNotes } from "../context/NoteContext";
import { useCampaigns } from "features/user-management";
import { useNavigation } from "shared/hooks/useNavigation";

/**
 * Creates an empty note in the active campaign and opens it.
 *
 * This is the single creation path. `NotesPage` and `NotesList` each carried
 * their own copy of it, both passing the literal title "New Note" — which is
 * why every note in the index was called "New Note", since nothing ever
 * renamed one afterwards. The title is now empty on creation and the editor
 * derives a display title from the first line the user writes.
 *
 * Failure is logged, not thrown: both call sites are click handlers with no
 * error surface of their own, and navigating to a note that was never created
 * would be worse than doing nothing.
 */
export function useCreateNote(): { createAndOpen: () => Promise<void> } {
  const { createNote } = useNotes();
  const { activeCampaignId } = useCampaigns();
  const { navigateToPage } = useNavigation();

  const createAndOpen = useCallback(async () => {
    if (!activeCampaignId) {
      console.error("Cannot create note: No active campaign selected");
      return;
    }

    try {
      const noteId = await createNote("", "");
      navigateToPage(`/notes/${noteId}`);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  }, [activeCampaignId, createNote, navigateToPage]);

  return { createAndOpen };
}
