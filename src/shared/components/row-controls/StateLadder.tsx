// src/shared/components/row-controls/StateLadder.tsx
import React from "react";
import clsx from "clsx";
import Typography from "core/components/Typography";
import { usePendingWrite } from "./usePendingWrite";

export interface StateLadderOption<V extends string> {
  value: V;
  /** What the button says. Always a word -- nothing is encoded by colour alone. */
  label: string;
  /**
   * The theme class the selected button wears, e.g. `disposition-friendly`.
   * Omitted for a neutral step.
   */
  selectedClassName?: string;
}

export interface StateLadderProps<V extends string> {
  /** The micro-label above the buttons, e.g. "Status". */
  label: string;
  options: readonly StateLadderOption<V>[];
  value: V;
  /** Perform the write. Rejecting shows the reason beside the control. */
  onChange: (next: V) => Promise<unknown>;
  /** Names the group for assistive technology, e.g. "Status of Reclaim Erebor". */
  ariaLabel: string;
  className?: string;
}

/**
 * A short ladder of states, changed in one click from the row.
 *
 * Three or four buttons, never a dropdown: these are the fields people
 * currently open a whole form to change -- a quest's status, an NPC's stance, a
 * location's or a rumour's knowledge step. The mocks (`S2`, `S6`, `S8`) show
 * buttons for exactly this reason.
 *
 * Every step is a **word** as well as a colour (design language §2), and the
 * write obeys §7: the button that is lit is the one the *record* holds, not
 * the one just clicked, until the server agrees.
 */
export function StateLadder<V extends string>({
  label,
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: StateLadderProps<V>) {
  const { isPending, error, run } = usePendingWrite();

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <Typography
          variant="body-sm"
          color="muted"
          className="text-[11px] font-semibold uppercase tracking-wider"
          id={`${ariaLabel}-label`}
        >
          {label}
        </Typography>

        <div
          role="group"
          aria-label={ariaLabel}
          className="flex items-center gap-1 flex-wrap"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                // A ladder is a set of states, one of which is current --
                // exactly what `aria-pressed` describes.
                aria-pressed={isSelected}
                disabled={isPending}
                onClick={() => {
                  if (isSelected) return;
                  void run(() => onChange(option.value));
                }}
                className={clsx(
                  "px-3 py-1 rounded-full text-sm chip-toggle",
                  "min-h-[32px] disabled:opacity-60 disabled:cursor-wait",
                  isSelected && "chip-toggle-selected",
                  isSelected && option.selectedClassName
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {isPending && (
          // Never a tick: the record has not changed yet.
          <Typography variant="body-sm" color="secondary" aria-live="polite">
            Saving…
          </Typography>
        )}
      </div>

      {error && (
        <Typography variant="body-sm" color="error" role="alert">
          {error}
        </Typography>
      )}
    </div>
  );
}

export default StateLadder;
