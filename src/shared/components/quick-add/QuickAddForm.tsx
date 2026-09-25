// src/shared/components/quick-add/QuickAddForm.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import Button from "core/components/Button";
import Input from "core/components/Input";
import Typography from "core/components/Typography";
import {
  QUICK_ADD_SPECS,
  validateQuickAdd,
  type QuickAddCarry,
  type QuickAddEntity,
  type QuickAddErrors,
} from "./quickAddSpecs";
import { useQuickAddCreate } from "./useQuickAddCreate";
import { useAutoGrow } from "shared/hooks/useAutoGrow";

export interface QuickAddFormProps {
  entity: QuickAddEntity;
  /**
   * Pre-set parent, the phase's only pre-filled case: a location launched from
   * *Add a place inside* (§6.2).
   */
  parentId?: string;
  /** Note conversion's existing handoff, passed through untouched. */
  noteId?: string;
  entityId?: string;
  /** Extracted fields the two-field surface does not show. */
  carry?: QuickAddCarry;
  /** Pre-filled name, from note conversion. */
  initialName?: string;
  /** Pre-filled line, from note conversion. */
  initialLine?: string;
  /** Run just before *Create & open* navigates -- a dialog closes itself here. */
  onCreated?: (id: string) => void;
  /** Cancel. Omitted on a mount with nothing to go back to. */
  onCancel?: () => void;
  cancelLabel?: string;
  /** Take focus on mount. False for the page mount, which has its own order. */
  autoFocus?: boolean;
  /**
   * Whether *Create & open* navigates to the new record.
   *
   * False when quick add was opened from the attach tray's escape hatch: the
   * point there is to add the missing person and carry on filling the form
   * you were already in, not to be taken somewhere else (§5 item 7).
   */
  navigateOnCreate?: boolean;
}

/**
 * The two-field create surface, shared by all three mounts.
 *
 * Name and one line, and nothing else -- `00-entity-authoring.md` §1.2. The
 * twenty optional fields that currently sit beside these two at identical
 * visual weight are added afterwards, on the record itself.
 *
 * Both fields take the serif: they hold the campaign's voice (an entity's name
 * and what it is), while every label, button and count around them is the
 * application talking about itself and takes the sans. Design language §4.
 */
const QuickAddForm: React.FC<QuickAddFormProps> = ({
  entity,
  parentId,
  noteId,
  entityId,
  carry,
  initialName = "",
  initialLine = "",
  onCreated,
  onCancel,
  cancelLabel = "Cancel",
  autoFocus = true,
  navigateOnCreate = true,
}) => {
  const spec = QUICK_ADD_SPECS[entity];
  const navigate = useNavigate();
  const create = useQuickAddCreate();

  const [name, setName] = useState(initialName);
  const [line, setLine] = useState(initialLine);
  const [fieldErrors, setFieldErrors] = useState<QuickAddErrors>({});
  const [writeError, setWriteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** How many records this run of the surface has added. */
  const [addedCount, setAddedCount] = useState(0);

  const nameRef = useRef<HTMLInputElement>(null);
  const lineRef = useRef<HTMLTextAreaElement>(null);

  // Note conversion lands its extracted text here, often a paragraph. Two rows
  // stay the floor so an empty form is no taller than before; the box grows to
  // show what it holds, up to half the screen, then scrolls (T062).
  useAutoGrow(lineRef, line);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  /**
   * Validate, write, and hand back the new id -- or `null` if anything
   * stopped it.
   *
   * Nothing is cleared here. A rejected write keeps every character typed and
   * says what happened next to the surface it happened on, which is the save
   * contract in §7 and applies to creates exactly as it does to edits.
   */
  const submit = useCallback(async (): Promise<string | null> => {
    const errors = validateQuickAdd(entity, { name, line });
    setFieldErrors(errors);
    setWriteError(null);
    if (errors.name || errors.line) return null;

    setIsSubmitting(true);
    try {
      return await create(entity, { name, line, parentId }, { noteId, entityId, carry });
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : `Could not add this ${entity}.`);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [entity, name, line, parentId, noteId, entityId, carry, create]);

  const handleCreateAndOpen = useCallback(async () => {
    const id = await submit();
    if (!id) return;

    onCreated?.(id);
    if (!navigateOnCreate) return;
    // The destination's first unwritten field is named in router state rather
    // than focused here: the prompts belong to `15-4`…`15-6`, which this PR
    // must not implement. Those PRs read `quickAddFocus`.
    navigate(spec.destinationFor(id), { state: { quickAddFocus: spec.focusField } });
  }, [submit, onCreated, navigate, spec, navigateOnCreate]);

  const handleCreateAndAddAnother = useCallback(async () => {
    const id = await submit();
    if (!id) return;

    setName("");
    setLine("");
    setFieldErrors({});
    setAddedCount((count) => count + 1);
    nameRef.current?.focus();
  }, [submit]);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleCreateAndOpen();
      }}
      noValidate
    >
      <Input
        ref={nameRef as React.Ref<HTMLInputElement>}
        label={spec.labels.nameLabel}
        placeholder={spec.labels.namePlaceholder}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={fieldErrors.name}
        aria-invalid={Boolean(fieldErrors.name)}
        className="font-heading"
        fullWidth
      />

      <Input
        ref={lineRef as React.Ref<HTMLTextAreaElement>}
        label={spec.labels.lineLabel}
        placeholder={spec.labels.linePlaceholder}
        value={line}
        onChange={(event) => setLine(event.target.value)}
        error={fieldErrors.line}
        aria-invalid={Boolean(fieldErrors.line)}
        className="font-heading max-h-[50vh]"
        isTextArea
        rows={2}
        fullWidth
      />

      {writeError && (
        <div className="flex items-start gap-2" role="alert">
          <AlertCircle size={16} className="form-error shrink-0 mt-0.5" aria-hidden="true" />
          <Typography color="error" variant="body-sm">
            {writeError}
          </Typography>
        </div>
      )}

      {/*
        Actions stack below the phone breakpoint so both stay reachable above
        the keyboard at 390px, and neither is ever narrower than a thumb.
      */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
        )}

        <div className="sm:ml-auto flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleCreateAndAddAnother()}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Create &amp; add another
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Create &amp; open
          </Button>
        </div>
      </div>

      {addedCount > 0 && (
        // Quiet, and a live region: the surface stays open across a run of
        // additions, so this is the only confirmation that each one landed.
        <Typography variant="body-sm" color="secondary" aria-live="polite">
          {addedCount} {addedCount === 1 ? spec.labels.countNoun.replace(/s$/, "") : spec.labels.countNoun} added
        </Typography>
      )}
    </form>
  );
};

export default QuickAddForm;
