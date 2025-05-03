// src/pages/notes/NotesPage.tsx
import React from "react";
import Typography from "../../components/core/Typography";
import Button from "../../components/core/Button";
import NotesList from "../../components/features/notes/NotesList";
import { useNotes } from "../../context/NoteContext";
import { useNavigation } from "../../hooks/useNavigation";

/**
 * Main page for user notes management
 * Shows list of notes with create option
 */
const NotesPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { createNote } = useNotes();

  /**
   * Create a new note and navigate to it
   */
  const handleCreateNote = async () => {
    try {
      const noteId = await createNote("New Note", "");
      navigateToPage(`/notes/${noteId}`);
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 notes-page`}>
      <div className="mb-8 flex items-center justify-between">
        <Typography variant="h2">My Notes</Typography>
        
        <div className="flex gap-3">
          <Button
            onClick={handleCreateNote}
            variant="primary"
            className={`create-note-button`}
          >
            <div className={`w-5 h-5 mr-2 icon-plus`} />
            New Note
          </Button>
        </div>
      </div>

      {/* List of user notes */}
      <NotesList />
    </div>
  );
};

export default NotesPage;