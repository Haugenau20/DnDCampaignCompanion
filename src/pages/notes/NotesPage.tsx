// src/pages/notes/NotesPage.tsx
import React from "react";
import Typography from "../../components/core/Typography";
import Button from "../../components/core/Button";
import NotesList from "../../components/features/notes/NotesList";
import { useNotes } from "../../context/NoteContext";
import { useCampaigns } from "../../context/firebase";
import { useNavigation } from "../../hooks/useNavigation";
import { Plus, AlertCircle } from 'lucide-react';

/**
 * Main page for user notes management
 * Shows list of notes with create option, filtered by active campaign
 */
const NotesPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { createNote } = useNotes();
  const { activeCampaignId, activeCampaign } = useCampaigns();

  /**
   * Create a new note and navigate to it
   */
  const handleCreateNote = async () => {
    try {
      if (!activeCampaignId) {
        // Show error or prompt to select campaign
        console.error("Cannot create note: No active campaign selected");
        return;
      }
      
      const noteId = await createNote("New Note", "");
      navigateToPage(`/notes/${noteId}`);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 notes-page`}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Typography variant="h2">My Notes</Typography>
          {activeCampaign && (
            <Typography variant="body" color="secondary" className="mt-2">
              Campaign: <span className="font-medium">{activeCampaign.name}</span>
            </Typography>
          )}
          {!activeCampaignId && (
            <div className="flex items-center mt-2 gap-2">
              <AlertCircle className="w-4 h-4 status-warning" />
              <Typography variant="body-sm" color="secondary">
                No campaign selected - select a campaign to view and create notes
              </Typography>
            </div>
          )}
        </div>
        
        {/* Only show create button if we have an active campaign */}
        {activeCampaignId && (
          <div className="flex gap-3">
            <Button
              onClick={handleCreateNote}
              variant="primary"
              className={`create-note-button`}
            >
              <Plus className="w-5 h-5 mr-2" />
              New Note
            </Button>
          </div>
        )}
      </div>

      {/* List of user notes */}
      <NotesList />
    </div>
  );
};

export default NotesPage;