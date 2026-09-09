// src/pages/npcs/InlineEditor.tsx
import React, { useEffect, useRef, useState } from 'react';
import Button from 'core/components/Button';
import Input from 'core/components/Input';
import Typography from 'core/components/Typography';

/** Where a write has got to. Every one of these is said in words. */
export type SaveState = 'idle' | 'saving' | 'slow' | 'failed';

/**
 * How long a write may run before the editor stops implying it is nearly done.
 *
 * Firestore does not reject a write when the connection is gone -- it queues it
 * and the promise simply never settles. Measured against a blocked emulator, a
 * save sat on "Saving..." indefinitely, which is the same "leaves you guessing
 * whether it took" failure as a spinner, only spelled in words.
 */
const SLOW_AFTER_MS = 8000;

export interface InlineEditorProps {
  /** The field's label, above the control (A3). */
  label: string;
  /** Guidance below the control. Replaced by the error, never shown beside it. */
  helperText?: string;
  /** What the control starts with: the current value, or '' for a new entry. */
  initialValue?: string;
  /** The primary action's word. */
  submitLabel: string;
  placeholder?: string;
  rows?: number;
  /**
   * Performs the write. Must reject on failure -- a resolved promise is taken
   * as "the server has it", and nothing here shows success before that.
   */
  onSubmit: (value: string) => Promise<void>;
  /** Called after a write the server accepted. */
  onSaved: () => void;
  /** Called when the user backs out. The typed value is discarded. */
  onCancel: () => void;
}

/**
 * A textarea that edits one value where it sits.
 *
 * Deliberately not a dialog and not a route: `/npcs/edit/:id` is where you go
 * to change everything, and this is where you fix a sentence (D43).
 *
 * The rule it exists to enforce is that **nothing claims success before the
 * write resolves**. There is no optimistic update: the value on screen is the
 * value the server last confirmed, because this is a shared record and two
 * players who disagree about what it says is worse than a moment of latency.
 * A rejected write keeps every character the user typed and says what
 * happened; discarding their sentence to show them an error is the one
 * unforgivable version of this component.
 *
 * All field styling is `Input`'s, which already places the label above, the
 * helper below, and the error *replacing* the helper, on the `field.*` tokens
 * (A3). Phase 8 owns forms; this adds none of its own.
 *
 * Focus is deliberately not restored from here. The control that opened this
 * editor is unmounted while the editor is on screen, so its ref is null at the
 * moment this component would call `focus()` -- the button does not exist again
 * until the parent has re-rendered. The page owns what is mounted, so the page
 * owns the focus return; see `pendingFocus` in `NPCDetailPage`.
 */
export const InlineEditor: React.FC<InlineEditorProps> = ({
  label,
  helperText,
  initialValue = '',
  submitLabel,
  placeholder,
  rows = 4,
  onSubmit,
  onSaved,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const [state, setState] = useState<SaveState>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  // Opening the editor moves the caret into it, so a keyboard user is not left
  // hunting for where the control went.
  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  const saving = state === 'saving' || state === 'slow';
  const trimmed = value.trim();

  // Promote to `slow` rather than to `failed`. The write has not failed -- it
  // may well land the moment the connection returns -- so claiming it did would
  // be the same lie as claiming it succeeded, pointed the other way. "We do not
  // know yet" is the true state, and it is the one the user is told.
  useEffect(() => {
    if (state !== 'saving') {
      return;
    }
    const timer = setTimeout(() => setState('slow'), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const handleSubmit = async () => {
    if (!trimmed || saving) {
      return;
    }
    setState('saving');
    setErrorText(null);
    try {
      await onSubmit(trimmed);
      onSaved();
    } catch (error) {
      // The typed value is untouched on purpose. `state` returns to a form the
      // user can act on rather than staying stuck in "saving".
      setState('failed');
      setErrorText(
        error instanceof Error && error.message
          ? error.message
          : 'Could not save. Your text is still here -- try again.'
      );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        ref={fieldRef as React.Ref<HTMLTextAreaElement>}
        isTextArea
        rows={rows}
        label={label}
        placeholder={placeholder}
        value={value}
        disabled={saving}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
        // The error replaces the helper rather than joining it (A3).
        error={errorText ?? undefined}
        helperText={helperText}
      />

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSubmit} disabled={!trimmed || saving}>
          {saving ? 'Saving...' : submitLabel}
        </Button>
        {/* Enabled again once the save is slow: a user who is stuck must be
            able to leave, and by then the write is Firestore's problem rather
            than something this editor is still waiting on. */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={state === 'saving'}
        >
          Cancel
        </Button>

        {/*
          The exceptional states, in words and announced. The ordinary "saving"
          is already on the button, so repeating it here would say the same
          thing twice; this region carries only what the button cannot -- that
          a save is taking too long, or that it was refused. Never a colour
          alone (design language section 2).
        */}
        <span role="status" aria-live="polite" className="min-h-[1rem]">
          {state === 'slow' && (
            <Typography variant="body-sm" color="secondary">
              Still saving. Your text is safe, and the change will land when the
              connection returns.
            </Typography>
          )}
          {state === 'failed' && (
            <Typography variant="body-sm" color="error">
              Not saved
            </Typography>
          )}
        </span>
      </div>
    </div>
  );
};

export default InlineEditor;
