// src/components/features/notes/NoteEditor.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Note } from "../../../types/note";
import Typography from "../../core/Typography";
import Input from "../../core/Input";
import Button from "../../core/Button";
import { useNotes } from "../../../context/NoteContext";
import { debounce } from "lodash";

interface NoteEditorProps {
  /** ID of the note to edit */
  noteId: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Callback when user requests entity extraction */
  onExtractEntities?: () => void;
}

/**
 * Component for editing note content
 * Features auto-save functionality via debounce
 */
const NoteEditor: React.FC<NoteEditorProps> = ({ 
  noteId, 
  readOnly = false,
  onExtractEntities 
}) => {
  const { getNoteById, updateNote } = useNotes();
  const [note, setNote] = useState<Note | undefined>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load note data when ID changes
  useEffect(() => {
    const noteData = getNoteById(noteId);
    setNote(noteData);
    if (noteData) {
      setTitle(noteData.title || "");
      setContent(noteData.content || "");
    }
  }, [noteId, getNoteById]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (noteId: string, field: string, value: string) => {
      try {
        setIsSaving(true);
        await updateNote(noteId, { [field]: value, updatedAt: new Date().toISOString() });
      } catch (error) {
        console.error("Failed to save note:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [updateNote]
  );

  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (!readOnly && note) {
      debouncedSave(note.id, "title", newTitle);
    }
  };

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    if (!readOnly && note) {
      debouncedSave(note.id, "content", newContent);
    }
  };

  // Handle entity extraction
  const handleExtractEntities = () => {
    if (onExtractEntities) {
      onExtractEntities();
    }
  };

  return (
    <div className="note-editor space-y-4">
      {/* Note header */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex justify-between items-center">
          <Typography variant="h3">
            Note
          </Typography>
          <Button
            onClick={handleExtractEntities}
            variant="outline"
            size="sm"
            disabled={!note || readOnly}
          >
            Extract Entities
          </Button>
        </div>
        
        {/* Title input */}
        <Input
          value={title}
          onChange={handleTitleChange}
          placeholder="Note Title"
          disabled={readOnly}
          className="note-title font-bold"
        />
      </div>

      {/* Content editor */}
      <Input
        value={content}
        onChange={handleContentChange}
        isTextArea={true}
        rows={15}
        placeholder="Write your note here..."
        disabled={readOnly}
        className="note-textarea font-mono"
      />

      {/* Status bar */}
      <div className="flex justify-between items-center">
        <Typography variant="body-sm" color="secondary">
          {isSaving ? "Saving..." : "All changes saved"}
        </Typography>
        <Typography variant="body-sm" color="secondary">
          Last updated: {note?.updatedAt ? new Date(note.updatedAt).toLocaleString() : "Never"}
        </Typography>
      </div>
    </div>
  );
};

export default NoteEditor;