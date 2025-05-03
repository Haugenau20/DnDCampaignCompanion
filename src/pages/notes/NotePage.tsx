// src/pages/notes/NotePage.tsx
import React from "react";
import { useParams } from "react-router-dom";
import Typography from "../../components/core/Typography";
import Button from "../../components/core/Button";
import NoteEditor from "../../components/features/notes/NoteEditor";
import EntityExtractor from "../../components/features/notes/EntityExtractor";
import NoteReferences from "../../components/features/notes/NoteReferences";
import { useNavigation } from "../../hooks/useNavigation";
import { useNotes } from "../../context/NoteContext";

/**
 * Page for viewing and editing an individual user note
 */
const NotePage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const { navigateToPage } = useNavigation();
  const { deleteNote } = useNotes();

  if (!noteId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Typography color="error">Invalid note ID</Typography>
      </div>
    );
  }

  /**
   * Navigate back to notes list
   */
  const handleBackClick = () => {
    navigateToPage("/notes");
  };

  /**
   * Delete this note and navigate back
   */
  const handleDeleteNote = async () => {
    try {
      await deleteNote(noteId);
      navigateToPage("/notes");
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 note-page`}>
      <div className="mb-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBackClick}
          className={`back-button`}
        >
          <div className={`w-5 h-5 mr-2 icon-arrow-left`} />
          Back to Notes
        </Button>
        
        <Button
          variant="ghost"
          onClick={handleDeleteNote}
          className={`delete-button`}
        >
          <div className={`w-5 h-5 mr-2 icon-trash`} />
          Delete
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <NoteEditor noteId={noteId} />
        </div>
        <div className="space-y-6">
          <EntityExtractor noteId={noteId} />
          <NoteReferences noteId={noteId} />
        </div>
      </div>
    </div>
  );
};

export default NotePage;