// Updated src/features/collaboration/notes/components/NoteEditor.tsx

import React, { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import { Note } from "../types";
import Typography from "../../../../core/components/Typography";
import { useNotes } from "../context/NoteContext";
import { deriveTitle, LEGACY_DEFAULT_TITLE } from "../utils/note-title";
import { formatLastSaved } from "../utils/save-status";
import { Loader2, AlertCircle, ArrowLeft, Archive, Trash2, Check } from 'lucide-react';

interface NoteEditorProps {
  /** ID of the note to edit */
  noteId: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Callback when note is saved (auto or manual) */
  onSave?: () => void;
  /** Rendered in the surface's own top bar, left of Archive/Delete. */
  onBack?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
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
  onSave,
  onBack,
  onArchive,
  onDelete
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
   * (the Ctrl+S call site) — the ref-exposed
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
  const bodyRef = useRef<HTMLTextAreaElement>(null);

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
      // The exact legacy "New Note" placeholder (persisted on every note
      // created before this redesign) is not a real explicit title -- see
      // LEGACY_DEFAULT_TITLE in note-title.ts. Treating it as one would
      // show "New Note" in the title field, with no derivation hint, on
      // every pre-existing note.
      const loadedTitle = noteData.title?.trim() ?? "";
      setHasExplicitTitle(!!loadedTitle && loadedTitle !== LEGACY_DEFAULT_TITLE);
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
      const isNewNote = !!currentNote?.isUnsaved;
      // A brand-new note (isUnsaved: true) exists only in React state --
      // updateNote's own unsaved branch just rewrites that state and returns,
      // writing nothing to Firestore. saveNote is the only path that actually
      // creates the document, so autosave must use it for a new note (C1).
      // Once the note is saved once, updateNote correctly routes further
      // edits through saveNote internally.
      const persist = isNewNote ? saveNote : updateNote;
      await persist(note.id, { title: nextTitle, content: nextContent });

      if (isNewNote) {
        // Reflect the now-created document locally so the footer's
        // "Not saved to server" state clears without waiting on a reload.
        setNote(prev => (prev ? { ...prev, isUnsaved: false } : prev));
      }
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      onSave?.();
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSaving(false);
    }
  }, [note, readOnly, getNoteById, updateNote, saveNote, onSave]);

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
   * Fire-and-forget wrapper around `handleManualSave` for the Ctrl+S
   * shortcut. The call site doesn't await the promise, so
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
      // Accept Cmd+S (metaKey) alongside Ctrl+S -- otherwise macOS users have
      // no working shortcut at all, since they don't carry a physical Ctrl
      // key in the same role. The footer label below names both.
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
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

  // Grow the body to fit its content instead of sitting at a fixed 30 rows.
  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [content]);

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
      <div className="flex items-center gap-2">
        <Check className="w-4 h-4 status-completed" />
        <Typography variant="body-sm" color="secondary" className="text-[13px]">
          {`${lastSavedText} · saves as you write`}
        </Typography>
      </div>
    );
  };

  return (
    <div className="note-editor card rounded-xl flex flex-col min-h-[70vh]">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b card-border text-[13px]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 typography-secondary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          All notes
        </button>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onArchive}
            disabled={readOnly}
            className="flex items-center gap-1.5 typography-secondary hover:underline disabled:opacity-50"
          >
            <Archive className="w-4 h-4" />
            Archive
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={readOnly}
            className="flex items-center gap-1.5 typography-error hover:underline disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* The writing itself */}
      <div className="flex-1 flex flex-col px-8 py-6">
        <input
          value={effectiveTitle}
          onChange={handleTitleChange}
          placeholder="Untitled note"
          disabled={readOnly}
          aria-label="Note title"
          className="note-title w-full bg-transparent border-none outline-none typography-heading text-[30px] font-medium placeholder:opacity-40"
        />

        {!hasExplicitTitle && (
          <Typography variant="caption" color="muted" className="mt-1 text-xs">
            Taken from the first line. Click to write your own title.
          </Typography>
        )}

        <textarea
          ref={bodyRef}
          value={content}
          onChange={handleContentChange}
          placeholder="Write your note here..."
          disabled={readOnly}
          aria-label="Note content"
          className="note-textarea flex-1 w-full mt-5 bg-transparent border-none outline-none resize-none text-[17px] leading-[1.65] placeholder:opacity-40"
          style={{ minHeight: "40vh" }}
        />
      </div>

      {/* Footer: save state stated once, and only once */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t card-border bg-secondary text-[13px]">
        {getStatusIndicator()}
        <Typography variant="body-sm" color="secondary" className="text-[13px]">
          {`${wordCount.toLocaleString()} ${wordCount === 1 ? "word" : "words"} · Ctrl+S (⌘S on Mac) to save now`}
        </Typography>
      </div>
    </div>
  );
});

NoteEditor.displayName = 'NoteEditor';

export default NoteEditor;
