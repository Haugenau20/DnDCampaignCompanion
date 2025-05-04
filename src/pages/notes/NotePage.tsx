// src/pages/notes/NotePage.tsx
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import Typography from "../../components/core/Typography";
import Button from "../../components/core/Button";
import NoteEditor from "../../components/features/notes/NoteEditor";
import EntityExtractor from "../../components/features/notes/EntityExtractor";
import NoteReferences from "../../components/features/notes/NoteReferences";
import { useNavigation } from "../../hooks/useNavigation";
import { useNotes } from "../../context/NoteContext";
import { ArrowLeft, Trash2 } from 'lucide-react';
import { PotentialReference } from "../../components/features/notes/NoteReferences";

/**
 * Page for viewing and editing an individual user note
 */
const NotePage: React.FC = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const { navigateToPage } = useNavigation();
  const { deleteNote } = useNotes();
  const [referenceUpdateTrigger, setReferenceUpdateTrigger] = useState(0);
  const [foundReferences, setFoundReferences] = useState<PotentialReference[]>([]);

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
  
  /**
   * Trigger a refresh of note references
   */
  const refreshReferences = () => {
    setReferenceUpdateTrigger(prev => prev + 1);
  };

  /**
   * Handle references found by NoteReferences component
   */
  const handleReferencesFound = (references: PotentialReference[]) => {
    setFoundReferences(references);
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 note-page`}>
      <div className="mb-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBackClick}
          className={`back-button`}
          startIcon={<ArrowLeft className="w-5 h-5" />}
        >
          Back to Notes
        </Button>
        
        <Button
          variant="ghost"
          onClick={handleDeleteNote}
          className={`delete-button`}
          startIcon={<Trash2 className="w-5 h-5" />}
        >
          Delete
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-6 col-span-2">
          <NoteEditor 
            noteId={noteId}
            onSave={refreshReferences} // Connect saves to reference refresh
          />
        </div>
        <div className="space-y-6">
          <EntityExtractor 
            noteId={noteId}
            existingReferences={foundReferences} // Pass found references to EntityExtractor
            onEntityConverted={refreshReferences} // Also refresh on entity conversion
          />
          <NoteReferences 
            noteId={noteId} 
            key={referenceUpdateTrigger} // Force re-render when trigger changes
            onReferencesFound={handleReferencesFound} // Capture found references
          />
        </div>
      </div>
    </div>
  );
};

export default NotePage;