// Updated src/features/collaboration/notes/components/NoteEditor.tsx

import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import { Note } from "../types";
import Typography from "../../../../core/components/Typography";
import Input from "../../../../core/components/Input";
import Button from "../../../../core/components/Button";
import { useNotes } from "../context/NoteContext";
import { deriveTitle } from "../utils/note-title";
import { formatLastSaved } from "../utils/save-status";
import { Loader2, Save, AlertCircle } from 'lucide-react';

interface NoteEditorProps {
  /** ID of the note to edit */
  noteId: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Callback when note is saved (auto or manual) */
  onSave?: () => void;
}

export interface NoteEditorRef {
  /** Get the current content from the editor */
  getCurrentContent: () => { title: string; content: string };
  /** Save the current content to Firebase */
  saveCurrentContent: () => Promise<void>;
}

/** Idle delay before an autosave fires. Short enough that a pause in real
 *  prose reaches the server; the interval below covers continuous writing. */
const AUTOSAVE_DEBOUNCE_MS = 2000;
/** True interval save while the note is dirty. The debounce alone fires only
 *  after typing STOPS, so a writer who never pauses was never saved -- while
 *  the editor claimed "Autosave every 45s". */
const AUTOSAVE_INTERVAL_MS = 30000;
// MIN_CONTENT_LENGTH is deleted: it returned early with no state change, so a
// two-character note read "Unsaved changes" indefinitely with no explanation.

/**
 * Component for editing note content
 * Features auto-save functionality (2s idle debounce + a real 30s interval
 * while dirty) and handles unsaved notes.
 * Exposes methods to get and save current content for external components.
 */
const NoteEditor = forwardRef<NoteEditorRef, NoteEditorProps>(({
  noteId,
  readOnly = false,
  onSave
}, ref) => {
  const { getNoteById, updateNote, saveNote } = useNotes();
  const [note, setNote] = useState<Note | undefined>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  /** True once the loaded note had an explicit title, or the user has typed
   *  one. While false, the title shown and saved is derived from the first
   *  content line instead. No new persisted field -- this is purely local. */
  const [hasExplicitTitle, setHasExplicitTitle] = useState(false);
  /**
   * Error message from the most recent manual save attempt, surfaced to the
   * user via {@link getStatusIndicator}. Only set by {@link triggerManualSave}
   * (the Save button / Ctrl+S call sites) — the ref-exposed
   * `saveCurrentContent` still rejects directly so EntityExtractor can abort
   * AI extraction on a failed pre-extraction save (bug #1051).
   */
  const [saveError, setSaveError] = useState<string | null>(null);

  // Refs mirroring the latest title/content/hasExplicitTitle so the debounce
  // timeout and interval callbacks always read fresh values without having
  // to be re-created (and thus reset) on every keystroke.
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const hasExplicitTitleRef = useRef(hasExplicitTitle);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { hasExplicitTitleRef.current = hasExplicitTitle; }, [hasExplicitTitle]);

  const effectiveTitle = hasExplicitTitle ? title : deriveTitle(content);
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    getCurrentContent: () => ({ title: effectiveTitle, content }),
    saveCurrentContent: handleManualSave
  }), [effectiveTitle, content]);

  // Load note data when ID changes
  useEffect(() => {
    const noteData = getNoteById(noteId);
    setNote(noteData);
    if (noteData) {
      setTitle(noteData.title || "");
      setContent(noteData.content || "");
      setHasUnsavedChanges(!!noteData.isUnsaved);
      setHasExplicitTitle(!!noteData.title?.trim());
      // Set last saved time from note's modification date (if saved)
      setLastSaved(noteData.isUnsaved ? null : (noteData.dateModified ? new Date(noteData.dateModified) : null));
    }
  }, [noteId, getNoteById]);

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  // Clear any pending debounce timer on unmount.
  useEffect(() => clearDebounceTimer, [clearDebounceTimer]);

  /**
   * The shared autosave write: always saves both fields together so a
   * content-only edit still persists a title derived from the new content,
   * and a title-only edit doesn't clobber content. Used by both the idle
   * debounce and the dirty-note interval below.
   */
  const performAutosave = useCallback(async () => {
    if (!note || readOnly) return;

    const nextTitle = hasExplicitTitleRef.current ? titleRef.current : deriveTitle(contentRef.current);
    const nextContent = contentRef.current;

    try {
      setIsSaving(true);

      const currentNote = getNoteById(note.id);
      await updateNote(note.id, { title: nextTitle, content: nextContent });

      if (currentNote?.isUnsaved) {
        // For unsaved notes, just update locally until manual save
        setHasUnsavedChanges(true);
      } else {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      }

      onSave?.();
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSaving(false);
    }
  }, [note, readOnly, getNoteById, updateNote, onSave]);

  const scheduleAutosave = useCallback(() => {
    clearDebounceTimer();
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      performAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [clearDebounceTimer, performAutosave]);

  // Real interval save while the note is dirty. The debounce above only fires
  // after typing STOPS, so a writer who never pauses was never saved. Cleared
  // on unmount and whenever the note goes clean (hasUnsavedChanges -> false).
  useEffect(() => {
    if (readOnly || !hasUnsavedChanges || !note) return;
    const id = window.setInterval(() => {
      performAutosave();
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [readOnly, hasUnsavedChanges, note, performAutosave]);

  // Manual save function for Ctrl+S and save button
  const handleManualSave = useCallback(async () => {
    if (!note || readOnly) return;

    const nextTitle = hasExplicitTitle ? title : deriveTitle(content);

    try {
      setIsSaving(true);

      // Always save to Firebase on manual save
      await saveNote(note.id, {
        title: nextTitle,
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
  }, [note, readOnly, hasExplicitTitle, title, content, saveNote, onSave]);

  /**
   * Fire-and-forget wrapper around `handleManualSave` for the Save button and
   * Ctrl+S shortcut. Neither call site awaits the promise, so
   * `handleManualSave`'s re-thrown error (needed by the imperative
   * `saveCurrentContent` ref contract — see bug #1051) would otherwise become
   * an unhandled promise rejection with nothing shown to the user. This
   * wrapper catches it and surfaces it via `saveError` instead.
   */
  const triggerManualSave = useCallback(() => {
    handleManualSave()
      .then(() => setSaveError(null))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Failed to save note.";
        setSaveError(message);
      });
  }, [handleManualSave]);

  // Add keyboard shortcut for manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        triggerManualSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [triggerManualSave]);

  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setHasExplicitTitle(true);
    hasExplicitTitleRef.current = true;
    setHasUnsavedChanges(true);
    setSaveError(null);

    if (!readOnly && note) {
      scheduleAutosave();
    }
  };

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setHasUnsavedChanges(true);
    setSaveError(null);

    if (!readOnly && note) {
      scheduleAutosave();
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

    if (saveError) {
      return (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 typography-error" />
          <Typography variant="body-sm" color="error">
            {saveError}
          </Typography>
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

    const lastSavedText = lastSaved ? formatLastSaved(lastSaved) : "Not saved yet";

    return (
      <Typography variant="body-sm" color="secondary">
        {lastSavedText}
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
          value={effectiveTitle}
          onChange={handleTitleChange}
          placeholder="Untitled note"
          disabled={readOnly}
          className="note-title font-bold"
        />

        {!hasExplicitTitle && (
          <Typography variant="caption" color="muted" className="text-xs">
            Taken from the first line. Click to write your own title.
          </Typography>
        )}
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

      {/* Status bar: save state is stated exactly once, via getStatusIndicator */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          {getStatusIndicator()}

          <Button
            variant="primary"
            size="sm"
            onClick={triggerManualSave}
            disabled={readOnly || isSaving}
            startIcon={<Save className="w-4 h-4" />}
            className="save-manually-button"
          >
            Save (Ctrl+S)
          </Button>
        </div>

        <Typography variant="body-sm" color="secondary">
          {`${wordCount} ${wordCount === 1 ? "word" : "words"}`}
        </Typography>
      </div>
    </div>
  );
});

NoteEditor.displayName = 'NoteEditor';

export default NoteEditor;
