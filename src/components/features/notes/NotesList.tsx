// Updated src/components/features/notes/NotesList.tsx

import React from "react";
import Typography from "../../core/Typography";
import NoteCard from "./NoteCard";
import { useNotes } from "../../../context/NoteContext";
import { useCampaigns } from "../../../context/firebase";
import Button from "../../core/Button";
import { useNavigation } from "../../../hooks/useNavigation";
import { Loader2, AlertCircle, Book, Plus, Users } from 'lucide-react';

/**
 * Component for displaying a list of user notes filtered by active campaign
 * Now handles unsaved notes properly
 */
const NotesList: React.FC = () => {
  const { notes, isLoading, error, createNote } = useNotes();
  const { activeCampaignId, activeCampaign } = useCampaigns();
  const { navigateToPage } = useNavigation();

  /**
   * Create a new note and navigate to it (now instant)
   */
  const handleCreateNote = async () => {
    try {
      if (!activeCampaignId) {
        // This should not happen due to the UI checks, but handle it gracefully
        throw new Error("No active campaign selected. Please select a campaign first.");
      }
      
      // Create note locally (instant) and navigate
      const noteId = await createNote("New Note", "");
      navigateToPage(`/notes/${noteId}`);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 mr-3 animate-spin primary" />
        <Typography color="secondary">Loading notes...</Typography>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-8 error-container">
        <AlertCircle className="w-6 h-6 mr-3 status-failed" />
        <Typography color="error">{error}</Typography>
      </div>
    );
  }

  // No active campaign state
  if (!activeCampaignId) {
    return (
      <div className="notes-list space-y-4">        
        <div className="text-center py-12 border-2 border-dashed empty-container rounded-lg">
          <Users className="w-12 h-12 mx-auto mb-4 primary" />
          <Typography variant="h4" className="mb-2">
            No Campaign Selected
          </Typography>
          <Typography color="secondary" className="mb-4">
            Select a campaign to view and create notes. Notes are organized by campaign to keep your content organized.
          </Typography>
          <Button 
            variant="outline"
            className="select-campaign-button"
            disabled
          >
            <Users className="w-5 h-5 mr-2" />
            Select Campaign
          </Button>
        </div>
      </div>
    );
  }

  // Separate saved and unsaved notes for better organization
  const savedNotes = notes.filter(note => !note.isUnsaved);
  const unsavedNotes = notes.filter(note => note.isUnsaved);

  return (
    <div className="notes-list space-y-4">
      <div className="flex items-center justify-between">
        <Typography variant="body-sm" color="secondary">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
          {unsavedNotes.length > 0 && (
            <span className="ml-2 status-unknown">
              ({unsavedNotes.length} unsaved)
            </span>
          )}
        </Typography>
      </div>

      {/* Notes list */}
      {notes.length > 0 ? (
        <div className="space-y-3">
          {/* Show unsaved notes first with visual indicator */}
          {unsavedNotes.length > 0 && (
            <div className="space-y-3">
              <Typography variant="body-sm" className="status-unknown font-medium">
                Unsaved Notes
              </Typography>
              {unsavedNotes.map(note => (
                <div key={note.id} className="relative">
                  <NoteCard note={note} />
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-md card border status-unknown text-xs font-medium">
                    Not Saved
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Show saved notes */}
          {savedNotes.length > 0 && (
            <div className="space-y-3">
              {unsavedNotes.length > 0 && (
                <Typography variant="body-sm" color="secondary" className="font-medium mt-6">
                  Saved Notes
                </Typography>
              )}
              {savedNotes.map(note => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Empty state for active campaign with no notes
        <div className="text-center py-12 border-2 border-dashed empty-container rounded-lg">
          <Book className="w-12 h-12 mx-auto mb-4 primary" />
          <Typography variant="h4" className="mb-2">
            No notes for this campaign
          </Typography>
          <Typography color="secondary" className="mb-4">
            {activeCampaign ? (
              <>Create your first note for <span className="font-medium">{activeCampaign.name}</span> to start keeping track of important information</>
            ) : (
              "Create your first note to start keeping track of important information"
            )}
          </Typography>
          <Button 
            variant="primary"
            onClick={handleCreateNote}
            className="create-note-button"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Note
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotesList;