// src/components/features/notes/NoteEditor.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Note } from "../../../types/note";
import Typography from "../../core/Typography";
import Input from "../../core/Input";
import Button from "../../core/Button";
import { useNotes } from "../../../context/NoteContext";
import { debounce } from "lodash";
import { Loader2 } from 'lucide-react';

interface NoteEditorProps {
  /** ID of the note to edit */
  noteId: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Callback when user requests entity extraction */
  onExtractEntities?: () => void;
  /** Callback when note is saved (auto or manual) */
  onSave?: () => void;
}

/**
 * Component for editing note content
 * Features auto-save functionality via debounce
 */
const NoteEditor: React.FC<NoteEditorProps> = ({ 
  noteId, 
  readOnly = false,
  onExtractEntities,
  onSave 
}) => {
  const { getNoteById, updateNote } = useNotes();
  const [note, setNote] = useState<Note | undefined>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Autosave interval configuration
  const AUTOSAVE_DELAY_MS = 45000; // 45 seconds - optimized for D&D sessions
  const MIN_CONTENT_LENGTH = 3; // Minimum characters to trigger autosave

  // Load note data when ID changes
  useEffect(() => {
    const noteData = getNoteById(noteId);
    setNote(noteData);
    if (noteData) {
      setTitle(noteData.title || "");
      setContent(noteData.content || "");
      // Set last saved time from note's modification date
      setLastSaved(noteData.dateModified ? new Date(noteData.dateModified) : null);
    }
  }, [noteId, getNoteById]);

  // Debounced save function with improved timing
  const debouncedSave = useCallback(
    debounce(async (noteId: string, field: string, value: string) => {
      // Skip save if content is too short
      if (field === "content" && value.length < MIN_CONTENT_LENGTH) {
        return;
      }

      try {
        setIsSaving(true);
        await updateNote(noteId, { 
          [field]: value, 
          updatedAt: new Date().toISOString() 
        });
        setLastSaved(new Date());
        // Notify parent of save
        onSave?.();
      } catch (error) {
        console.error("Failed to save note:", error);
      } finally {
        setIsSaving(false);
      }
    }, AUTOSAVE_DELAY_MS),
    [updateNote, onSave]
  );

  // Manual save function for Ctrl+S
  const handleManualSave = useCallback(async () => {
    if (!note || readOnly) return;
    
    try {
      setIsSaving(true);
      await updateNote(note.id, { 
        title,
        content,
        updatedAt: new Date().toISOString() 
      });
      setLastSaved(new Date());
      // Notify parent of save
      onSave?.();
    } catch (error) {
      console.error("Failed to manually save note:", error);
    } finally {
      setIsSaving(false);
    }
  }, [note, readOnly, title, content, updateNote, onSave]);

  // Add keyboard shortcut for manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

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

  // Format last saved time
  const getLastSavedText = () => {
    if (!lastSaved) return "Never saved";
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `Saved ${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      return `Saved ${diffInMinutes}m ago`;
    } else {
      const diffInHours = Math.floor(diffInSeconds / 3600);
      return `Saved ${diffInHours}h ago`;
    }
  };

  return (
    <div className="note-editor space-y-4">
      {/* Note header */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex justify-between items-center">
          <Typography variant="h3">
            Title
          </Typography>
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
      <div className="flex justify-between items-center">
        <Typography variant="h3">
          Content
        </Typography>
      </div>
      {/* Content editor */}
      <Input
        value={content}
        onChange={handleContentChange}
        isTextArea={true}
        rows={30}
        placeholder="Write your note here..."
        disabled={readOnly}
        className="note-textarea font-mono"
      />

      {/* Enhanced status bar with manual save button */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Typography variant="body-sm" color="secondary">
              {isSaving ? "Saving..." : getLastSavedText()}
            </Typography>
            {isSaving && (
              <Loader2 className="w-4 h-4 animate-spin primary" />
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleManualSave}
            disabled={readOnly || isSaving}
            className="save-manually-button"
          >
            Save (Ctrl+S)
          </Button>
        </div>
        
        {/* Manual save button */}
        <div className="flex justify-end">
          <Typography variant="body-sm" color="secondary" className="italic">
            Autosave every {AUTOSAVE_DELAY_MS / 1000}s
          </Typography>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;