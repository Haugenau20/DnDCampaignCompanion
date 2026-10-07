// src/shared/components/entity-page/EntityNotes.tsx
import React, { useEffect, useId, useMemo, useState } from 'react';
import { TEXT_LIMITS } from 'core/constants/textLimits';
import Typography from 'core/components/Typography';
import { InlineEditor, NoteHistory } from 'shared/components/inline-edit';
import type { EntityNote } from 'shared/utils/entity-notes';
import FieldLabel from './FieldLabel';

export interface EntityNotesProps<T extends EntityNote> {
  /** The record's notes, in stored order. Shown oldest first, which the heading says. */
  notes: readonly T[] | undefined;
  /** Whether the viewer may change the record: hides the composer and each note's actions. */
  canEdit: boolean;
  /** Writes a new note. Must reject on failure, as `InlineEditor` asks. */
  onAdd: (text: string) => Promise<void>;
  /** Writes a note's new text. Must reject on failure. */
  onEdit: (note: T, text: string) => Promise<void>;
  /** Removes a note. Must reject on failure. */
  onDelete: (note: T) => Promise<void>;
  /** The composer's placeholder, in the record's own terms. */
  placeholder?: string;
}

/**
 * The notes card on an entity page: the history, then somewhere to add to it.
 *
 * Built from the NPC page's card and shared with the location page (T063), so
 * the two read as one product: the same heading, the same "oldest first", the
 * same spoken "Saved" after an add or an edit, the same row rhythm. A page
 * passes its handlers and nothing about layout.
 */
export function EntityNotes<T extends EntityNote>({
  notes: stored,
  canEdit,
  onAdd,
  onEdit,
  onDelete,
  placeholder = 'What happened, and when',
}: EntityNotesProps<T>): React.ReactElement {
  /** Oldest first, so the history reads as one. Said in the heading, not assumed. */
  const notes = useMemo(
    () => [...(stored ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
    [stored]
  );

  // The note appearing is the real confirmation; this is the word that goes
  // with it, for anyone who cannot see the change happen.
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [saved]);
  const markSaved = () => setSaved(true);
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="card rounded-lg overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex items-center gap-3">
        <FieldLabel id={headingId}>Notes</FieldLabel>
        <Typography variant="body-sm" color="muted" className="text-xs">
          {notes.length}
          {notes.length > 1 ? ' · oldest first' : ''}
        </Typography>
        <span role="status" aria-live="polite">
          {saved && (
            <Typography variant="body-sm" color="secondary">
              Saved
            </Typography>
          )}
        </span>
      </div>

      {notes.length > 0 ? (
        <NoteHistory
          notes={notes}
          canEdit={canEdit}
          onEdit={onEdit}
          onDelete={onDelete}
          onSaved={markSaved}
          className="px-6"
          rowClassName="py-3.5"
        />
      ) : (
        <div className="px-6 pb-4">
          <Typography color="muted" className="italic">
            No notes yet
          </Typography>
        </div>
      )}

      {canEdit && (
        <div className="bg-secondary border-t divider px-6 py-4">
          {/* Always on screen rather than behind a button: writing a note is
              why someone opens the page, and a composer you have to summon is
              a composer you forget exists. */}
          <InlineEditor
            label="Add a note"
            helperText="Dated today and credited to you."
            submitLabel="Add note"
            maxLength={TEXT_LIMITS.text}
            placeholder={placeholder}
            rows={2}
            autoFocus={false}
            clearOnSave
            onSubmit={onAdd}
            onSaved={markSaved}
          />
        </div>
      )}
    </section>
  );
}

export default EntityNotes;
