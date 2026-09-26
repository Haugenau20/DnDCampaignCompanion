// src/shared/components/inline-edit/NoteHistory.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import DeleteConfirmationDialog from 'shared/components/DeleteConfirmationDialog';
import { formatNoteDate } from 'shared/utils/dateFormatter';
import type { EntityNote } from 'shared/utils/entity-notes';
import InlineEditor from './InlineEditor';

export interface NoteHistoryProps<T extends EntityNote> {
  /** In the order they are shown. The page sorts; this only renders. */
  notes: readonly T[];
  /** Whether the viewer may change the record. Hides both actions when false. */
  canEdit: boolean;
  /** Writes the note's new text. Must reject on failure, as `InlineEditor` asks. */
  onEdit: (note: T, text: string) => Promise<void>;
  /** Removes the note. Must reject on failure; the dialog says why. */
  onDelete: (note: T) => Promise<void>;
  /** Called after an edit the server accepted, for the page's "Saved" notice. */
  onSaved?: () => void;
  /** Extra classes for the list, e.g. the card's horizontal padding. */
  className?: string;
  /** Vertical padding of a row, which each page sets to its own rhythm. */
  rowClassName?: string;
}

/**
 * The notes on an NPC or a location: date, text, author, and -- for anyone who
 * can change the record -- a way to fix or remove each one (T006).
 *
 * Notes were append-only until this, by accident rather than decision: the
 * campaign's own notes could be edited, these could not. Any member who can
 * edit the page can edit or delete any note on it, the same as every other
 * field there. A note stores its author as a display name, not an account, so
 * "only your own notes" is not something the record could enforce.
 *
 * Editing keeps the note's date and author and changes only its text. Deleting
 * asks first, because it removes the note for the whole group.
 */
export function NoteHistory<T extends EntityNote>({
  notes,
  canEdit,
  onEdit,
  onDelete,
  onSaved,
  className = '',
  rowClassName = 'py-3',
}: NoteHistoryProps<T>): React.ReactElement {
  const [editing, setEditing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [returnFocus, setReturnFocus] = useState<number | null>(null);
  const editButtons = useRef(new Map<number, HTMLButtonElement>());

  // The Edit button is unmounted while its editor is open, so focus goes back
  // only once it exists again -- the same reason `InlineEditor` leaves focus
  // return to its caller.
  useEffect(() => {
    if (editing === null && returnFocus !== null) {
      editButtons.current.get(returnFocus)?.focus();
      setReturnFocus(null);
    }
  }, [editing, returnFocus]);

  const closeEditor = (index: number) => {
    setEditing(null);
    setReturnFocus(index);
  };

  return (
    <>
      <div className={`flex flex-col divide-y card-divider ${className}`}>
        {notes.map((note, index) => {
          const when = formatNoteDate(note.date);

          if (editing === index) {
            return (
              <div key={`${note.date}-${index}`} className={rowClassName}>
                <InlineEditor
                  label={`Edit the note from ${when}`}
                  initialValue={note.text}
                  submitLabel="Save note"
                  rows={2}
                  onSubmit={(text) => onEdit(note, text)}
                  onSaved={() => {
                    closeEditor(index);
                    onSaved?.();
                  }}
                  onCancel={() => closeEditor(index)}
                />
              </div>
            );
          }

          return (
            <div
              key={`${note.date}-${index}`}
              className={`grid grid-cols-1 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] gap-1 sm:gap-4 ${rowClassName}`}
            >
              <Typography
                variant="body-sm"
                color="muted"
                className="text-xs tabular-nums whitespace-nowrap"
              >
                {when}
              </Typography>
              <Typography variant="body-sm" className="min-w-0">
                {note.text}
              </Typography>
              <div className="flex flex-col gap-1 sm:items-end">
                {/* A note written before the author field existed has none,
                    and stays blank rather than being credited to a guess. */}
                <Typography
                  variant="body-sm"
                  color="muted"
                  className="text-xs sm:text-right whitespace-nowrap"
                >
                  {note.author ?? ''}
                </Typography>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Button
                      ref={(node: HTMLButtonElement | null) => {
                        if (node) editButtons.current.set(index, node);
                        else editButtons.current.delete(index);
                      }}
                      variant="ghost"
                      size="sm"
                      // Every row has one; the date is what tells them apart
                      // to a screen reader.
                      aria-label={`Edit the note from ${when}`}
                      onClick={() => setEditing(index)}
                      startIcon={<Pencil className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete the note from ${when}`}
                      onClick={() => setDeleting(note)}
                      startIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mounted only while a delete is pending: the dialog keeps its
          "deleting" state after a success, so a second delete in the same
          mount would open already spinning. */}
      {deleting && (
        <DeleteConfirmationDialog
          isOpen
          onClose={() => setDeleting(null)}
          onConfirm={() => onDelete(deleting)}
          itemName=""
          itemType="note"
          message={`The note from ${formatNoteDate(deleting.date)} is removed for everyone.`}
        />
      )}
    </>
  );
}

export default NoteHistory;
