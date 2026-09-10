// src/core/components/Chip.tsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Typography from './Typography';
import { X } from 'lucide-react';

/**
 * Two chips, sharing paint.
 *
 * They are deliberately not one component with a `mode` prop. `SelectableChip`
 * toggles and reports a pressed state; `RemovableChip` is a label with a delete
 * affordance and has no state at all. A single component covering both would
 * take a prop that changes its role, its markup and its accessibility contract
 * at once, which is two components wearing a coat.
 *
 * What they share is a surface family — `.chip-toggle` and `.chip-tag` — so a
 * chosen thing looks the same wherever it is chosen. Before this there were nine
 * `selectable-item` ternaries and fourteen hand-rolled `.tag` divs, each
 * deciding for itself.
 *
 * Neither is `.chip`, which is taken: that is `CategoryChips`' *single-select*
 * pill, and it fills the chosen one on purpose. Filling is right when exactly
 * one thing can be chosen and wrong when six can be — see the note in
 * `components.css`.
 */

interface SelectableChipProps {
  /** Whether this chip is currently chosen */
  selected: boolean;
  /** Called when the chip is toggled */
  onToggle: () => void;
  /** The chip's label */
  children: React.ReactNode;
  /** Additional classes — layout only (`w-full`, `text-left`) */
  className?: string;
  /** Whether the chip is inert */
  disabled?: boolean;
}

/**
 * A chip you pick from a list.
 *
 * **Selected is accent-bordered, never accent-filled.** A filled chip spends the
 * page's accent on every selected item at once, so a form with six selections
 * has six accents and no primary action anyone can find. This follows the
 * treatment D51 already settled for the directory filter pills — same
 * background, accent border and accent ink — rather than inventing a second
 * answer to a question the product has answered once.
 *
 * The state is a real `aria-pressed` toggle, so selection lives in the
 * accessibility tree rather than only in a border colour (design language §2:
 * nothing is encoded by colour alone). The border also thickens rather than
 * merely changing hue, so the state survives being seen in greyscale.
 */
export const SelectableChip: React.FC<SelectableChipProps> = ({
  selected,
  onToggle,
  children,
  className,
  disabled = false
}) => (
  <button
    // These chips live inside forms. A <button> with no type submits its form,
    // which would save the record instead of picking a name.
    type="button"
    aria-pressed={selected}
    disabled={disabled}
    onClick={onToggle}
    className={twMerge(
      clsx(
        'p-2 rounded transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'chip-toggle',
        selected && 'chip-toggle-selected',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )
    )}
  >
    <Typography variant="body-sm">{children}</Typography>
  </button>
);

interface RemovableChipProps {
  /** Called when the remove control is used */
  onRemove: () => void;
  /**
   * The accessible name of the remove control.
   *
   * Required, and deliberately not defaulted to "Remove": a screen reader
   * meeting six of these in a row needs to know which one it is on, and
   * "Remove tag merchant" is the difference between a list you can edit and a
   * list of six identical buttons.
   */
  removeLabel: string;
  /** The chip's label */
  children: React.ReactNode;
  /** Additional classes — layout only */
  className?: string;
  /**
   * Whether the remove control is inert.
   *
   * `RumorForm` disabled its remove control while the form was submitting.
   * Without this the relation could be deleted out from under a write already
   * in flight.
   */
  disabled?: boolean;
}

/**
 * A chip standing for something already chosen, with a control to take it off.
 *
 * No pressed state: it is a label with an affordance, not a toggle, and
 * announcing it as pressed or unpressed would describe a state it does not have.
 */
export const RemovableChip: React.FC<RemovableChipProps> = ({
  onRemove,
  removeLabel,
  children,
  className,
  disabled = false
}) => (
  <div
    className={twMerge(
      clsx('flex items-center gap-1 px-3 py-1 rounded-full', 'chip-tag', className)
    )}
  >
    <span>{children}</span>
    <button
      type="button"
      onClick={onRemove}
      aria-label={removeLabel}
      disabled={disabled}
      className={clsx(
        'typography-secondary focus:outline-none focus-visible:ring-2 rounded',
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-75'
      )}
    >
      <X size={14} />
    </button>
  </div>
);

export default SelectableChip;
