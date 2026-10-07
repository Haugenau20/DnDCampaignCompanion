// src/shared/components/entity-page/EntityFact.tsx
import React, { useId } from 'react';
import Typography from 'core/components/Typography';
import FieldLabel from './FieldLabel';
import FieldPrompt from './FieldPrompt';

export interface EntityFactProps {
  /** What the fact is: "Status", "Type", "Levels". */
  label: string;
  /** The value at rest. Nothing (or an empty string) when it is unrecorded. */
  children?: React.ReactNode;
  /** The editor while it is open, which carries its own label. */
  editor?: React.ReactNode;
  /** Opens the editor. Omitted for whoever may not edit, and for a fact nobody edits. */
  onEdit?: () => void;
  /** Ref for the control that opens the editor, so focus can return to it. */
  triggerRef?: (node: HTMLElement | null) => void;
  /** The question an editor sees in place of an unrecorded value. */
  prompt?: string;
}

const isUnrecorded = (value: React.ReactNode) =>
  value === undefined || value === null || value === false || value === '';

/**
 * One standing fact in an entity card's grid: a label and a value, and -- for
 * whoever may edit -- the value itself is what opens its editor, which takes
 * the cell's place while it is open (T063, after the NPC page).
 *
 * The resting state is exactly a label and a word, grouped under the label.
 * The opener is named "Edit <label>", because a page carrying four of these
 * would otherwise have four buttons a screen reader cannot tell apart.
 */
export const EntityFact: React.FC<EntityFactProps> = ({
  label,
  children,
  editor,
  onEdit,
  triggerRef,
  prompt,
}) => {
  const labelId = useId();

  if (editor) {
    return <div className="flex flex-col gap-1">{editor}</div>;
  }

  let value: React.ReactNode;
  if (!isUnrecorded(children)) {
    value = onEdit ? (
      <button
        type="button"
        ref={triggerRef}
        aria-label={`Edit ${label.toLowerCase()}`}
        onClick={onEdit}
        className="text-left rounded-md px-1 -mx-1 selectable-item"
      >
        {children}
      </button>
    ) : (
      children
    );
  } else if (onEdit && prompt) {
    value = (
      <FieldPrompt ref={triggerRef} onClick={onEdit}>
        {prompt}
      </FieldPrompt>
    );
  } else {
    value = <Typography variant="body-sm">Unrecorded</Typography>;
  }

  // A group named by its label, so the label is read with the value.
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
      <FieldLabel id={labelId}>{label}</FieldLabel>
      {value}
    </div>
  );
};

export default EntityFact;
