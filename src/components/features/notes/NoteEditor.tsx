// Updated src/components/features/notes/NoteEditor.tsx

import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Note } from "../../../types/note";
import Typography from "../../core/Typography";
import Input from "../../core/Input";
import Button from "../../core/Button";
import { useNotes } from "../../../context/NoteContext";
import { debounce } from "lodash";
import { Loader2, Save, AlertCircle } from 'lucide-react';

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

export interface NoteEditorRef {
  /** Get the current content from the editor */
  getCurrentContent: () => { title: string; content: string };
  /** Save the current content to Firebase */
  saveCurrentContent: () => Promise<void>;
}

/**
 * Component for editing note content
 * Features auto-save functionality via debounce and handles unsaved notes
 * Exposes methods to get and save current content for external components
 */
const NoteEditor = forwardRef<NoteEditorRef, NoteEditorProps>(({ 
  noteId, 
  readOnly = false,
  onExtractEntities,
  onSave 
}, ref) => {
  const { getNoteById, updateNote, saveNote } = useNotes();
  const [note, setNote] = useState<Note | undefined>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Autosave interval configuration
  const AUTOSAVE_DELAY_MS = 45000; // 45 seconds - optimized for D&D sessions
  const MIN_CONTENT_LENGTH = 3; // Minimum characters to trigger autosave

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    getCurrentContent: () => ({ title, content }),
    saveCurrentContent: handleManualSave
  }), [title, content]);

  // Load note data when ID changes
  useEffect(() => {
    const noteData = getNoteById(noteId);
    setNote(noteData);
    if (noteData) {
      setTitle(noteData.title || "");
      setContent(noteData.content || "");
      setHasUnsavedChanges(!!noteData.isUnsaved);
      // Set last saved time from note's modification date (if saved)
      setLastSaved(noteData.isUnsaved ? null : (noteData.dateModified ? new Date(noteData.dateModified) : null));
    }
  }, [noteId, getNoteById]);

  // Debounced save function for autosave
  const debouncedSave = useCallback(
    debounce(async (noteId: string, field: string, value: string) => {
      // Skip save if content is too short
      if (field === "content" && value.length < MIN_CONTENT_LENGTH) {
        return;
      }

      try {
        setIsSaving(true);
        
        // For unsaved notes, just update locally until manual save
        const currentNote = getNoteById(noteId);
        if (currentNote?.isUnsaved) {
          await updateNote(noteId, { [field]: value });
          setHasUnsavedChanges(true);
        } else {
          // For saved notes, save to Firebase
          await updateNote(noteId, { [field]: value });
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
        }
        
        // Notify parent of save
        onSave?.();
      } catch (error) {
        console.error("Failed to save note:", error);
      } finally {
        setIsSaving(false);
      }
    }, AUTOSAVE_DELAY_MS),
    [updateNote, getNoteById, onSave]
  );

  // Manual save function for Ctrl+S and save button
  const handleManualSave = useCallback(async () => {
    if (!note || readOnly) return;
    
    try {
      setIsSaving(true);
      
      // Always save to Firebase on manual save
      await saveNote(note.id, { 
        title,
        content 
      });
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      // Notify parent of save
      onSave?.();
    } catch (error) {
      console.error("Failed to manually save note:", error);
      throw error; // Re-throw so calling components can handle the error
    } finally {
      setIsSaving(false);
    }
  }, [note, readOnly, title, content, saveNote, onSave]);

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
    setHasUnsavedChanges(true);
    
    if (!readOnly && note) {
      debouncedSave(note.id, "title", newTitle);
    }
  };

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setHasUnsavedChanges(true);
    
    if (!readOnly && note) {
      debouncedSave(note.id, "content", newContent);
    }
  };

  // Format last saved time
  const getLastSavedText = () => {
    if (note?.isUnsaved || hasUnsavedChanges) {
      return "Not saved";
    }
    
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

  // Get status indicator
  const getStatusIndicator = () => {
    if (isSaving) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin primary" />
          <Typography variant="body-sm" color="secondary">Saving...</Typography>
        </div>
      );
    }

    if (note?.isUnsaved || hasUnsavedChanges) {
      return (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 status-unknown" />
          <Typography variant="body-sm" className="status-unknown">
            {note?.isUnsaved ? "Not saved to server" : "Unsaved changes"}
          </Typography>
        </div>
      );
    }

    return (
      <Typography variant="body-sm" color="secondary">
        {getLastSavedText()}
      </Typography>
    );
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
          {getStatusIndicator()}
          
          <Button
            variant="primary"
            size="sm"
            onClick={handleManualSave}
            disabled={readOnly || isSaving}
            startIcon={<Save className="w-4 h-4" />}
            className="save-manually-button"
          >
            Save (Ctrl+S)
          </Button>
        </div>
        
        {/* Helpful text */}
        <div className="flex justify-between items-center">
          <Typography variant="body-sm" color="secondary" className="italic">
            {note?.isUnsaved ? "Click Save to store this note permanently" : `Autosave every ${AUTOSAVE_DELAY_MS / 1000}s`}
          </Typography>
          
          {(note?.isUnsaved || hasUnsavedChanges) && (
            <Typography variant="body-sm" className="status-unknown italic">
              Remember to save your work!
            </Typography>
          )}
        </div>
      </div>
    </div>
  );
});

NoteEditor.displayName = 'NoteEditor';

export default NoteEditor;