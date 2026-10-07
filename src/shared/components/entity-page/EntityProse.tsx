// src/shared/components/entity-page/EntityProse.tsx
import React from 'react';
import { Pencil } from 'lucide-react';
import Button from 'core/components/Button';
import Typography from 'core/components/Typography';
import FieldLabel from './FieldLabel';
import FieldPrompt from './FieldPrompt';

export interface EntityProseProps {
  /** What the prose is: "Description", "Background". */
  label: string;
  /** The text at rest, drawn by the page in its own voice. Nothing when unwritten. */
  children?: React.ReactNode;
  /** The editor while it is open, which carries its own label and takes the card. */
  editor?: React.ReactNode;
  /** Opens the editor. Omitted for whoever may not edit. */
  onEdit?: () => void;
  /** Ref for the control that opens the editor, so focus can return to it. */
  triggerRef?: (node: HTMLElement | null) => void;
  /** The question an editor sees in place of unwritten prose. */
  prompt: string;
  /** What a reader sees in place of unwritten prose. */
  empty?: string;
  /** Beside the Edit button: the page's spoken "Saved", when it has one. */
  status?: React.ReactNode;
}

const isUnwritten = (value: React.ReactNode) =>
  value === undefined || value === null || value === false || value === '';

/**
 * One card of running prose on an entity page -- a description, a background
 * -- edited the NPC page's way (T063): a label with an Edit button beside it,
 * and the editor in the card's place while it is open. Unwritten, the card
 * asks its question instead (§10).
 *
 * The Edit button is named "Edit <label>": a page carries several, and several
 * buttons called "Edit" are indistinguishable to a screen reader. The name
 * still contains the visible word, which is what WCAG 2.5.3 asks.
 */
export const EntityProse: React.FC<EntityProseProps> = ({
  label,
  children,
  editor,
  onEdit,
  triggerRef,
  prompt,
  empty = 'Nothing written yet',
  status,
}) => {
  const written = !isUnwritten(children);

  return (
    <section className="card rounded-lg p-6 flex flex-col gap-3">
      {editor || (
        <>
          <div className="flex items-center gap-2">
            <FieldLabel>{label}</FieldLabel>
            {onEdit && written && (
              <Button
                ref={triggerRef}
                variant="ghost"
                size="sm"
                aria-label={`Edit ${label.toLowerCase()}`}
                onClick={onEdit}
                startIcon={<Pencil className="w-3.5 h-3.5" />}
              >
                Edit
              </Button>
            )}
            {status}
          </div>
          {written ? (
            children
          ) : onEdit ? (
            <FieldPrompt ref={triggerRef} onClick={onEdit}>
              {prompt}
            </FieldPrompt>
          ) : (
            <Typography color="muted" className="italic">
              {empty}
            </Typography>
          )}
        </>
      )}
    </section>
  );
};

export default EntityProse;
